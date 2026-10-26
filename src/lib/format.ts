const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function formatMoney(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function parseFecha(fecha: string): Date {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, (mes || 1) - 1, dia || 1);
}

export function toISODate(date: Date): string {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function formatFecha(fecha: string): string {
  const date = parseFecha(fecha);
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${date.getFullYear()}`;
}

export function formatFechaLarga(fecha: string): string {
  const date = parseFecha(fecha);
  return `${DIAS[date.getDay()]}, ${date.getDate()} de ${MESES_LARGOS[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatFechaCorta(fecha: string): string {
  const date = parseFecha(fecha);
  return `${date.getDate()} ${MESES_CORTOS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const hora = String(date.getHours()).padStart(2, "0");
  const minutos = String(date.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${date.getFullYear()} ${hora}:${minutos}`;
}

export function esMismoMes(iso: string | null | undefined, ref = new Date()): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getMonth() === ref.getMonth() &&
    date.getFullYear() === ref.getFullYear()
  );
}

export function anioDeFecha(fecha: string): number {
  return Number(fecha.slice(0, 4));
}

export function etiquetaMetodo(metodo: string | null | undefined): string {
  if (!metodo) return "Sin método";
  return metodo.charAt(0).toUpperCase() + metodo.slice(1);
}

export function parseDecimal(value: string): number | null {
  const numero = Number(value.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

export function hoyISO(): string {
  return toISODate(new Date());
}
