-- ============================================================
-- 20260917100000_votacion_segura.sql
-- Blindaje server-side de la VOTACIÓN PÚBLICA POR QR.
--
-- Qué hace:
--   1. Activa RLS en las 4 tablas de votación.
--   2. Deja SOLO lectura pública de config_votacion.
--   3. Mueve toda la lógica de voto/pago a funciones RPC
--      (security definer) que se ejecutan en el servidor:
--        · votacion_estado(...)          → estado del votante
--        · votacion_emitir(...)          → emite voto gratis o pago
--        · votacion_aprobar_pago(...)    → admin aprueba un pago
--        · votacion_rechazar_pago(...)   → admin rechaza un pago
--   4. Fija el monto del voto pago en S/ 2.00 (configurable).
--   5. Impide reutilizar el mismo número de operación Yape.
--
-- Pegar en Supabase → SQL Editor → Run (idempotente).
-- ============================================================

-- ── 1. Columnas de configuración ───────────────────────────────────────────
alter table public.config_votacion
  add column if not exists auto_verificar_pagos boolean not null default true;

alter table public.config_votacion
  alter column monto_por_pago set default 2.00;

-- Ajusta configuraciones viejas que quedaron en el monto anterior por defecto.
update public.config_votacion
   set monto_por_pago = 2.00
 where monto_por_pago = 3.00;

-- ── 2. Un número de operación Yape solo se usa UNA vez por evento ──────────
create unique index if not exists pagos_yape_operacion_unique_idx
  on public.pagos_yape (evento_id, numero_operacion)
  where numero_operacion is not null and numero_operacion <> '';

-- ── 3. Activar RLS ─────────────────────────────────────────────────────────
alter table public.votantes        enable row level security;
alter table public.votos_publico   enable row level security;
alter table public.pagos_yape      enable row level security;
alter table public.config_votacion enable row level security;

-- ── 4. Políticas ───────────────────────────────────────────────────────────
-- config_votacion: lectura pública (la web muestra si está habilitada).
drop policy if exists config_votacion_select_publico on public.config_votacion;
create policy config_votacion_select_publico on public.config_votacion
  for select to anon, authenticated using (true);

-- config_votacion: el panel admin puede actualizarla (toggle auto-verificar).
drop policy if exists config_votacion_update_admin on public.config_votacion;
create policy config_votacion_update_admin on public.config_votacion
  for update to authenticated using (true) with check (true);

-- config_votacion: el panel admin puede crearla si el evento aún no la tiene.
drop policy if exists config_votacion_insert_admin on public.config_votacion;
create policy config_votacion_insert_admin on public.config_votacion
  for insert to authenticated with check (true);

-- Las demás tablas: solo lectura para el panel admin (usuario logueado).
-- NO hay política de INSERT/UPDATE/DELETE → el público (anon) no puede
-- escribir directamente. Solo escriben las funciones RPC de abajo.
drop policy if exists votantes_admin_lectura on public.votantes;
create policy votantes_admin_lectura on public.votantes
  for select to authenticated using (true);

drop policy if exists votos_publico_admin_lectura on public.votos_publico;
create policy votos_publico_admin_lectura on public.votos_publico
  for select to authenticated using (true);

drop policy if exists pagos_yape_admin_lectura on public.pagos_yape;
create policy pagos_yape_admin_lectura on public.pagos_yape
  for select to authenticated using (true);

