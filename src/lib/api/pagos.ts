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
    .not("abonado_id", "is", null)
    .eq("estado", "paid")
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

export type RegistrarCambioSueltoInput = {
  sorteoId: string;
  nombre: string;
};

/**
 * Registra un décimo cambiado por otro de otra entidad.
 * La fila no se atribuye a ningún abonado y descuenta stock del sorteo.
 */
export async function registrarCambioSuelto(
  input: RegistrarCambioSueltoInput,
): Promise<RegistrarCobroResult | null> {
  const { data, error } = await supabase.rpc("registrar_cambio_suelto", {
    p_sorteo_id: input.sorteoId,
    p_nombre: input.nombre.trim(),
  });

  if (error) throw error;
  return (data as RegistrarCobroResult | null) ?? null;
}

export async function anularCambioSuelto(pagoId: string): Promise<void> {
  const { error } = await supabase
    .from("pagos")
    .delete()
    .eq("id", pagoId)
    .is("abonado_id", null)
    .eq("metodo_pago", "cambio");

  if (error) throw error;
}

export type RegistrarEntregaInput = {
  abonadoId: string;
  sorteoId: string;
  cantidad: number;
};

/**
 * Marca como entregados los décimos indicados sin cobrarlos.
 * Si ya estaban cobrados, conservan su estado de cobro.
 */
export async function registrarEntrega(
  input: RegistrarEntregaInput,
): Promise<RegistrarCobroResult | null> {
  const { data, error } = await supabase.rpc("registrar_entrega", {
    p_abonado_id: input.abonadoId,
    p_sorteo_id: input.sorteoId,
    p_cantidad: Math.max(1, Math.floor(input.cantidad)),
  });

  if (error) throw error;
  return (data as RegistrarCobroResult | null) ?? null;
}

export async function deshacerEntrega(
  abonadoId: string,
  sorteoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pagos")
    .update({ entregado: false })
    .eq("abonado_id", abonadoId)
    .eq("sorteo_id", sorteoId);

  if (error) throw error;
}

/**
 * Deja sin movimiento todos los décimos del abonado en el sorteo:
 * anula el cobro y la entrega, conservando las filas como historial.
 */
export async function anularCobro(
  abonadoId: string,
  sorteoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pagos")
    .update({
      estado: "pending",
      entregado: false,
      fecha_pago: null,
      metodo_pago: null,
      nombre_cambio: null,
    })
    .eq("abonado_id", abonadoId)
    .eq("sorteo_id", sorteoId);

  if (error) throw error;
}
