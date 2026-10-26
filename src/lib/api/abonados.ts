import type { AbonadoConHistorial, AbonadoRow } from "../database.types";
import { supabase } from "../supabase";

const ABONADO_SELECT =
  "id,nombre,activo,created_at,pagos(id,abonado_id,sorteo_id,estado,fecha_pago,created_at,metodo_pago,sorteo:sorteos(id,nombre,fecha,precio))";

function normalizarAbonado(abonado: AbonadoConHistorial): AbonadoConHistorial {
  return {
    ...abonado,
    pagos: (abonado.pagos ?? []).map((pago) => ({
      ...pago,
      sorteo: pago.sorteo
        ? { ...pago.sorteo, precio: Number(pago.sorteo.precio) }
        : null,
    })),
  };
}

export async function listAbonados(): Promise<AbonadoConHistorial[]> {
  const { data, error } = await supabase
    .from("abonados")
    .select(ABONADO_SELECT)
    .order("nombre", { ascending: true })
    .returns<AbonadoConHistorial[]>();

  if (error) throw error;
  return (data ?? []).map(normalizarAbonado);
}

export async function getAbonado(id: string): Promise<AbonadoConHistorial> {
  const { data, error } = await supabase
    .from("abonados")
    .select(ABONADO_SELECT)
    .eq("id", id)
    .maybeSingle()
    .returns<AbonadoConHistorial>();

  if (error) throw error;
  if (!data) throw new Error("No se ha encontrado el abonado.");
  return normalizarAbonado(data);
}

export async function crearAbonado(
  nombre: string,
  activo = true,
): Promise<AbonadoRow> {
  const { data, error } = await supabase
    .from("abonados")
    .insert({ nombre: nombre.trim(), activo })
    .select("id,nombre,activo,created_at")
    .single()
    .returns<AbonadoRow>();

  if (error) throw error;
  return data;
}

export type ActualizarAbonadoInput = {
  nombre?: string;
  activo?: boolean;
};

export async function actualizarAbonado(
  id: string,
  input: ActualizarAbonadoInput,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.nombre !== undefined) patch.nombre = input.nombre.trim();
  if (input.activo !== undefined) patch.activo = input.activo;

  const { error } = await supabase.from("abonados").update(patch).eq("id", id);
  if (error) throw error;
}
