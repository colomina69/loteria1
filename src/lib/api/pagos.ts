import { esPagoActivo } from "../derive";
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

type PagoExistente = Pick<
  PagoRow,
  "id" | "estado" | "fecha_pago" | "metodo_pago"
>;

async function actualizarPago(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("pagos").update(patch).eq("id", id);
  if (error) throw error;
}

export type RegistrarCobroInput = {
  abonadoId: string;
  sorteoId: string;
  cantidad: number;
  metodoPago: MetodoPago;
};

/**
 * Guarda el total de décimos de un abonado en un sorteo.
 * Cada décimo es una fila en `pagos` con estado `paid`.
 * `cantidad = 0` deja las filas existentes como pendientes (anulación).
 */
export async function registrarCobro(input: RegistrarCobroInput): Promise<void> {
  const cantidad = Math.max(0, Math.floor(input.cantidad));
  if (cantidad > 1) {
    throw new Error(
      "La base de datos solo permite un décimo por abonado y sorteo.",
    );
  }
  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from("pagos")
    .select("id,estado,fecha_pago,metodo_pago")
    .eq("abonado_id", input.abonadoId)
    .eq("sorteo_id", input.sorteoId)
    .order("created_at", { ascending: true })
    .returns<PagoExistente[]>();

  if (error) throw error;

  const existentes = data ?? [];

  for (let indice = 0; indice < existentes.length; indice += 1) {
    const pago = existentes[indice];
    const debeEstarActivo = indice < cantidad;

    if (debeEstarActivo) {
      const entregado = pago.estado === "delivered";
      const patch: Record<string, unknown> = {
        estado: entregado ? "delivered" : "paid",
        metodo_pago: input.metodoPago,
        fecha_pago: esPagoActivo(pago) && pago.fecha_pago ? pago.fecha_pago : ahora,
      };
      const cambia =
        pago.estado !== patch.estado ||
        pago.metodo_pago !== input.metodoPago ||
        !pago.fecha_pago;
      if (cambia) await actualizarPago(pago.id, patch);
    } else if (pago.estado !== "pending" || pago.fecha_pago !== null) {
      await actualizarPago(pago.id, { estado: "pending", fecha_pago: null });
    }
  }

  const faltantes = cantidad - existentes.length;
  if (faltantes > 0) {
    const nuevos = Array.from({ length: faltantes }, () => ({
      abonado_id: input.abonadoId,
      sorteo_id: input.sorteoId,
      estado: "paid",
      fecha_pago: ahora,
      metodo_pago: input.metodoPago,
    }));

    const { error: insertError } = await supabase.from("pagos").insert(nuevos);
    if (insertError) {
      if (insertError.code === "23505") {
        throw new Error(
          "La base de datos solo permite un décimo por abonado y sorteo. No se pueden añadir décimos adicionales.",
        );
      }
      throw insertError;
    }
  }
}

export async function anularCobro(
  abonadoId: string,
  sorteoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pagos")
    .update({ estado: "pending", fecha_pago: null })
    .eq("abonado_id", abonadoId)
    .eq("sorteo_id", sorteoId);

  if (error) throw error;
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
