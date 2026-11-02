alter table public.abonados add column if not exists telefono text;

notify pgrst, 'reload schema';
