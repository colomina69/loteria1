-- Separa el cobro del décimo de su entrega física.
-- estado: 'pending' (sin cobrar) | 'paid' (cobrado)
-- entregado: el décimo ya se ha entregado al abonado, aunque no se haya cobrado.

alter table public.pagos add column if not exists entregado boolean not null default false;

update public.pagos
set estado = 'paid', entregado = true
where estado = 'delivered';

alter table public.pagos drop constraint if exists pagos_estado_check;
alter table public.pagos add constraint pagos_estado_check
  check (estado in ('pending', 'paid'));

create index if not exists pagos_sorteo_activos_idx
  on public.pagos (sorteo_id)
  where (estado = 'paid' or entregado);

create or replace function public.registrar_cobro(
  p_abonado_id uuid,
  p_sorteo_id uuid,
  p_cantidad integer,
  p_metodo_pago text default 'efectivo',
  p_nombre_cambio text default null
) returns jsonb
language plpgsql
security invoker
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
    count(*) filter (where estado = 'paid' or entregado),
    count(*) filter (where (estado = 'paid' or entregado) and abonado_id = p_abonado_id),
    count(*) filter (where entregado and abonado_id = p_abonado_id)
  into v_vendidos, v_propios, v_entregados
  from public.pagos
  where sorteo_id = p_sorteo_id;

  if p_cantidad < v_entregados then
    raise exception 'No se puede reducir por debajo de los % décimos entregados. Usa «Anular cobro» o «Deshacer entrega».', v_entregados;
  end if;

  v_disponibles := v_iniciales + v_extra - (v_vendidos - v_propios);

  if p_cantidad > v_disponibles then
    if v_sorteo_nombre !~* '(navidad|navide|ni[nñ][ao]|extraordinari)' then
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
      entregado = false,
      fecha_pago = null,
      metodo_pago = null,
      nombre_cambio = null
  where id in (
    select id
    from public.pagos
    where abonado_id = p_abonado_id
      and sorteo_id = p_sorteo_id
      and (estado = 'paid' or entregado)
    order by entregado desc, created_at asc
    offset p_cantidad
  );

  -- Reactivar filas pendientes no entregadas si faltan.
  select count(*) into v_activos
  from public.pagos
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and (estado = 'paid' or entregado);

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
      and not entregado
    order by created_at asc
    limit greatest(0, p_cantidad - v_activos)
  );

  -- Insertar los décimos que falten.
  select count(*) into v_activos
  from public.pagos
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and (estado = 'paid' or entregado);

  insert into public.pagos (
    abonado_id,
    sorteo_id,
    estado,
    entregado,
    fecha_pago,
    metodo_pago,
    nombre_cambio
  )
  select
    p_abonado_id,
    p_sorteo_id,
    'paid',
    false,
    now(),
    p_metodo_pago,
    v_nombre_cambio
  from generate_series(1, greatest(0, p_cantidad - v_activos));

  -- Cobrar todos los activos, incluidos los entregados sin cobrar.
  update public.pagos
  set estado = 'paid',
      fecha_pago = coalesce(fecha_pago, now()),
      metodo_pago = p_metodo_pago,
      nombre_cambio = v_nombre_cambio
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and (estado = 'paid' or entregado);

  select v_iniciales + v_extra - count(*) filter (where p.estado = 'paid' or p.entregado)
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

create or replace function public.registrar_entrega(
  p_abonado_id uuid,
  p_sorteo_id uuid,
  p_cantidad integer
) returns jsonb
language plpgsql
security invoker
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
  v_sorteo_nombre text;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad a entregar debe ser mayor que cero';
  end if;

  select nombre, decimos_iniciales, decimos_extra
    into v_sorteo_nombre, v_iniciales, v_extra
  from public.sorteos
  where id = p_sorteo_id
  for update;

  if not found then
    raise exception 'Sorteo no encontrado';
  end if;

  select
    count(*) filter (where estado = 'paid' or entregado),
    count(*) filter (where (estado = 'paid' or entregado) and abonado_id = p_abonado_id),
    count(*) filter (where entregado and abonado_id = p_abonado_id)
  into v_vendidos, v_propios, v_entregados
  from public.pagos
  where sorteo_id = p_sorteo_id;

  if p_cantidad < v_entregados then
    raise exception 'No se puede reducir por debajo de los % décimos entregados. Usa «Deshacer entrega».', v_entregados;
  end if;

  v_disponibles := v_iniciales + v_extra - (v_vendidos - v_propios);

  if p_cantidad > v_disponibles then
    if v_sorteo_nombre !~* '(navidad|navide|ni[nñ][ao]|extraordinari)' then
      update public.sorteos
      set decimos_extra = decimos_extra + (p_cantidad - v_disponibles)
      where id = p_sorteo_id;

      v_extra := v_extra + (p_cantidad - v_disponibles);
      v_disponibles := p_cantidad;
    else
      raise exception 'Stock insuficiente: quedan % décimos disponibles', v_disponibles;
    end if;
  end if;

  -- Desactivar sobrantes no entregados para quedarnos con p_cantidad activos.
  update public.pagos
  set estado = 'pending',
      entregado = false,
      fecha_pago = null,
      metodo_pago = null,
      nombre_cambio = null
  where id in (
    select id
    from public.pagos
    where abonado_id = p_abonado_id
      and sorteo_id = p_sorteo_id
      and (estado = 'paid' or entregado)
      and not entregado
    order by created_at asc
    offset greatest(0, p_cantidad - v_entregados)
  );

  -- Marcar como entregados todos los activos restantes (cobrados o sin cobrar).
  update public.pagos
  set entregado = true
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and (estado = 'paid' or entregado);

  select count(*) into v_activos
  from public.pagos
  where abonado_id = p_abonado_id
    and sorteo_id = p_sorteo_id
    and (estado = 'paid' or entregado);

  -- Crear los décimos entregados que falten, sin cobrarlos.
  insert into public.pagos (
    abonado_id,
    sorteo_id,
    estado,
    entregado,
    fecha_pago,
    metodo_pago,
    nombre_cambio
  )
  select
    p_abonado_id,
    p_sorteo_id,
    'pending',
    true,
    null,
    null,
    null
  from generate_series(1, greatest(0, p_cantidad - v_activos));

  return jsonb_build_object(
    'cantidad', p_cantidad,
    'disponibles', greatest(0, v_disponibles - p_cantidad)
  );
end;
$$;

create or replace function public.registrar_cambio_suelto(
  p_sorteo_id uuid,
  p_nombre text
) returns jsonb
language plpgsql
security invoker
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

  if v_sorteo_nombre !~* '(navidad|navide|ni[nñ][ao]|extraordinari)' then
    raise exception 'Los cambios de décimos solo se permiten en sorteos extraordinarios';
  end if;

  select count(*) into v_vendidos
  from public.pagos
  where sorteo_id = p_sorteo_id
    and (estado = 'paid' or entregado);

  v_disponibles := v_iniciales + v_extra - v_vendidos;

  if v_disponibles < 1 then
    raise exception 'Stock insuficiente: no quedan décimos disponibles';
  end if;

  insert into public.pagos (
    abonado_id,
    sorteo_id,
    estado,
    entregado,
    fecha_pago,
    metodo_pago,
    nombre_cambio
  ) values (
    null,
    p_sorteo_id,
    'paid',
    false,
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

grant execute on function public.registrar_cobro(uuid, uuid, integer, text, text)
  to anon, authenticated;
grant execute on function public.registrar_entrega(uuid, uuid, integer)
  to anon, authenticated;
grant execute on function public.registrar_cambio_suelto(uuid, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
