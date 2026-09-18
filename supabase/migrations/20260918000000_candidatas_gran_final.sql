-- 20260918000000_candidatas_gran_final.sql
-- CARGAR A LAS 16 CANDIDATAS DE LA GRAN FINAL
-- Pegar en Supabase → SQL Editor → Run.
--
-- Asigna evento_id automáticamente al evento "Segunda Etapa / Gran Final":
--   · Si encuentra el evento por nombre → las candidatas viven SOLO en la Gran Final.
--   · Si no lo encuentra → quedan sin evento (evento_id null) y la app las muestra
--     en cualquier etapa (comportamiento legacy), para no perder el registro.
-- Los nombres se insertan solo si no existe una candidata idéntica (nombre, grado, sección).

do $$
declare
  v_evento uuid;
begin
  select id into v_evento
  from public.eventos
  where nombre ilike '%SEGUNDA%'
     or nombre ilike '%GRAN FINAL%'
  order by created_at desc, nombre desc
  limit 1;

  if v_evento is null then
    raise notice 'No se encontró el evento de la Gran Final; las candidatas se insertarán sin evento (visibles en todas las etapas).';
  end if;

  insert into public.candidatas (nombre, grado, seccion, evento_id)
  select v.nombre, v.grado, v.seccion, v_evento
  from (values
    ('Anayka Abigail Gaspar Córdova',          '1', 'G'),
    ('Allison Andrea Lozano Gonzales',         '3', 'D'),
    ('Itzel Brigitte Rodriguez Rengifo',       '4', 'D'),
    ('Allison Christina Reyna Salas',          '1', 'D'),
    ('Nahomi Shantal Garcia Marcos',           '3', 'I'),
    ('Brianna Harve Plasencia Viena',          '3', 'H'),
    ('Briannys Andreina Márquez Flores',       '4', 'A'),
    ('Grecia Cristina Pérez Lazo',             '5', 'F'),
    ('Sayuri Pinedo Navarro',                  '1', 'I'),
    ('Viviana Nicol Mozombite Salas',          '3', 'C'),
    ('Rouss Mikelyn Collantes Flores',         '2', 'B'),
    ('Eliana Noemi Astuvilca Cerquin',         '2', 'E'),
    ('Mishel Reategui Vela',                   '5', 'D'),
    ('Analia Guevara Ordinola',                '5', 'A'),
    ('Valery Luciana Alvan Ramírez',           '4', 'I'),
    ('Mia Nicoll Zuta Julca',                  '2', 'I')
  ) as v(nombre, grado, seccion)
  where not exists (
    select 1 from public.candidatas c
    where c.nombre = v.nombre and c.grado = v.grado and c.seccion = v.seccion
  );

  raise notice 'Candidatas insertadas. id del evento asignado: %', v_evento;
end $$;