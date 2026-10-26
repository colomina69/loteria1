import { esPagoActivo } from "../derive";
import type { PagoConRelaciones, SorteoResumen } from "../database.types";
import { anioDeFecha, esMismoMes } from "../format";
import { listAbonados } from "./abonados";
import { listUltimosCobros } from "./pagos";
import { listSorteos } from "./sorteos";

export type DashboardData = {
  abonadosActivos: number;
  sorteosEsteAnio: number;
  totalSorteos: number;
  decimosVendidos: number;
  recaudadoTotal: number;
  recaudadoMes: number;
  proximoSorteo: SorteoResumen | null;
  proximoEsFuturo: boolean;
  ultimosCobros: PagoConRelaciones[];
};

export async function getDashboard(): Promise<DashboardData> {
  const [sorteos, abonados, ultimosCobros] = await Promise.all([
    listSorteos(),
    listAbonados(),
    listUltimosCobros(6),
  ]);

  const anioActual = new Date().getFullYear();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const pagosActivos = abonados
    .flatMap((abonado) => abonado.pagos)
    .filter(esPagoActivo);

  const recaudadoTotal = pagosActivos.reduce(
    (total, pago) => total + Number(pago.sorteo?.precio ?? 0),
    0,
  );

  const recaudadoMes = pagosActivos
    .filter((pago) => esMismoMes(pago.fecha_pago ?? pago.created_at))
    .reduce((total, pago) => total + Number(pago.sorteo?.precio ?? 0), 0);

  const futuros = sorteos
    .filter((sorteo) => {
      const [anio, mes, dia] = sorteo.fecha.split("-").map(Number);
      return new Date(anio, mes - 1, dia).getTime() >= hoy.getTime();
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    abonadosActivos: abonados.filter((abonado) => abonado.activo).length,
    sorteosEsteAnio: sorteos.filter(
      (sorteo) => anioDeFecha(sorteo.fecha) === anioActual,
    ).length,
    totalSorteos: sorteos.length,
    decimosVendidos: pagosActivos.length,
    recaudadoTotal,
    recaudadoMes,
    proximoSorteo: futuros[0] ?? sorteos[0] ?? null,
    proximoEsFuturo: futuros.length > 0,
    ultimosCobros,
  };
}
