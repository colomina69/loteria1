import type {
  AbonadoConHistorial,
  EstadoCuenta,
  ModalidadAbonado,
  PagoRow,
  SorteoTipo,
} from "./database.types";

export const TIPO_LABEL: Record<SorteoTipo, string> = {
  mensual: "Mensual",
  navidad: "Navidad",
  nino: "Niño",
  extraordinario: "Extraordinario",
};

export const MODALIDAD_LABEL: Record<ModalidadAbonado, string> = {
  mensual: "Mensual",
  extraordinario: "Solo extraordinarios",
};

export const MODALIDAD_OPTIONS: { value: ModalidadAbonado; label: string }[] = [
  { value: "mensual", label: MODALIDAD_LABEL.mensual },
  { value: "extraordinario", label: MODALIDAD_LABEL.extraordinario },
];

export const TIPO_ORDER: SorteoTipo[] = ["mensual", "navidad", "nino", "extraordinario"];

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tipoDesdeNombre(nombre: string): SorteoTipo {
  const texto = normalizar(nombre);
  if (/navidad|naviden/.test(texto)) return "navidad";
  if (/\bnino\b|\bnina\b/.test(texto)) return "nino";
  if (/extraordinari/.test(texto)) return "extraordinario";
  return "mensual";
}

export function esPagoActivo(pago: Pick<PagoRow, "estado">): boolean {
  return pago.estado === "paid" || pago.estado === "delivered";
}

export function estadoDePagos(pagos: Pick<PagoRow, "estado">[]): EstadoCuenta {
  const activos = pagos.filter(esPagoActivo);
  const pendientes = pagos.filter((pago) => pago.estado === "pending").length;

  if (activos.length === 0) return "pendiente";
  if (pendientes > 0) return "parcial";
  return activos.every((pago) => pago.estado === "delivered") ? "entregado" : "pagado";
}

export function decimosActivos(pagos: Pick<PagoRow, "estado">[]): number {
  return pagos.filter(esPagoActivo).length;
}

export function tiposDeAbonado(abonado: AbonadoConHistorial): SorteoTipo[] {
  const tipos = new Set<SorteoTipo>();
  for (const pago of abonado.pagos) {
    if (esPagoActivo(pago) && pago.sorteo) {
      tipos.add(tipoDesdeNombre(pago.sorteo.nombre));
    }
  }
  if (abonado.activo && abonado.modalidad === "mensual") tipos.add("mensual");
  return TIPO_ORDER.filter((tipo) => tipos.has(tipo));
}

export function esElegible(
  abonado: AbonadoConHistorial,
  tipo: SorteoTipo,
  incluirTodos = false,
): boolean {
  if (!abonado.activo) return false;
  if (abonado.modalidad === "extraordinario") return tipo !== "mensual";
  if (tipo === "mensual" || tipo === "extraordinario" || incluirTodos) return true;
  return abonado.pagos.some(
    (pago) =>
      esPagoActivo(pago) &&
      pago.sorteo !== null &&
      tipoDesdeNombre(pago.sorteo.nombre) === tipo,
  );
}

export function resumenAbonado(abonado: AbonadoConHistorial): {
  decimos: number;
  recaudado: number;
  sorteos: number;
} {
  const activos = abonado.pagos.filter(esPagoActivo);
  const sorteos = new Set(activos.map((pago) => pago.sorteo_id));
  return {
    decimos: activos.length,
    recaudado: activos.reduce((total, pago) => total + Number(pago.sorteo?.precio ?? 0), 0),
    sorteos: sorteos.size,
  };
}

export function montoDePagos(
  pagos: Pick<PagoRow, "estado">[],
  precio: number,
): number {
  return decimosActivos(pagos) * Number(precio);
}
