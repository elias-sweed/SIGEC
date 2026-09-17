-- ============================================================
-- 20260917110000_mesas_cobro.sql
-- Mesas de cobro para la votación pública.
--
-- Cada cobrador (2-3 alumnos) abre su vista "Mesa de cobro" en
-- una computadora con un CÓDIGO de mesa. Los votantes yapean
-- S/2.00 e ingresan su número de operación; el pago queda
-- "pendiente" y cobra vida cuando la mesa (humano) lo APRUEBA
-- viendo el comprobante del votante.
--
-- Incluye:
--   1. Tabla mesas_cobro
--   2. RLS + políticas (solo admin escribe, mesas se validan por RPC)
--   3. RPC: mesa_obtener (login por código)
--   4. RPC: mesa_listar_pagos (pagos del evento de la mesa)
--   5. RPC: votacion_aprobar_pago_mesa / votacion_rechazar_pago_mesa
--   6. Mejora de mensaje en votacion_emitir cuando el pago está
--      pendiente de aprobación de la mesa.
-- ============================================================

-- ── 1. Tabla mesas_cobro ───────────────────────────────────────────────────
create table if not exists public.mesas_cobro (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  nombre      text not null,
  codigo      text not null,
  habilitada  boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists mesas_cobro_codigo_idx on public.mesas_cobro (codigo);
create index if not exists mesas_cobro_evento_idx on public.mesas_cobro (evento_id);

-- ── 2. RLS ─────────────────────────────────────────────────────────────────
alter table public.mesas_cobro enable row level security;

-- Solo el panel admin (autenticado) administra las mesas.
drop policy if exists mesas_admin_select on public.mesas_cobro;
create policy mesas_admin_select on public.mesas_cobro
  for select to authenticated using (true);

drop policy if exists mesas_admin_insert on public.mesas_cobro;
create policy mesas_admin_insert on public.mesas_cobro
  for insert to authenticated with check (true);

drop policy if exists mesas_admin_update on public.mesas_cobro;
create policy mesas_admin_update on public.mesas_cobro
  for update to authenticated using (true) with check (true);

drop policy if exists mesas_admin_delete on public.mesas_cobro;
create policy mesas_admin_delete on public.mesas_cobro
  for delete to authenticated using (true);

-- ── 3. RPC: login de la mesa por código ────────────────────────────────────
create or replace function public.mesa_obtener(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mesa public.mesas_cobro;
begin
  select * into v_mesa
    from public.mesas_cobro
   where lower(codigo) = lower(trim(p_codigo))
     and habilitada
   limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',        v_mesa.id,
    'nombre',    v_mesa.nombre,
    'evento_id', v_mesa.evento_id,
    'codigo',    v_mesa.codigo
  );
end;
$$;

-- ── 4. RPC: pagos del evento de la mesa ────────────────────────────────────
create or replace function public.mesa_listar_pagos(p_codigo_mesa text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mesa  public.mesas_cobro;
  v_lista jsonb;
begin
  select * into v_mesa
    from public.mesas_cobro
   where lower(codigo) = lower(trim(p_codigo_mesa))
     and habilitada
   limit 1;
  if not found then
    raise exception 'Código de mesa inválido o deshabilitado.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',               p.id,
      'votante_id',       p.votante_id,
      'email',            (select v.email from public.votantes v where v.id = p.votante_id),
      'monto',            p.monto,
      'numero_operacion', p.numero_operacion,
      'estado',           p.estado,
      'verificado_por',   p.verificado_por,
      'created_at',       p.created_at
    ) order by p.created_at desc
  ), '[]'::jsonb) into v_lista
    from public.pagos_yape p
   where p.evento_id = v_mesa.evento_id;

  return v_lista;
end;
$$;

-- ── 5. RPC: aprobar / rechazar pago desde la mesa ─────────────────────────
-- Se valida el código de la mesa (secreto compartido), no requiere login.
create or replace function public.votacion_aprobar_pago_mesa(p_pago_id uuid, p_codigo_mesa text)
returns public.pagos_yape
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago   public.pagos_yape;
  v_mesa   public.mesas_cobro;
  v_config public.config_votacion;
