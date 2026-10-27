import { esPagoActivo, tipoDesdeNombre } from "../derive";
import type {
  PagoRow,
  SorteoConPagos,
  SorteoResumen,
  SorteoRow,
} from "../database.types";
import { supabase } from "../supabase";

type PagoMini = Pick<PagoRow, "estado" | "abonado_id" | "fecha_pago">;

type SorteoRaw = SorteoRow & {
  pagos: PagoMini[] | null;
};

const SORTEO_RESUMEN_SELECT =
  "id,nombre,fecha,precio,decimos_iniciales,decimos_extra,created_at,pagos(estado,abonado_id,fecha_pago)";

function resumirSorteo(sorteo: SorteoRaw): SorteoResumen {
  const pagos = sorteo.pagos ?? [];
  const activos = pagos.filter(esPagoActivo);
  const conAbonado = activos.filter(
    (pago): pago is PagoMini & { abonado_id: string } =>
      pago.abonado_id !== null,
  );
  const abonados = new Set(conAbonado.map((pago) => pago.abonado_id));
  const { pagos: _pagos, ...base } = sorteo;
  const decimosTotales =
    Number(base.decimos_iniciales) + Number(base.decimos_extra);
  const precio = Number(base.precio);
  const decimosCambiados = activos.length - conAbonado.length;

  return {
    ...base,
    precio,
    decimos_iniciales: Number(base.decimos_iniciales),
    decimos_extra: Number(base.decimos_extra),
    tipo: tipoDesdeNombre(base.nombre),
    decimosTotales,
    decimosDisponibles: Math.max(0, decimosTotales - activos.length),
    decimos: activos.length,
    decimosCambiados,
    abonadosCobrados: abonados.size,
    recaudado: conAbonado.length * precio,
    totalVendido: activos.length * precio,
    deudaCambios: decimosCambiados * precio,
    entregados: activos.filter((pago) => pago.estado === "delivered").length,
    pendientes: pagos.filter((pago) => pago.estado === "pending").length,
  };
}

export async function listSorteos(): Promise<SorteoResumen[]> {
  const { data, error } = await supabase
    .from("sorteos")
    .select(SORTEO_RESUMEN_SELECT)
    .order("fecha", { ascending: false })
    .returns<SorteoRaw[]>();

  if (error) throw error;
  return (data ?? []).map(resumirSorteo);
}

export async function getSorteo(id: string): Promise<SorteoConPagos> {
  const { data, error } = await supabase
    .from("sorteos")
    .select("id,nombre,fecha,precio,decimos_iniciales,decimos_extra,created_at,pagos(*,abonado:abonados(id,nombre,activo))")
    .eq("id", id)
    .maybeSingle()
    .returns<SorteoConPagos>();

  if (error) throw error;
  if (!data) throw new Error("No se ha encontrado el sorteo.");
  return { ...data, precio: Number(data.precio), pagos: data.pagos ?? [] };
}

export type CrearSorteoInput = {
  nombre: string;
  fecha: string;
  precio: number;
  decimosIniciales: number;
};

export async function crearSorteo(input: CrearSorteoInput): Promise<SorteoRow> {
  const { data, error } = await supabase
    .from("sorteos")
    .insert({
      nombre: input.nombre.trim(),
      fecha: input.fecha,
      precio: input.precio,
      decimos_iniciales: Math.max(0, Math.floor(input.decimosIniciales)),
      decimos_extra: 0,
    })
    .select("id,nombre,fecha,precio,decimos_iniciales,decimos_extra,created_at")
    .single()
    .returns<SorteoRow>();

  if (error) throw error;
  return data;
}

export type ActualizarSorteoInput = {
  nombre?: string;
  fecha?: string;
  precio?: number;
};

export async function actualizarSorteo(
  id: string,
  input: ActualizarSorteoInput,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.nombre !== undefined) patch.nombre = input.nombre.trim();
  if (input.fecha !== undefined) patch.fecha = input.fecha;
  if (input.precio !== undefined) patch.precio = input.precio;

  const { error } = await supabase.from("sorteos").update(patch).eq("id", id);
  if (error) throw error;
}

export async function ampliarStock(
  id: string,
  cantidad: number,
): Promise<void> {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new Error("La ampliación debe ser mayor que cero.");
  }

  const { error } = await supabase.rpc("ampliar_stock", {
    p_sorteo_id: id,
    p_cantidad: cantidad,
  });

  if (error) throw error;
}

export async function contarPagosDeSorteo(id: string): Promise<number> {
  const { count, error } = await supabase
    .from("pagos")
    .select("id", { count: "exact", head: true })
    .eq("sorteo_id", id);

  if (error) throw error;
  return count ?? 0;
}

export async function eliminarSorteo(id: string): Promise<void> {
  const pagos = await contarPagosDeSorteo(id);
  if (pagos > 0) {
    throw new Error(
      `No se puede eliminar un sorteo con ${pagos} pago(s) registrado(s).`,
    );
  }

  const { error } = await supabase.from("sorteos").delete().eq("id", id);
  if (error) throw error;
}
