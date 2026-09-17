-- ============================================================
-- 20260917120000_yape_qr_autogenerado.sql
-- El QR de Yape ya NO se sube como imagen (yape_qr_url). Ahora el
-- admin solo escribe su NÚMERO Yape (+ titular y banco) y la web
-- genera el QR EMVCo automáticamente.
--   1. Añade yape_titular (nombre del dueño de la cuenta).
--   2. Añade yape_banco (institución, por defecto BCP).
--   3. Elimina yape_qr_url (ya no se usa; reemplazado por /utils/yape.ts).
-- Pegar en Supabase → SQL Editor → Run (idempotente).
-- ============================================================

alter table public.config_votacion
  add column if not exists yape_titular text;

alter table public.config_votacion
  add column if not exists yape_banco text default 'BCP';

alter table public.config_votacion
  drop column if exists yape_qr_url;