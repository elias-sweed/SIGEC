-- =============================================
-- SIGEC — Políticas RLS para desarrollo
-- Pegar en: Supabase → SQL Editor → Run
-- =============================================
-- Esto permite al rol "anon" (la API key del frontend) hacer
-- INSERT, SELECT, UPDATE y DELETE en todas las tablas.
-- RLS sigue activado pero con reglas permisivas para desarrollo.

create policy "anon_all" on public.eventos             for all using (true) with check (true);
create policy "anon_all" on public.candidatas          for all using (true) with check (true);
create policy "anon_all" on public.jurados             for all using (true) with check (true);
create policy "anon_all" on public.criterios           for all using (true) with check (true);
create policy "anon_all" on public.evaluaciones        for all using (true) with check (true);
create policy "anon_all" on public.evaluacion_detalles for all using (true) with check (true);
create policy "anon_all" on public.estado_evento       for all using (true) with check (true);