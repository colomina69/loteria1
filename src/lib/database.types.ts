export type SorteoTipo = "mensual" | "navidad" | "nino" | "extraordinario";

export type ModalidadAbonado = "mensual" | "extraordinario";

export type PagoEstado = "pending" | "paid" | "delivered";

export type SorteoRow = {
  id: string;
  nombre: string;
  fecha: string;
  precio: number;
  decimos_iniciales: number;
  decimos_extra: number;
  created_at: string;
};

export type AbonadoRow = {
  id: string;
  nombre: string;
  activo: boolean;
  modalidad: ModalidadAbonado;
  created_at: string;
};

export type PagoRow = {
  id: string;
  abonado_id: string;
  sorteo_id: string;
  estado: string;
  fecha_pago: string | null;
  created_at: string;
  metodo_pago: string | null;
  nombre_cambio: string | null;
};

export type AbonadoRef = Pick<AbonadoRow, "id" | "nombre" | "activo">;

export type SorteoRef = Pick<SorteoRow, "id" | "nombre" | "fecha" | "precio">;

export type PagoDeAbonado = PagoRow & {
  sorteo: SorteoRef | null;
};

export type PagoConRelaciones = PagoRow & {
  abonado: AbonadoRef | null;
  sorteo: SorteoRef | null;
};

export type AbonadoConHistorial = AbonadoRow & {
  pagos: PagoDeAbonado[];
};

export type SorteoConPagos = SorteoRow & {
  pagos: (PagoRow & { abonado: AbonadoRef | null })[];
};

export type SorteoResumen = SorteoRow & {
  tipo: SorteoTipo;
  decimosTotales: number;
  decimosDisponibles: number;
  decimos: number;
  abonadosCobrados: number;
  recaudado: number;
  entregados: number;
  pendientes: number;
};

export type EstadoCuenta = "pendiente" | "pagado" | "entregado" | "parcial";

export type MetodoPago =
  | "efectivo"
  | "bizum"
  | "tarjeta"
  | "transferencia"
  | "cambio";
