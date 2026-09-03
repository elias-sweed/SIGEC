-- 20260903100000_uniques_integridad.sql
-- QW-03: índice único en jurados.token_acceso (garantiza que un QR no se duplique
--        ni abra la cuenta de otro jurado).
-- QW-07: garantiza que solo exista UN registro de estado por evento
--        (estado_evento.evento_id único), evitando estados ambiguos en vivo.

-- ── QW-03 ──────────────────────────────────────────────────────────────
create unique index if not exists jurados_token_acceso_idx
  on public.jurados (token_acceso);

-- ── QW-07 ──────────────────────────────────────────────────────────────
-- La tabla se creó con evento_id único; este bloque la asegura de forma
-- idempotente por si la tabla se hubiera creado sin el constraint.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.estado_evento'::regclass
      and contype = 'u'
      and conname like '%evento%'
  ) then
    alter table public.estado_evento
      add constraint estado_evento_evento_id_key unique (evento_id);
  end if;
end $$;
