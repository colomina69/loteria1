import type {
  AbonadoRef,
  MetodoPago,
  PagoConRelaciones,
  PagoDeAbonado,
  PagoRow,
} from "../database.types";
import { supabase } from "../supabase";

export async function listPagosDeSorteo(
  sorteoId: string,
): Promise<(PagoRow & { abonado: AbonadoRef | null })[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("*,abonado:abonados(id,nombre,activo)")
    .eq("sorteo_id", sorteoId)
    .order("created_at", { ascending: true })
    .returns<(PagoRow & { abonado: AbonadoRef | null })[]>();

  if (error) throw error;
  return data ?? [];
}

export async function listPagosDeAbonado(
  abonadoId: string,
): Promise<PagoDeAbonado[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("*,sorteo:sorteos(id,nombre,fecha,precio)")
    .eq("abonado_id", abonadoId)
    .order("created_at", { ascending: true })
    .returns<PagoDeAbonado[]>();

  if (error) throw error;
  return data ?? [];
}

export async function listUltimosCobros(limit = 6): Promise<PagoConRelaciones[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select(
      "*,abonado:abonados(id,nombre,activo),sorteo:sorteos(id,nombre,fecha,precio)",
    )
    .in("estado", ["paid", "delivered"])
    .order("fecha_pago", { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<PagoConRelaciones[]>();

  if (error) throw error;
  return data ?? [];
}

export type RegistrarCobroInput = {
  abonadoId: string;
  sorteoId: string;
  cantidad: number;
  metodoPago: MetodoPago;
  nombreCambio?: string | null;
};

export type RegistrarCobroResult = {
  cantidad: number;
  disponibles: number;
};

/**
 * Guarda el total de décimos de un abonado en un sorteo.
 * El RPC valida el stock, activa/desactiva filas y garantiza atomicidad.
 * `cantidad = 0` deja las filas existentes como pendientes (anulación).
 */
export async function registrarCobro(
  input: RegistrarCobroInput,
): Promise<RegistrarCobroResult | null> {
  const cantidad = Math.max(0, Math.floor(input.cantidad));

  const { data, error } = await supabase.rpc("registrar_cobro", {
    p_abonado_id: input.abonadoId,
    p_sorteo_id: input.sorteoId,
    p_cantidad: cantidad,
    p_metodo_pago: input.metodoPago,
    p_nombre_cambio: input.nombreCambio?.trim() || null,
  });

  if (error) throw error;
  return (data as RegistrarCobroResult | null) ?? null;
}

export async function anularCobro(
  abonadoId: string,
  sorteoId: string,
): Promise<void> {
  await registrarCobro({
    abonadoId,
    sorteoId,
    cantidad: 0,
    metodoPago: "efectivo",
    nombreCambio: null,
  });
}

export async function marcarEntregado(
  abonadoId: string,
  sorteoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pagos")
    .update({ estado: "delivered" })
    .eq("abonado_id", abonadoId)
    .eq("sorteo_id", sorteoId)
    .in("estado", ["paid", "delivered"]);

  if (error) throw error;
}

export async function marcarPendiente(
  abonadoId: string,
  sorteoId: string,
): Promise<void> {
  await anularCobro(abonadoId, sorteoId);
}