begin
  select * into v_pago from public.pagos_yape where id = p_pago_id;
  if not found then
    raise exception 'El pago no existe.';
  end if;

  select * into v_mesa
    from public.mesas_cobro
   where lower(codigo) = lower(trim(p_codigo_mesa))
     and habilitada
   limit 1;
  if not found then
    raise exception 'Código de mesa inválido o deshabilitado.';
  end if;
  if v_mesa.evento_id is distinct from v_pago.evento_id then
    raise exception 'La mesa no pertenece a este evento.';
  end if;

  select * into v_config from public.config_votacion where evento_id = v_pago.evento_id;

  update public.pagos_yape
     set estado          = 'verificado',
         votos_otorgados = coalesce(v_config.votos_por_pago, 1),
         verificado_por  = 'mesa:' || v_mesa.nombre
   where id = p_pago_id
  returning * into v_pago;

  return v_pago;
end;
$$;

create or replace function public.votacion_rechazar_pago_mesa(p_pago_id uuid, p_codigo_mesa text)
returns public.pagos_yape
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago public.pagos_yape;
  v_mesa public.mesas_cobro;
begin
  select * into v_pago from public.pagos_yape where id = p_pago_id;
  if not found then
    raise exception 'El pago no existe.';
  end if;

  select * into v_mesa
    from public.mesas_cobro
   where lower(codigo) = lower(trim(p_codigo_mesa))
     and habilitada
   limit 1;
  if not found then
    raise exception 'Código de mesa inválido o deshabilitado.';
  end if;
  if v_mesa.evento_id is distinct from v_pago.evento_id then
    raise exception 'La mesa no pertenece a este evento.';
  end if;

  update public.pagos_yape
     set estado          = 'rechazado',
         votos_otorgados = 0,
         verificado_por  = 'mesa:' || v_mesa.nombre
   where id = p_pago_id
  returning * into v_pago;

  return v_pago;
end;
$$;

-- ── 6. Mensaje mejorado en votacion_emitir (pago pendiente de mesa) ───────
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
      raise exception 'Ya usaste tu voto gratis. Acércate a una mesa de cobro para registrar tu voto pagado.';
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
        raise exception 'Tu pago quedó registrado y está pendiente de aprobación. Acércate a la mesa de cobro para confirmarlo y luego toca Votar.';
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

-- ── 7. Permisos de ejecución ───────────────────────────────────────────────
grant execute on function public.mesa_obtener(text) to anon, authenticated;
grant execute on function public.mesa_listar_pagos(text) to anon, authenticated;
grant execute on function public.votacion_aprobar_pago_mesa(uuid, text) to anon, authenticated;
grant execute on function public.votacion_rechazar_pago_mesa(uuid, text) to anon, authenticated;
grant execute on function public.votacion_emitir(uuid, uuid, text, text, text, text, text, text) to anon, authenticated;

-- ── 8. votacion_estado: expone si el votante tiene un pago pendiente ───────
-- (la mesa aún no lo confirma; el votante espera el OK para tocar "Votar").
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
  v_pago_pendiente    boolean := false;
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
      'bloqueado',        false,
      'pagoPendiente',    false
    );
  end if;

  select coalesce(sum(votos_otorgados), 0) into v_otorgados
    from public.pagos_yape
   where votante_id = v_votante.id and estado = 'verificado';

  select count(*) into v_votos
    from public.votos_publico
   where votante_id = v_votante.id;

  select exists(
    select 1 from public.pagos_yape
     where votante_id = v_votante.id and estado = 'pendiente'
  ) into v_pago_pendiente;

  v_gratis_restantes  := greatest(0, coalesce(v_config.voto_gratis_por_dispositivo, 1) - v_votante.votos_gratis_usados);
  v_pagos_disponibles := greatest(0, v_otorgados - v_votante.votos_pagados);

  return jsonb_build_object(
    'votante',          to_jsonb(v_votante),
    'registrado',       true,
    'votosEmitidos',    v_votos,
    'gratisRestantes',  v_gratis_restantes,
    'pagosDisponibles', v_pagos_disponibles,
    'bloqueado',        v_gratis_restantes <= 0 and v_pagos_disponibles <= 0,
    'pagoPendiente',    v_pago_pendiente
  );
end;
$$;

grant execute on function public.votacion_estado(uuid, text, text) to anon, authenticated;