-- ── 5. Función: estado del votante de ESTE dispositivo ─────────────────────
create or replace function public.votacion_estado(
  p_evento_id uuid,
  p_huella    text,
  p_token     text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config            public.config_votacion;
  v_votante           public.votantes;
  v_otorgados         integer := 0;
  v_votos             integer := 0;
  v_gratis_restantes  integer;
  v_pagos_disponibles integer;
begin
  select * into v_config from public.config_votacion where evento_id = p_evento_id;
  if not found then
    v_config.voto_gratis_por_dispositivo := 1;
  end if;

  select * into v_votante
    from public.votantes
   where evento_id = p_evento_id
     and (huella = p_huella or token = p_token)
   limit 1;

  if v_votante.id is null then
    return jsonb_build_object(
      'registrado',       false,
      'votosEmitidos',    0,
      'gratisRestantes',  coalesce(v_config.voto_gratis_por_dispositivo, 1),
      'pagosDisponibles', 0,
      'bloqueado',        false
    );
  end if;

  select coalesce(sum(votos_otorgados), 0) into v_otorgados
    from public.pagos_yape
   where votante_id = v_votante.id and estado = 'verificado';

  select count(*) into v_votos
    from public.votos_publico
   where votante_id = v_votante.id;

  v_gratis_restantes  := greatest(0, coalesce(v_config.voto_gratis_por_dispositivo, 1) - v_votante.votos_gratis_usados);
  v_pagos_disponibles := greatest(0, v_otorgados - v_votante.votos_pagados);

  return jsonb_build_object(
    'votante',          to_jsonb(v_votante),
    'registrado',       true,
    'votosEmitidos',    v_votos,
    'gratisRestantes',  v_gratis_restantes,
    'pagosDisponibles', v_pagos_disponibles,
    'bloqueado',        v_gratis_restantes <= 0 and v_pagos_disponibles <= 0
  );
end;
$$;

-- ── 6. Función: emitir voto (gratis o pago) de forma atómica ───────────────
create or replace function public.votacion_emitir(
  p_evento_id         uuid,
  p_candidata_id      uuid,
  p_huella            text,
  p_token             text,
  p_tipo              text,
  p_email             text default null,
  p_numero_operacion  text default null,
  p_ip                text default 'ip:desconocida'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config      public.config_votacion;
  v_votante     public.votantes;
  v_voto        public.votos_publico;
  v_otorgados   integer := 0;
  v_email       text;
  v_operacion   text;
  v_pendiente   boolean := false;
  v_gratis_rest integer;
  v_pagos_disp  integer;
begin
  -- 1. Configuración y habilitación
  select * into v_config from public.config_votacion where evento_id = p_evento_id;
  if not found or not v_config.habilitada then
    raise exception 'La votación pública está desactivada en este momento.';
  end if;

  if p_tipo not in ('gratis', 'pago') then
    raise exception 'Tipo de voto inválido.';
  end if;

  -- 2. Votante del dispositivo (por huella o token)
  select * into v_votante
    from public.votantes
   where evento_id = p_evento_id
     and (huella = p_huella or token = p_token)
   limit 1;

  if p_tipo = 'gratis' then
    -- 2a. Registrar votante en el primer voto gratis
    if v_votante.id is null then
      v_email := lower(trim(coalesce(p_email, '')));
      if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
        raise exception 'Ingresa un correo válido para registrar tu voto.';
      end if;

      insert into public.votantes (evento_id, email, huella, ip, token)
      values (p_evento_id, v_email, p_huella, left(coalesce(p_ip, 'ip:desconocida'), 60), p_token)
      returning * into v_votante;
    end if;

    -- 2b. Límite de votos gratis
    if v_votante.votos_gratis_usados >= v_config.voto_gratis_por_dispositivo then
      raise exception 'Ya usaste tu voto gratis. Registra tu pago Yape para seguir participando.';
    end if;

    insert into public.votos_publico (evento_id, candidata_id, votante_id, tipo)
    values (p_evento_id, p_candidata_id, v_votante.id, 'gratis')
    returning * into v_voto;

    update public.votantes
       set votos_gratis_usados = votos_gratis_usados + 1
     where id = v_votante.id;

  else
    -- 2c. Voto pagado: requiere votante ya registrado
    if v_votante.id is null then
      raise exception 'Regístrate con tu correo para poder votar.';
    end if;

    -- 2d. Registrar el pago Yape si viene el número de operación
    v_operacion := nullif(trim(coalesce(p_numero_operacion, '')), '');
    if v_operacion is not null then
      if v_operacion !~ '^[0-9]{5,12}$' then
        raise exception 'El número de operación Yape debe tener entre 5 y 12 dígitos.';
      end if;
      if exists (
        select 1 from public.pagos_yape
         where evento_id = p_evento_id and numero_operacion = v_operacion
      ) then
        raise exception 'Ese número de operación ya fue utilizado. Revisa tu comprobante Yape.';
      end if;

      insert into public.pagos_yape (
        votante_id, evento_id, monto, numero_operacion, estado, votos_otorgados
      ) values (
        v_votante.id,
        p_evento_id,
        v_config.monto_por_pago,
        v_operacion,
        case when v_config.auto_verificar_pagos then 'verificado' else 'pendiente' end,
        case when v_config.auto_verificar_pagos then v_config.votos_por_pago else 0 end
      );

      v_pendiente := not v_config.auto_verificar_pagos;
    end if;

    -- 2e. ¿Tiene votos pagados verificados disponibles?
    select coalesce(sum(votos_otorgados), 0) into v_otorgados
      from public.pagos_yape
     where votante_id = v_votante.id and estado = 'verificado';

    if v_votante.votos_pagados >= v_otorgados then
      if v_pendiente then
        raise exception 'Tu pago quedó registrado y está pendiente de verificación. Podrás votar cuando el organizador lo apruebe.';
      end if;
      raise exception 'No tienes votos pagados disponibles. Realiza tu pago Yape para continuar.';
    end if;

    insert into public.votos_publico (evento_id, candidata_id, votante_id, tipo)
    values (p_evento_id, p_candidata_id, v_votante.id, 'pago')
    returning * into v_voto;

    update public.votantes
       set votos_pagados = votos_pagados + 1
     where id = v_votante.id;
  end if;

  -- 3. Recalcular estado final
  select * into v_votante from public.votantes where id = v_votante.id;

  select coalesce(sum(votos_otorgados), 0) into v_otorgados
    from public.pagos_yape
   where votante_id = v_votante.id and estado = 'verificado';

  v_gratis_rest := greatest(0, v_config.voto_gratis_por_dispositivo - v_votante.votos_gratis_usados);
  v_pagos_disp  := greatest(0, v_otorgados - v_votante.votos_pagados);

  return jsonb_build_object(
    'voto',             to_jsonb(v_voto),
    'gratisRestantes',  v_gratis_rest,
    'pagosDisponibles', v_pagos_disp,
    'bloqueado',        v_gratis_rest <= 0 and v_pagos_disp <= 0
  );
end;
$$;

-- ── 7. Funciones de administración de pagos ────────────────────────────────
create or replace function public.votacion_aprobar_pago(p_pago_id uuid)
returns public.pagos_yape
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago   public.pagos_yape;
  v_config public.config_votacion;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select * into v_pago from public.pagos_yape where id = p_pago_id;
  if not found then
    raise exception 'El pago no existe.';
  end if;

  select * into v_config from public.config_votacion where evento_id = v_pago.evento_id;

  update public.pagos_yape
     set estado          = 'verificado',
         votos_otorgados = coalesce(v_config.votos_por_pago, 1),
         verificado_por  = coalesce(auth.jwt() ->> 'email', 'admin')
   where id = p_pago_id
  returning * into v_pago;

  return v_pago;
end;
$$;

create or replace function public.votacion_rechazar_pago(p_pago_id uuid)
returns public.pagos_yape
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago public.pagos_yape;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  update public.pagos_yape
     set estado          = 'rechazado',
         votos_otorgados = 0,
         verificado_por  = coalesce(auth.jwt() ->> 'email', 'admin')
   where id = p_pago_id
  returning * into v_pago;

  if not found then
    raise exception 'El pago no existe.';
  end if;

  return v_pago;
end;
$$;

-- ── 8. Permisos de ejecución ───────────────────────────────────────────────
grant execute on function public.votacion_estado(uuid, text, text) to anon, authenticated;
grant execute on function public.votacion_emitir(uuid, uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.votacion_aprobar_pago(uuid) to authenticated;
grant execute on function public.votacion_rechazar_pago(uuid) to authenticated;
