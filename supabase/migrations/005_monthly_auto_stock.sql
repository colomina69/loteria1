-- En sorteos mensuales el stock se amplía automáticamente al cobrar nuevos décimos.

create or replace function public.registrar_cobro(
  p_abonado_id uuid,
  p_sorteo_id uuid,
  p_cantidad integer,
  p_metodo_pago text default 'efectivo',
  p_nombre_cambio text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_iniciales integer;
  v_extra integer;
  v_vendidos integer;
  v_propios integer;
  v_entregados integer;
  v_disponibles integer;
  v_activos integer;
  v_nombre_cambio text;
  v_sorteo_nombre text;
begin
  if p_cantidad is null or p_cantidad < 0 then
    raise exception 'La cantidad de décimos no puede ser negativa';
  end if;

  if p_cantidad > 0
     and p_metodo_pago = 'cambio'
     and (p_nombre_cambio is null or btrim(p_nombre_cambio) = '') then
    raise exception 'Indica el nombre del décimo o persona del cambio';
  end if;

  v_nombre_cambio := case
    when p_metodo_pago = 'cambio' then nullif(btrim(p_nombre_cambio), '')
    else null
  end;

  select nombre, decimos_iniciales, decimos_extra
    into v_sorteo_nombre, v_iniciales, v_extra
  from public.sorteos
  where id = p_sorteo_id
  for update;

  if not found then
    raise exception 'Sorteo no encontrado';
  end if;

  select
    count(*) filter (where estado in ('paid', 'delivered')),
    count(*) filter (where estado in ('paid', 'delivered') and abonado_id = p_abonado_id),
    count(*) filter (where estado = 'delivered' and abonado_id = p_abonado_id)
  into v_vendidos, v_propios, v_entregados
  from public.pagos
  where sorteo_id = p_sorteo_id;

  if p_cantidad < v_entregados then
    raise exception 'No se puede reducir por debajo de los % décimos entregados', v_entregados;
  end if;

  v_disponibles := v_iniciales + v_extra - (v_vendidos - v_propios);

  if p_cantidad > v_disponibles then
    if v_sorteo_nombre !~* '(navidad|navide|ni[nñ]o|extraordinari)' then
      update public.sorteos
      set decimos_extra = decimos_extra + (p_cantidad - v_disponibles)
      where id = p_sorteo_id;

      v_extra := v_extra + (p_cantidad - v_disponibles);
      v_disponibles := p_cantidad;
    else
      raise exception 'Stock insuficiente: quedan % décimos disponibles', v_disponibles;
    end if;
  end if;

  -- Desactivar los décimos activos sobrantes. Se conservan primero los entregados.
  update public.pagos
  set estado = 'pending',
      fecha_pago = null,
      nombre_cambio = null
  where id in (
    select id
    from public.pagos
    where abonado_id = p_abonado_id
      and sorteo_id = p_sorteo_id
      and estado in ('paid', 'delivered')
    order by (estado = 'delivered') desc, created_at asc
    offset p_cantidad
  );

  -- Reactivar filas pendientes si hacen falta.
  select count(*) into v_activos
  from public.pagos
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and estado in ('paid', 'delivered');

  update public.pagos
  set estado = 'paid',
      fecha_pago = coalesce(fecha_pago, now()),
      metodo_pago = p_metodo_pago,
      nombre_cambio = v_nombre_cambio
  where id in (
    select id
    from public.pagos
    where abonado_id = p_abonado_id
      and sorteo_id = p_sorteo_id
      and estado = 'pending'
    order by created_at asc
    limit greatest(0, p_cantidad - v_activos)
  );

  -- Insertar los décimos que falten.
  select count(*) into v_activos
  from public.pagos
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and estado in ('paid', 'delivered');

  insert into public.pagos (
    abonado_id,
    sorteo_id,
    estado,
    fecha_pago,
    metodo_pago,
    nombre_cambio
  )
  select
    p_abonado_id,
    p_sorteo_id,
    'paid',
    now(),
    p_metodo_pago,
    v_nombre_cambio
  from generate_series(1, greatest(0, p_cantidad - v_activos));

  -- Unificar método, fecha y nombre en los activos.
  update public.pagos
  set metodo_pago = p_metodo_pago,
      fecha_pago = coalesce(fecha_pago, now()),
      nombre_cambio = v_nombre_cambio
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and estado in ('paid', 'delivered');

  select v_iniciales + v_extra - count(*) filter (where p.estado in ('paid', 'delivered'))
    into v_disponibles
  from public.sorteos s
  left join public.pagos p on p.sorteo_id = s.id
  where s.id = p_sorteo_id
  group by s.decimos_iniciales, s.decimos_extra;

  return jsonb_build_object(
    'cantidad', p_cantidad,
    'disponibles', coalesce(v_disponibles, 0)
  );
end;
$$;

grant execute on function public.registrar_cobro(uuid, uuid, integer, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
