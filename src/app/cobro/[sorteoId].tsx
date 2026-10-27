import { Stack, useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/ui/icon";

import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, View } from "react-native";

import {
  ModalidadBadge,
  TipoBadge,
  TipoBadges,
} from "@/components/badges";
import {
  AbonadoCobroRow,
  type CobroRowData,
} from "@/components/cobros/AbonadoCobroRow";
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Input,
  LoadingBlock,
  Screen,
  SearchBar,
  SectionHeader,
  Segmented,
  Sheet,
  Stepper,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { listAbonados } from "@/lib/api/abonados";
import { mensajeError } from "@/lib/api/errors";
import {
  anularCobro,
  marcarEntregado,
  registrarCambioSuelto,
  registrarCobro,
} from "@/lib/api/pagos";
import { getSorteo } from "@/lib/api/sorteos";
import {
  decimosActivos,
  esElegible,
  esPagoActivo,
  estadoDePagos,
  normalizar,
  tipoDesdeNombre,
  tiposDeAbonado,
} from "@/lib/derive";
import type { MetodoPago } from "@/lib/database.types";
import {
  etiquetaMetodo,
  formatFechaHora,
  formatFechaLarga,
  formatMoney,
} from "@/lib/format";
import { colors } from "@/lib/theme";

type FiltroEstado = "todos" | "pendientes" | "cobrados";

const FILTROS_ESTADO: { value: FiltroEstado; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Pendientes" },
  { value: "cobrados", label: "Cobrados" },
];

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

function normalizarMetodo(metodo: string | null): MetodoPago {
  if (
    metodo === "bizum" ||
    metodo === "tarjeta" ||
    metodo === "transferencia" ||
    metodo === "cambio" ||
    metodo === "efectivo"
  ) {
    return metodo;
  }
  return "efectivo";
}

