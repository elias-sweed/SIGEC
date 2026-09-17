-- 20260917040000_votacion_pagos_estricto.sql
-- Endurece la votación pública:
--  1) El voto extra (2º en adelante) cuesta EXACTAMENTE S/ 2.00 por voto.
--  2) Bloqueo por IP: solo 1 voto gratis por (evento + IP pública).
--     Se omite la IP desconocida para no bloquear a todos si falla el servicio IP.
-- Pegar en Supabase → SQL Editor → Run.

-- 1) Monto por pago: S/ 2.00 y un voto por pago (2º voto).
alter table public.config_votacion
  alter column monto_por_pago set default 2.00,
  alter column votos_por_pago set default 1;

-- Si quedaban configuraciones con el monto anterior (S/ 3.00), pasan a S/ 2.00.
-- Comentario: si ya configuraste otro monto a propósito, edita esta línea.
update public.config_votacion set monto_por_pago = 2.00, votos_por_pago = 1;

-- 2) Un registro (votante) por (evento, IP). El mismo WiFi/red solo deja votar
-- gratis una vez; el segundo voto (otro celular en la misma red o link copiado)
-- queda bloqueado y se desbloquea pagando exactamente S/ 2.00.
-- OJO: si ya hay votantes duplicados con la misma IP, este índice fallará.
-- Ejecuta antes (solo borra el módulo de votación, no el resto):
--   delete from public.votos_publico; delete from public.pagos_yape;
--   delete from public.votantes;
create unique index if not exists votantes_evento_ip_idx
  on public.votantes (evento_id, ip)
  where ip <> 'ip:desconocida' and ip is not null;