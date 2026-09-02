-- Registro de acciones del operador (auditoría)
create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  accion text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

create index if not exists auditoria_created_at_idx on public.auditoria (created_at desc);

alter table public.auditoria disable row level security;