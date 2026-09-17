-- ============================================================
-- 20260917130000_mesa_detalle.sql
-- Mejoras a la vista /mesa para el día del evento:
--   1. pagos_yape.mesa_verifico_id : quién aprobó cada pago
--      (para que cada cobrador vea SOLO lo que recaudó SU mesa).
--   2. Las RPC de aprobar/rechazar desde la mesa registran esa columna.
--   3. mesa_listar_pagos la incluye en el resultado.
-- Pegar en Supabase → SQL Editor → Run (idempotente).
-- ============================================================

alter table public.pagos_yape
  add column if not exists mesa_verifico_id uuid;

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
         verificado_por  = 'mesa:' || v_mesa.nombre,
         mesa_verifico_id = v_mesa.id
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
         verificado_por  = 'mesa:' || v_mesa.nombre,
         mesa_verifico_id = v_mesa.id
   where id = p_pago_id
  returning * into v_pago;

  return v_pago;
end;
$$;

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
      'mesa_verifico_id', p.mesa_verifico_id,
      'created_at',       p.created_at
    ) order by p.created_at desc
  ), '[]'::jsonb) into v_lista
    from public.pagos_yape p
   where p.evento_id = v_mesa.evento_id;

  return v_lista;
end;
$$;

grant execute on function public.votacion_aprobar_pago_mesa(uuid, text) to anon, authenticated;
grant execute on function public.votacion_rechazar_pago_mesa(uuid, text) to anon, authenticated;
grant execute on function public.mesa_listar_pagos(text) to anon, authenticated;