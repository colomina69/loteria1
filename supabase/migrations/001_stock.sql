-- Ejecutar en Supabase → SQL Editor.
-- Permite varios décimos por abonado/sorteo y añade inventario por sorteo.

-- 1. Quitar la restricción que limitaba a un pago por abonado y sorteo.
alter table public.pagos
  drop constraint if exists payments_subscriber_id_draw_id_key;

-- 2. Columnas de inventario.
alter table public.sorteos
  add column if not exists decimos_iniciales integer not null default 0,
  add column if not exists decimos_extra integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sorteos_decimos_iniciales_check'
  ) then
    alter table public.sorteos
      add constraint sorteos_decimos_iniciales_check check (decimos_iniciales >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sorteos_decimos_extra_check'
  ) then
    alter table public.sorteos
      add constraint sorteos_decimos_extra_check check (decimos_extra >= 0);
  end if;
end $$;

-- 3. Backfill histórico: el stock inicial son los décimos ya cobrados.
update public.sorteos s
set decimos_iniciales = coalesce((
      select count(*)::integer
      from public.pagos p
      where p.sorteo_id = s.id and p.estado in ('paid', 'delivered')
    ), 0),
    decimos_extra = 0
where s.decimos_iniciales = 0
  and s.decimos_extra = 0;

-- 4. Índice para calcular stock.
create index if not exists pagos_sorteo_estado_idx
  on public.pagos (sorteo_id, estado);

-- 5. Cobro atómico: valida stock, ajusta las filas del abonado y devuelve el stock restante.
create or replace function public.registrar_cobro(
  p_abonado_id uuid,
  p_sorteo_id uuid,
  p_cantidad integer,
  p_metodo_pago text default 'efectivo'
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
begin
  if p_cantidad is null or p_cantidad < 0 then
    raise exception 'La cantidad de décimos no puede ser negativa';
  end if;

  select decimos_iniciales, decimos_extra
    into v_iniciales, v_extra
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

  -- Décimos que puede tener este abonado sin superar el inventario.
  v_disponibles := v_iniciales + v_extra - (v_vendidos - v_propios);

  if p_cantidad > v_disponibles then
    raise exception 'Stock insuficiente: quedan % décimos disponibles', v_disponibles;
  end if;

  -- Desactivar los décimos activos sobrantes. Se conservan primero los entregados.
  update public.pagos
  set estado = 'pending', fecha_pago = null
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
      metodo_pago = p_metodo_pago
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

  insert into public.pagos (abonado_id, sorteo_id, estado, fecha_pago, metodo_pago)
  select p_abonado_id, p_sorteo_id, 'paid', now(), p_metodo_pago
  from generate_series(1, greatest(0, p_cantidad - v_activos));

  -- Unificar método/fecha en los activos.
  update public.pagos
  set metodo_pago = p_metodo_pago,
      fecha_pago = coalesce(fecha_pago, now())
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

grant execute on function public.registrar_cobro(uuid, uuid, integer, text)
  to anon, authenticated;

-- 6. Ampliación de inventario.
create or replace function public.ampliar_stock(
  p_sorteo_id uuid,
  p_cantidad integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_extra integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La ampliación debe ser mayor que cero';
  end if;

  update public.sorteos
  set decimos_extra = decimos_extra + p_cantidad
  where id = p_sorteo_id
  returning decimos_extra into v_extra;

  if not found then
    raise exception 'Sorteo no encontrado';
  end if;

  return jsonb_build_object('decimos_extra', v_extra);
end;
$$;

grant execute on function public.ampliar_stock(uuid, integer)
  to anon, authenticated;

-- 7. Comprobación rápida.
select
  s.nombre,
  s.decimos_iniciales,
  s.decimos_extra,
  count(p.id) filter (where p.estado in ('paid', 'delivered')) as vendidos,
  s.decimos_iniciales + s.decimos_extra
    - count(p.id) filter (where p.estado in ('paid', 'delivered')) as disponibles
from public.sorteos s
left join public.pagos p on p.sorteo_id = s.id
group by s.id
order by s.fecha desc;
