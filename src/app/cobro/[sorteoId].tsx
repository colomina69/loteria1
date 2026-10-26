import { Stack, useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/ui/icon";

import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, View } from "react-native";

import { TipoBadges, TipoBadge } from "@/components/badges";
import {
  AbonadoCobroRow,
  type CobroRowData,
} from "@/components/cobros/AbonadoCobroRow";
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Screen,
  SearchBar,
  SectionHeader,
  Segmented,
  Sheet,
  SwitchRow,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { listAbonados } from "@/lib/api/abonados";
import { mensajeError } from "@/lib/api/errors";
import {
  anularCobro,
  marcarEntregado,
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
  const [incluirTodos, setIncluirTodos] = useState(false);

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const tipo = data ? tipoDesdeNombre(data.sorteo.nombre) : "mensual";
  const precio = Number(data?.sorteo.precio ?? 0);

  const baseRows = useMemo<CobroRowData[]>(() => {
    if (!data) return [];
    return data.abonados
      .filter((abonado) => esElegible(abonado, tipo, incluirTodos))
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
          estado: estadoDePagos(pagos),
          cantidad: decimos,
          monto: decimos * precio,
          metodo: activo?.metodo_pago ?? null,
          fecha: activo?.fecha_pago ?? null,
        };
      });
  }, [data, tipo, incluirTodos, precio]);

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

  function abrirSheet(fila: CobroRowData) {
    setSeleccionadoId(fila.id);
    setCantidad(fila.cantidad > 0 ? 1 : 0);
    setMetodo(normalizarMetodo(fila.metodo));
    setErrorAccion(null);
    setSheetVisible(true);
  }

  function cerrarSheet() {
    if (guardando) return;
    setSheetVisible(false);
    setSeleccionadoId(null);
    setErrorAccion(null);
  }

  async function guardarCobro() {
    if (!data || !seleccionadoId) return;
    setGuardando(true);
    setErrorAccion(null);

    try {
      await registrarCobro({
        abonadoId: seleccionadoId,
        sorteoId: data.sorteo.id,
        cantidad,
        metodoPago: metodo,
      });
      setSheetVisible(false);
      setSeleccionadoId(null);
      await reload();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    } finally {
      setGuardando(false);
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
                        {formatMoney(resumen.recaudado)}
                      </AppText>
                      <AppText variant="caption">recaudado</AppText>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <Icon name="information-circle-outline" size={14} color={colors.muted} />
                    <AppText variant="caption">
                      {resumen.decimos} décimos cobrados en este sorteo
                    </AppText>
                  </View>
                </Card>

                <SearchBar
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar abonado…"
                />

                {tipo === "navidad" || tipo === "nino" ? (
                  <SwitchRow
                    label="Incluir todos los abonados"
                    description="Por defecto solo aparecen los que ya participaron en este tipo de sorteo"
                    value={incluirTodos}
                    onValueChange={setIncluirTodos}
                  />
                ) : null}

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
                  baseRows.length === 0 && (tipo === "navidad" || tipo === "nino")
                    ? "Ningún abonado tiene pagos previos en sorteos de este tipo. Activa «Incluir todos los abonados» para continuar."
                    : baseRows.length === 0
                      ? "Crea abonados activos para poder registrar cobros."
                      : "Prueba con otro nombre o cambia el filtro de estado."
                }
                actionLabel={
                  baseRows.length === 0 && (tipo === "navidad" || tipo === "nino")
                    ? "Incluir todos"
                    : undefined
                }
                onAction={
                  baseRows.length === 0 && (tipo === "navidad" || tipo === "nino")
                    ? () => setIncluirTodos(true)
                    : undefined
                }
              />
            }
            ListFooterComponent={
              filas.length > 0 ? (
                <AppText variant="caption" className="mt-4 text-center">
                  Toca un abonado para cobrar su décimo. La base de datos permite 1 por sorteo.
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
                <View className="flex-row items-center justify-between">
                  <TipoBadges tipos={seleccionado.tipos} />
                  <AppText variant="caption">
                    {formatMoney(precio)} / décimo
                  </AppText>
                </View>

                <SwitchRow
                  label="Cobrar 1 décimo"
                  description={"La base de datos limita a 1 décimo por abonado y sorteo · " + formatMoney(precio)}
                  value={cantidad > 0}
                  onValueChange={(activo) => setCantidad(activo ? 1 : 0)}
                />

                <View className="flex-row items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <AppText variant="caption">Importe del cobro</AppText>
                  <AppText className="text-2xl font-bold text-emerald-400">
                    {formatMoney(cantidad * precio)}
                  </AppText>
                </View>

                {cantidad > 0 ? (
                  <View className="gap-2">
                    <AppText variant="label">Método de pago</AppText>
                    <Segmented options={METODOS} value={metodo} onChange={setMetodo} />
                  </View>
                ) : null}

                {seleccionado.cantidad > 0 ? (
                  <View className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <AppText variant="caption">
                      Cobrado: {formatFechaHora(seleccionado.fecha)}
                    </AppText>
                    <AppText variant="caption" className="capitalize">
                      Método: {seleccionado.metodo ?? "sin método"}
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

                {seleccionado.cantidad > 0 ? (
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
        </>
      ) : null}
    </Screen>
  );
}
