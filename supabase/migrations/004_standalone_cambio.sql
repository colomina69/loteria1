-- Permite registrar un décimo cambiado por otro de otra entidad sin asignarlo a un abonado.

alter table public.pagos alter column abonado_id drop not null;

alter table public.pagos drop constraint if exists pagos_cambio_sin_abonado_check;
alter table public.pagos add constraint pagos_cambio_sin_abonado_check
  check (
    abonado_id is not null
    or (metodo_pago = 'cambio' and nombre_cambio is not null)
  );

create or replace function public.registrar_cambio_suelto(
  p_sorteo_id uuid,
  p_nombre text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := nullif(btrim(p_nombre), '');
  v_sorteo_nombre text;
  v_iniciales integer;
  v_extra integer;
  v_vendidos integer;
  v_disponibles integer;
begin
  if v_nombre is null then
    raise exception 'Indica el nombre del décimo o entidad del cambio';
  end if;

  select nombre, decimos_iniciales, decimos_extra
    into v_sorteo_nombre, v_iniciales, v_extra
  from public.sorteos
  where id = p_sorteo_id
  for update;

  if not found then
    raise exception 'Sorteo no encontrado';
  end if;

  if v_sorteo_nombre !~* '(navidad|navide|ni[nñ]o|extraordinari)' then
    raise exception 'Los cambios de décimos solo se permiten en sorteos extraordinarios';
  end if;

  select count(*) into v_vendidos
  from public.pagos
  where sorteo_id = p_sorteo_id
    and estado in ('paid', 'delivered');

  v_disponibles := v_iniciales + v_extra - v_vendidos;

  if v_disponibles < 1 then
    raise exception 'Stock insuficiente: no quedan décimos disponibles';
  end if;

  insert into public.pagos (
    abonado_id,
    sorteo_id,
    estado,
    fecha_pago,
    metodo_pago,
    nombre_cambio
  ) values (
    null,
    p_sorteo_id,
    'paid',
    now(),
    'cambio',
    v_nombre
  );

  return jsonb_build_object(
    'cantidad', 1,
    'disponibles', v_disponibles - 1
  );
end;
$$;

grant execute on function public.registrar_cambio_suelto(uuid, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
