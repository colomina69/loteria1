-- Tipo de abonado: mensual (todos los sorteos) o solo extraordinarios (Navidad, Niño y extraordinarios).

alter table public.abonados add column if not exists modalidad text;

update public.abonados set modalidad = 'mensual' where modalidad is null;

alter table public.abonados alter column modalidad set default 'mensual';
alter table public.abonados alter column modalidad set not null;

alter table public.abonados drop constraint if exists abonados_modalidad_check;
alter table public.abonados add constraint abonados_modalidad_check
  check (modalidad in ('mensual', 'extraordinario'));

notify pgrst, 'reload schema';
