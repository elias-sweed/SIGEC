-- 20260901100000_jurados_token_acceso.sql
-- Agrega una columna token_acceso a jurados: un token largo y aleatorio usado
-- en la URL del QR para que no se revele el código del jurado.

alter table public.jurados
  add column if not exists token_acceso text;

-- Rellena los jurados existentes con un token aleatorio (32 caracteres).
-- La generación aleatoria se hace en la app para filas nuevas; este paso
-- solo cubre datos previos a esta migración.
do $$
declare
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  r record;
  t text := '';
  i int;
begin
  for r in
    select id from public.jurados
    where token_acceso is null or token_acceso = ''
  loop
    t := '';
    for i in 1..32 loop
      t := t || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    update public.jurados
      set token_acceso = t
      where id = r.id;
  end loop;
end $$;