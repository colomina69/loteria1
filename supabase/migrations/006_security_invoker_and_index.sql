-- Ejecutar las RPC con los permisos del llamador en lugar de SECURITY DEFINER.
alter function public.registrar_cobro(uuid, uuid, integer, text, text) security invoker;
alter function public.registrar_cambio_suelto(uuid, text) security invoker;
alter function public.ampliar_stock(uuid, integer) security invoker;

-- Índice para el FK de pagos.abonado_id.
create index if not exists pagos_abonado_id_idx on public.pagos (abonado_id);

notify pgrst, 'reload schema';
