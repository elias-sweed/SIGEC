-- SIGEC · Fase 07: seguimiento de sesión de jurados
-- Columna para saber qué jurados tienen sesión activa (se actualiza al
-- entrar desde el login y al pulsar Salir). Es informativo: se refresca
-- cuando el Panel Maestro recarga la página.

alter table public.jurados add column if not exists en_sesion boolean not null default false;