export default function CobroSorteoScreen() {
  const params = useLocalSearchParams<{ sorteoId: string }>();
  const sorteoId = Array.isArray(params.sorteoId)
    ? params.sorteoId[0]
    : params.sorteoId;

  const cargar = useCallback(async () => {
    const id = sorteoId ?? "";
    const [sorteo, abonados] = await Promise.all([getSorteo(id), listAbonados()]);
    return { sorteo, abonados };
  }, [sorteoId]);

  const { data, loading, error, reload } = useAsync(cargar);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(0);
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [nombreCambio, setNombreCambio] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const [cambioVisible, setCambioVisible] = useState(false);
  const [nombreCambioSuelto, setNombreCambioSuelto] = useState("");
  const [guardandoCambio, setGuardandoCambio] = useState(false);
  const [errorCambio, setErrorCambio] = useState<string | null>(null);

  const tipo = data ? tipoDesdeNombre(data.sorteo.nombre) : "mensual";
  const esExtraordinario = tipo !== "mensual";
  const metodosDisponibles: { value: MetodoPago; label: string }[] =
    tipo === "navidad" || tipo === "nino"
      ? [...METODOS, { value: "cambio", label: "Cambio" }]
      : METODOS;
  const precio = Number(data?.sorteo.precio ?? 0);
  const totalesSorteo = useMemo(() => {
    if (!data) {
      return {
        activos: 0,
        cobrados: 0,
        cambios: 0,
        abonadosCobrados: 0,
        recaudado: 0,
        totalVendido: 0,
        deudaCambios: 0,
      };
    }

    const activos = data.sorteo.pagos.filter(esPagoActivo);
    const cambios = activos.filter((pago) => pago.abonado_id === null).length;
    const cobrados = activos.length - cambios;
    const abonados = new Set(
      activos
        .map((pago) => pago.abonado_id)
        .filter((id): id is string => id !== null),
    );
    const precioSorteo = Number(data.sorteo.precio);

    return {
      activos: activos.length,
      cobrados,
      cambios,
      abonadosCobrados: abonados.size,
      recaudado: cobrados * precioSorteo,
      totalVendido: activos.length * precioSorteo,
      deudaCambios: cambios * precioSorteo,
    };
  }, [data]);
  const stockTotal = data
    ? Number(data.sorteo.decimos_iniciales) + Number(data.sorteo.decimos_extra)
    : 0;
  const stockVendidos = totalesSorteo.activos;
  const stockDisponibles = Math.max(0, stockTotal - stockVendidos);
  const pctStock =
    stockTotal > 0
      ? Math.min(100, Math.round((stockDisponibles / stockTotal) * 100))
      : 0;
  const metodos = useMemo(() => {
    if (!data) return [];
    const mapa = new Map<string, number>();
    for (const pago of data.sorteo.pagos.filter(esPagoActivo)) {
      const metodo = pago.metodo_pago ?? "sin método";
      mapa.set(metodo, (mapa.get(metodo) ?? 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([metodo, count]) => ({ metodo, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const baseRows = useMemo<CobroRowData[]>(() => {
    if (!data) return [];
    return data.abonados
      .filter((abonado) => esElegible(abonado, tipo))
      .map((abonado) => {
        const pagos = abonado.pagos.filter(
          (pago) => pago.sorteo_id === data.sorteo.id,
        );
        const activo = pagos.find(esPagoActivo);
        const decimos = decimosActivos(pagos);

        return {
          id: abonado.id,
          nombre: abonado.nombre,
          tipos: tiposDeAbonado(abonado),
          modalidad: abonado.modalidad,
          estado: estadoDePagos(pagos),
          cantidad: decimos,
          monto: decimos * precio,
          metodo: activo?.metodo_pago ?? null,
          nombreCambio: activo?.nombre_cambio ?? null,
          fecha: activo?.fecha_pago ?? null,
        };
      });
  }, [data, tipo, precio]);

  const filas = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return baseRows
      .filter(
        (fila) => texto.length === 0 || normalizar(fila.nombre).includes(texto),
      )
      .filter((fila) => {
        if (filtroEstado === "pendientes") {
          return fila.estado === "pendiente" || fila.estado === "parcial";
        }
        if (filtroEstado === "cobrados") {
          return fila.estado === "pagado" || fila.estado === "entregado";
        }
        return true;
      })
      .sort((a, b) => {
        const pendienteA = a.cantidad > 0 ? 1 : 0;
        const pendienteB = b.cantidad > 0 ? 1 : 0;
        return pendienteA - pendienteB || a.nombre.localeCompare(b.nombre);
      });
  }, [baseRows, busqueda, filtroEstado]);

  const resumen = useMemo(() => {
    const cobrados = baseRows.filter((fila) => fila.cantidad > 0);
    return {
      elegibles: baseRows.length,
      cobrados: cobrados.length,
      decimos: cobrados.reduce((total, fila) => total + fila.cantidad, 0),
      recaudado: cobrados.reduce((total, fila) => total + fila.monto, 0),
    };
  }, [baseRows]);

  const seleccionado = baseRows.find((fila) => fila.id === seleccionadoId) ?? null;
  const pagosSeleccionado = useMemo(() => {
    if (!data || !seleccionadoId) return [];
    return data.sorteo.pagos.filter(
      (pago) => pago.abonado_id === seleccionadoId,
    );
  }, [data, seleccionadoId]);

  const yaEntregado =
    pagosSeleccionado.length > 0 &&
    pagosSeleccionado.filter(esPagoActivo).every((pago) => pago.estado === "delivered");
  const entregadosSeleccionado = pagosSeleccionado.filter(
    (pago) => pago.estado === "delivered",
  ).length;
  const puedeAnular =
    entregadosSeleccionado === 0 &&
    pagosSeleccionado.some((pago) => pago.estado === "paid");
  const maxCantidad = seleccionado
    ? seleccionado.cantidad + stockDisponibles
    : 0;

  function abrirSheet(fila: CobroRowData) {
    setSeleccionadoId(fila.id);
    setCantidad(fila.cantidad);
    setMetodo(normalizarMetodo(fila.metodo));
    setNombreCambio(fila.nombreCambio ?? "");
    setErrorAccion(null);
    setSheetVisible(true);
  }

  function cerrarSheet() {
    if (guardando) return;
    setSheetVisible(false);
    setSeleccionadoId(null);
    setNombreCambio("");
    setErrorAccion(null);
  }

  async function guardarCobro() {
    if (!data || !seleccionadoId) return;

    if (cantidad > 0 && metodo === "cambio" && nombreCambio.trim().length === 0) {
      setErrorAccion("Indica el nombre del décimo o persona del cambio.");
      return;
    }

    setGuardando(true);
    setErrorAccion(null);

    try {
      await registrarCobro({
        abonadoId: seleccionadoId,
        sorteoId: data.sorteo.id,
        cantidad,
        metodoPago: metodo,
        nombreCambio: metodo === "cambio" ? nombreCambio.trim() : null,
      });
      setSheetVisible(false);
      setSeleccionadoId(null);
      setNombreCambio("");
      await reload();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function abrirCambio() {
    setNombreCambioSuelto("");
    setErrorCambio(null);
    setCambioVisible(true);
  }

  function cerrarCambio() {
    if (guardandoCambio) return;
    setCambioVisible(false);
    setNombreCambioSuelto("");
    setErrorCambio(null);
  }

  async function guardarCambio() {
    if (!data) return;
    if (nombreCambioSuelto.trim().length === 0) {
      setErrorCambio("Indica la entidad o el décimo con el que se hace el cambio.");
      return;
    }

    setGuardandoCambio(true);
    setErrorCambio(null);
    try {
      await registrarCambioSuelto({
        sorteoId: data.sorteo.id,
        nombre: nombreCambioSuelto,
      });
      setCambioVisible(false);
      setNombreCambioSuelto("");
      await reload();
    } catch (err) {
      setErrorCambio(mensajeError(err));
    } finally {
      setGuardandoCambio(false);
    }
  }

  function confirmarAnulacion() {
    if (!data || !seleccionadoId) return;
    Alert.alert(
      "Anular cobro",
      "Los décimos de este abonado en el sorteo pasarán a estado pendiente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Anular",
          style: "destructive",
          onPress: async () => {
            setGuardando(true);
            setErrorAccion(null);
            try {
              await anularCobro(seleccionadoId, data.sorteo.id);
              setSheetVisible(false);
              setSeleccionadoId(null);
              await reload();
            } catch (err) {
              setErrorAccion(mensajeError(err));
            } finally {
              setGuardando(false);
            }
          },
        },
      ],
    );
  }

  async function entregar() {
    if (!data || !seleccionadoId) return;
    setGuardando(true);
    setErrorAccion(null);
    try {
      await marcarEntregado(seleccionadoId, data.sorteo.id);
      setSheetVisible(false);
      setSeleccionadoId(null);
      await reload();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: data?.sorteo.nombre ?? "Cobros" }} />

      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <View className="p-5">
          <ErrorBlock message={error} onRetry={reload} />
        </View>
      ) : data ? (
        <>
          <FlatList
            data={filas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AbonadoCobroRow row={item} onPress={() => abrirSheet(item)} />
            )}
            ItemSeparatorComponent={() => <View className="h-3" />}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            ListHeaderComponent={
              <View className="gap-4 pb-4">
                <Card className="gap-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <AppText variant="title">{data.sorteo.nombre}</AppText>
                      <AppText variant="caption">
                        {formatFechaLarga(data.sorteo.fecha)}
                      </AppText>
                    </View>
                    <TipoBadge tipo={tipo} />
                  </View>

                  <View className="flex-row flex-wrap gap-3">
                    <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                      <AppText className="text-lg font-bold text-zinc-100">
                        {formatMoney(precio)}
                      </AppText>
                      <AppText variant="caption">por décimo</AppText>
                    </View>
                    <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                      <AppText className="text-lg font-bold text-zinc-100">
                        {resumen.cobrados}/{resumen.elegibles}
                      </AppText>
                      <AppText variant="caption">abonados cobrados</AppText>
                    </View>
                    <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                      <AppText className="text-lg font-bold text-emerald-400">
                        {formatMoney(totalesSorteo.totalVendido)}
                      </AppText>
                      <AppText variant="caption">total vendido</AppText>
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                      <AppText className="text-base font-bold text-emerald-400">
                        {formatMoney(totalesSorteo.recaudado)}
                      </AppText>
                      <AppText variant="caption">cobrado</AppText>
                    </View>
                    <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                      <AppText className="text-base font-bold text-amber-300">
                        {formatMoney(totalesSorteo.deudaCambios)}
                      </AppText>
                      <AppText variant="caption">debo por cambios</AppText>
                    </View>
                  </View>

                  <View className="gap-1.5">
                    <View className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <View
                        style={{ width: `${pctStock}%` }}
                        className="h-full rounded-full bg-emerald-500"
                      />
                    </View>
                    <AppText variant="caption">
                      {stockDisponibles} de {stockTotal} décimos disponibles
                    </AppText>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <Icon name="information-circle-outline" size={14} color={colors.muted} />
                    <AppText variant="caption">
                      {totalesSorteo.cobrados} décimos cobrados ·{" "}
                      {totalesSorteo.cambios} cambiados sin abonado
                    </AppText>
                  </View>

                  {esExtraordinario ? (
                    <Button
                      title="Cambiar un décimo"
                      variant="secondary"
                      icon="swap-horizontal"
                      disabled={stockDisponibles === 0}
                      onPress={abrirCambio}
                    />
                  ) : null}

                  {metodos.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {metodos.map((item) => (
                        <Badge
                          key={item.metodo}
                          label={`${etiquetaMetodo(item.metodo)}: ${item.count}`}
                          tone={
                            item.metodo === "bizum"
                              ? "info"
                              : item.metodo === "cambio"
                                ? "warning"
                                : "neutral"
                          }
                        />
                      ))}
                    </View>
                  ) : null}
                </Card>

                <SearchBar
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar abonado…"
                />

                <Segmented
                  options={FILTROS_ESTADO}
                  value={filtroEstado}
                  onChange={setFiltroEstado}
                />

                <SectionHeader title="Abonados" />

                {error ? <ErrorBlock message={error} onRetry={reload} /> : null}
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title={
                  baseRows.length === 0
                    ? "Sin abonados elegibles"
                    : "Sin resultados"
                }
                description={
                  baseRows.length === 0
                    ? tipo === "mensual"
                      ? "No hay abonados mensuales activos. Los de solo extraordinarios no aparecen en sorteos mensuales."
                      : "Crea abonados activos para poder registrar cobros."
                    : "Prueba con otro nombre o cambia el filtro de estado."
                }
              />
            }
            ListFooterComponent={
              filas.length > 0 ? (
                <AppText variant="caption" className="mt-4 text-center">
                  Toca un abonado para asignar sus décimos del sorteo.
                </AppText>
              ) : undefined
            }
            keyboardShouldPersistTaps="handled"
          />

          <Sheet
            visible={sheetVisible}
            onClose={cerrarSheet}
            title={seleccionado?.nombre ?? "Registrar cobro"}
          >
            {seleccionado ? (
              <>
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-row flex-wrap items-center gap-1">
                    {seleccionado.modalidad === "extraordinario" ? (
                      <ModalidadBadge modalidad={seleccionado.modalidad} />
                    ) : null}
                    <TipoBadges
                      tipos={seleccionado.tipos.filter(
                        (item) => item !== "mensual",
                      )}
                    />
                  </View>
                  <AppText variant="caption">
                    {formatMoney(precio)} / décimo
                  </AppText>
                </View>

                <Card className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <AppText variant="bodyStrong">Décimos asignados</AppText>
                    <AppText variant="caption">Máx. {maxCantidad}</AppText>
                  </View>
                  <View className="items-center py-2">
                    <Stepper
                      value={cantidad}
                      onChange={setCantidad}
                      min={entregadosSeleccionado}
                      max={maxCantidad}
                    />
                  </View>
                  <View className="flex-row items-center justify-between border-t border-zinc-800 pt-3">
                    <AppText variant="caption">Importe total</AppText>
                    <AppText className="text-2xl font-bold text-emerald-400">
                      {formatMoney(cantidad * precio)}
                    </AppText>
                  </View>
                  <AppText variant="caption">
                    Disponibles en el sorteo: {stockDisponibles} de {stockTotal}
                  </AppText>
                  {stockDisponibles === 0 && seleccionado.cantidad === 0 ? (
                    <AppText className="text-xs text-amber-400">
                      Sin stock disponible. Amplía el inventario del sorteo.
                    </AppText>
                  ) : null}
                </Card>

                {cantidad > 0 ? (
                  <View className="gap-3">
                    <AppText variant="label">Método de pago</AppText>
                    <Segmented
                      options={metodosDisponibles}
                      value={metodo}
                      onChange={setMetodo}
                    />
                    {metodo === "cambio" ? (
                      <Input
                        label="Nombre del décimo o persona"
                        value={nombreCambio}
                        onChangeText={setNombreCambio}
                        placeholder="Ej. Juan / décimo 12345"
                        hint="Indica con quién o qué décimo has hecho el cambio."
                        autoCapitalize="words"
                      />
                    ) : null}
                  </View>
                ) : null}

                {seleccionado.cantidad > 0 ? (
                  <View className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <AppText variant="caption">
                      Cobrado: {formatFechaHora(seleccionado.fecha)}
                    </AppText>
                    <AppText variant="caption">
                      Método:{" "}
                      {etiquetaMetodo(
                        seleccionado.metodo,
                        seleccionado.nombreCambio,
                      )}
                    </AppText>
                  </View>
                ) : null}

                {errorAccion ? <ErrorBlock message={errorAccion} /> : null}

                <Button
                  title={cantidad === 0 ? "Dejar como pendiente" : "Guardar cobro"}
                  icon="checkmark-circle-outline"
                  loading={guardando}
                  onPress={guardarCobro}
                />

                {seleccionado.cantidad > 0 && !yaEntregado ? (
                  <Button
                    title="Marcar como entregado"
                    variant="secondary"
                    icon="cube-outline"
                    disabled={guardando}
                    onPress={entregar}
                  />
                ) : null}

                {puedeAnular ? (
                  <Button
                    title="Anular cobro"
                    variant="danger"
                    icon="close-circle-outline"
                    disabled={guardando}
                    onPress={confirmarAnulacion}
                  />
                ) : null}
              </>
            ) : null}
          </Sheet>

          <Sheet
            visible={cambioVisible}
            onClose={cerrarCambio}
            title="Cambio de décimo"
          >
            <AppText variant="caption" className="leading-5">
              El décimo sale del stock de este sorteo y se registra sin asignarlo
              a ningún abonado. Indica de quién o de qué entidad procede el décimo
              que entra.
            </AppText>
            <Input
              label="Entidad o décimo recibido"
              value={nombreCambioSuelto}
              onChangeText={setNombreCambioSuelto}
              placeholder="Ej. Pepe / décimo 12345"
              hint="Este cambio no aparecerá en el historial de ningún abonado."
              autoCapitalize="words"
              autoFocus
            />
            {errorCambio ? <ErrorBlock message={errorCambio} /> : null}
            <Button
              title="Registrar cambio"
              icon="swap-horizontal"
              loading={guardandoCambio}
              disabled={nombreCambioSuelto.trim().length === 0}
              onPress={guardarCambio}
            />
          </Sheet>
        </>
      ) : null}
    </Screen>
  );
}
