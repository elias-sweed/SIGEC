-- 20260917030000: Configuración de Yape para la votación pública.
-- Añade número y QR de Yape usados en el modal de desbloqueo de votos.
alter table public.config_votacion
  add column if not exists yape_numero text default '',
  add column if not exists yape_qr_url text default '';