-- Fase 08: Activación de cuentas de jurados vía QR.

-- en_sesion se reafirma por si la migración anterior (20260826100000) no se aplicó.
alter table public.jurados add column if not exists en_sesion boolean not null default false;

-- Control de primer acceso: el jurado activa su cuenta una sola vez.
alter table public.jurados add column if not exists activado boolean not null default false;

-- Correo interno usado para crear la cuenta en Supabase Auth (jur-001@sigec.com).
alter table public.jurados add column if not exists email_interno text;

-- Id del usuario creado en Supabase Auth (auth.users).
alter table public.jurados add column if not exists auth_uid uuid;