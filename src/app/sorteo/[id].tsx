import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/ui/icon";

import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { EstadoBadge, TipoBadge } from "@/components/badges";
import { SorteoFormFields } from "@/components/sorteos/SorteoFormFields";
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  InfoRow,
  Input,
  LoadingBlock,
  Screen,
  SectionHeader,
  Sheet,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { mensajeError } from "@/lib/api/errors";
import { anularCambioSuelto } from "@/lib/api/pagos";
import {
  actualizarSorteo,
  ampliarStock,
  eliminarSorteo,
  getSorteo,
} from "@/lib/api/sorteos";
import {
  decimosActivos,
  esPagoActivo,
  estadoDePagos,
  tipoDesdeNombre,
} from "@/lib/derive";
import type { EstadoCuenta, PagoRow } from "@/lib/database.types";
import {
  etiquetaMetodo,
  formatFechaHora,
  formatFechaLarga,
  formatMoney,
  parseDecimal,
} from "@/lib/format";
import { colors } from "@/lib/theme";

type Grupo = {
  abonadoId: string;
  nombre: string;
  pagos: PagoRow[];
  estado: EstadoCuenta;
  cantidad: number;
  monto: number;
  metodo: string | null;
  nombreCambio: string | null;
  fechaPago: string | null;
};

export default function SorteoDetalleScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sorteoId = Array.isArray(params.id) ? params.id[0] : params.id;

  const cargar = useCallback(() => getSorteo(sorteoId ?? ""), [sorteoId]);
  const { data, loading, error, reload } = useAsync(cargar);

  const [editarVisible, setEditarVisible] = useState(false);
  const [nombreEdit, setNombreEdit] = useState("");
  const [fechaEdit, setFechaEdit] = useState("");
  const [precioEdit, setPrecioEdit] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [ampliarVisible, setAmpliarVisible] = useState(false);
  const [ampliarCantidad, setAmpliarCantidad] = useState("");
  const [ampliando, setAmpliando] = useState(false);
  const [errorAmpliar, setErrorAmpliar] = useState<string | null>(null);
  const [anulandoCambioId, setAnulandoCambioId] = useState<string | null>(null);

  const resumen = useMemo(() => {
    const pagos = data?.pagos ?? [];
    const activos = pagos.filter(esPagoActivo);
    const grupos = new Map<string, Grupo>();

    for (const pago of pagos) {
      if (!pago.abonado_id) continue;
      const actual = grupos.get(pago.abonado_id) ?? {
        abonadoId: pago.abonado_id,
        nombre: pago.abonado?.nombre ?? "Abonado",
        pagos: [],
        estado: "pendiente" as EstadoCuenta,
        cantidad: 0,
        monto: 0,
        metodo: null,
        nombreCambio: null,
        fechaPago: null,
      };
      actual.pagos.push(pago);
      grupos.set(pago.abonado_id, actual);
    }

    const lista = Array.from(grupos.values())
      .map((grupo) => {
        const cantidad = decimosActivos(grupo.pagos);
        const activo = grupo.pagos.find(esPagoActivo);
        return {
          ...grupo,
          estado: estadoDePagos(grupo.pagos),
          cantidad,
          monto: cantidad * Number(data?.precio ?? 0),
          metodo: activo?.metodo_pago ?? null,
          nombreCambio: activo?.nombre_cambio ?? null,
          fechaPago: activo?.fecha_pago ?? null,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const conAbonado = activos.filter((pago) => pago.abonado_id !== null);
    const cambios = activos
      .filter((pago) => pago.abonado_id === null)
      .map((pago) => ({
        id: pago.id,
        nombre: pago.nombre_cambio ?? "Cambio",
        fecha: pago.fecha_pago,
      }))
      .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

    const metodos = new Map<string, { count: number; total: number }>();
    for (const pago of conAbonado) {
      const metodo = pago.metodo_pago ?? "sin método";
      const acumulado = metodos.get(metodo) ?? { count: 0, total: 0 };
      acumulado.count += 1;
      acumulado.total += Number(data?.precio ?? 0);
      metodos.set(metodo, acumulado);
    }

    return {
      decimos: activos.length,
      decimosCobrados: conAbonado.length,
      decimosCambiados: cambios.length,
      abonadosCobrados: new Set(
        conAbonado
          .map((pago) => pago.abonado_id)
          .filter((id): id is string => id !== null),
      ).size,
      entregados: activos.filter((pago) => pago.estado === "delivered").length,
      pendientes: pagos.filter((pago) => pago.estado === "pending").length,
      metodos: Array.from(metodos.entries())
        .map(([metodo, stats]) => ({ metodo, ...stats }))
        .sort((a, b) => b.count - a.count),
      grupos: lista,
      cambios,
    };
  }, [data]);

  function abrirEdicion() {
    if (!data) return;
    setNombreEdit(data.nombre);
    setFechaEdit(data.fecha);
    setPrecioEdit(String(data.precio).replace(".", ","));
    setErrorAccion(null);
    setEditarVisible(true);
  }

  async function guardarEdicion() {
    if (!data) return;
    const precio = parseDecimal(precioEdit);
    if (nombreEdit.trim().length === 0 || precio === null || precio <= 0) {
      setErrorAccion("Indica un nombre y un precio válido.");
      return;
    }

    setGuardando(true);
    setErrorAccion(null);
    try {
      await actualizarSorteo(data.id, {
        nombre: nombreEdit,
        fecha: fechaEdit,
        precio,
      });
      setEditarVisible(false);
      await reload();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function abrirAmpliar() {
    setAmpliarCantidad("10");
    setErrorAmpliar(null);
    setAmpliarVisible(true);
  }

  async function guardarAmpliacion() {
    if (!data) return;
    const cantidad = /^\d+$/.test(ampliarCantidad.trim())
      ? Number.parseInt(ampliarCantidad, 10)
      : 0;

    if (cantidad <= 0) {
      setErrorAmpliar("Indica una cantidad mayor que cero.");
      return;
    }

    setAmpliando(true);
    setErrorAmpliar(null);
    try {
      await ampliarStock(data.id, cantidad);
      setAmpliarVisible(false);
      await reload();
    } catch (err) {
      setErrorAmpliar(mensajeError(err));
    } finally {
      setAmpliando(false);
    }
  }

  function confirmarEliminar() {
    if (!data) return;
    if (data.pagos.length > 0) {
      Alert.alert(
        "No se puede eliminar",
        `Este sorteo tiene ${data.pagos.length} pago(s) registrado(s). Elimina los pagos o conserva el sorteo para mantener el historial.`,
      );
      return;
    }

    Alert.alert(
      "Eliminar sorteo",
      `¿Seguro que quieres eliminar «${data.nombre}»? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setEliminando(true);
            try {
              await eliminarSorteo(data.id);
              router.back();
            } catch (err) {
              Alert.alert("Error", mensajeError(err));
            } finally {
              setEliminando(false);
            }
          },
        },
      ],
    );
  }

  function confirmarAnularCambio(cambio: {
    id: string;
    nombre: string;
  }) {
    Alert.alert(
      "Anular cambio",
      `El décimo cambiado por «${cambio.nombre}» volverá al stock disponible.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Anular",
          style: "destructive",
          onPress: async () => {
            setAnulandoCambioId(cambio.id);
            try {
              await anularCambioSuelto(cambio.id);
              await reload();
            } catch (err) {
              Alert.alert("Error", mensajeError(err));
            } finally {
              setAnulandoCambioId(null);
            }
          },
        },
      ],
    );
  }

  const tipo = data ? tipoDesdeNombre(data.nombre) : "mensual";
  const precio = Number(data?.precio ?? 0);
  const recaudado = resumen.decimosCobrados * precio;
  const deudaCambios = resumen.decimosCambiados * precio;
  const totalVendido = resumen.decimos * precio;
  const stockTotal = data
    ? Number(data.decimos_iniciales) + Number(data.decimos_extra)
    : 0;
  const stockDisponibles = Math.max(0, stockTotal - resumen.decimos);
  const porcentajeDisponible =
    stockTotal > 0
      ? Math.min(100, Math.round((stockDisponibles / stockTotal) * 100))
      : 0;

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: data?.nombre ?? "Sorteo" }} />

      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <View className="p-5">
          <ErrorBlock message={error} onRetry={reload} />
        </View>
      ) : data ? (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          >
            <Card className="gap-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <AppText variant="title">{data.nombre}</AppText>
                  <AppText variant="caption">
                    {formatFechaLarga(data.fecha)}
                  </AppText>
                </View>
                <TipoBadge tipo={tipo} />
              </View>

              <View className="flex-row gap-2">
                {tipo === "mensual" ? (
                  <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                    <AppText className="text-xl font-bold text-emerald-400">
                      {resumen.abonadosCobrados}
                    </AppText>
                    <AppText variant="caption">abonados</AppText>
                  </View>
                ) : (
                  <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                    <AppText className="text-xl font-bold text-emerald-400">
                      {stockDisponibles}
                    </AppText>
                    <AppText variant="caption">disponibles</AppText>
                  </View>
                )}
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-xl font-bold text-zinc-100">
                    {resumen.decimos}
                  </AppText>
                  <AppText variant="caption">vendidos</AppText>
                </View>
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-lg font-bold text-emerald-400">
                    {formatMoney(totalVendido)}
                  </AppText>
                  <AppText variant="caption">total vendido</AppText>
                </View>
              </View>

              {deudaCambios > 0 ? (
                <View className="flex-row items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <View className="flex-row items-center gap-1.5">
                    <Icon
                      name="swap-horizontal"
                      size={14}
                      color={colors.warning}
                    />
                    <AppText className="text-xs font-semibold text-amber-200">
                      Debo por {resumen.decimosCambiados} cambio
                      {resumen.decimosCambiados === 1 ? "" : "s"}
                    </AppText>
                  </View>
                  <AppText className="text-sm font-bold text-amber-300">
                    {formatMoney(deudaCambios)}
                  </AppText>
                </View>
              ) : null}

              {tipo === "mensual" ? (
                <View className="flex-row items-center gap-1.5">
                  <Icon
                    name="information-circle-outline"
                    size={14}
                    color={colors.brand}
                  />
                  <AppText variant="caption">
                    Sorteo mensual: el stock se amplía automáticamente al cobrar.
                  </AppText>
                </View>
              ) : (
                <View className="gap-1.5">
                  <View className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <View
                      style={{ width: `${porcentajeDisponible}%` }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </View>
                  <AppText variant="caption">
                    {stockDisponibles} de {stockTotal} décimos disponibles
                  </AppText>
                </View>
              )}

              <View className="gap-2">
                <InfoRow label="Precio por décimo" value={formatMoney(Number(data.precio))} />
                <InfoRow label="Abonados con cobro" value={String(resumen.abonadosCobrados)} />
                <InfoRow label="Décimos entregados" value={String(resumen.entregados)} />
                <InfoRow
                  label="Décimos cambiados"
                  value={String(resumen.decimosCambiados)}
                />
                <InfoRow label="Cobrado" value={formatMoney(recaudado)} />
                <InfoRow label="Filas pendientes" value={String(resumen.pendientes)} />
              </View>

              {resumen.metodos.length > 0 ? (
                <View className="gap-2 rounded-xl bg-zinc-950 p-3">
                  <AppText variant="label">Cobros por método</AppText>
                  {resumen.metodos.map((item) => (
                    <View
                      key={item.metodo}
                      className="flex-row items-center justify-between"
                    >
                      <AppText variant="caption">
                        {etiquetaMetodo(item.metodo)}
                      </AppText>
                      <AppText variant="caption">
                        {item.count} décimo{item.count === 1 ? "" : "s"} ·{" "}
                        {formatMoney(item.total)}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              <View className="flex-row gap-2">
                <Button
                  title="Cobrar décimos"
                  icon="cash-outline"
                  className="flex-1"
                  onPress={() =>
                    router.push({
                      pathname: "/cobro/[sorteoId]",
                      params: { sorteoId: data.id },
                    })
                  }
                />
                <Button
                  title="Editar"
                  variant="secondary"
                  icon="create-outline"
                  className="flex-1"
                  onPress={abrirEdicion}
                />
              </View>

              {tipo !== "mensual" ? (
                <Button
                  title="Ampliar stock"
                  variant="secondary"
                  icon="add"
                  onPress={abrirAmpliar}
                />
              ) : (
                <AppText variant="caption">
                  El stock de un sorteo mensual se amplía automáticamente al
                  cobrar.
                </AppText>
              )}
            </Card>

            {error ? <ErrorBlock message={error} onRetry={reload} /> : null}

            <View className="gap-3">
              <SectionHeader title="Cobros del sorteo" />
              {resumen.grupos.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="Sin cobros registrados"
                  description="Selecciona abonados y registra sus décimos para este sorteo."
                  actionLabel="Registrar cobros"
                  onAction={() =>
                    router.push({
                      pathname: "/cobro/[sorteoId]",
                      params: { sorteoId: data.id },
                    })
                  }
                />
              ) : (
                resumen.grupos.map((grupo) => (
                  <Pressable
                    key={grupo.abonadoId}
                    onPress={() =>
                      router.push({
                        pathname: "/abonado/[id]",
                        params: { id: grupo.abonadoId },
                      })
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 active:bg-zinc-800/80"
                  >
                    <View className="flex-row items-center gap-2">
                      <AppText variant="bodyStrong" className="flex-1" numberOfLines={1}>
                        {grupo.nombre}
                      </AppText>
                      <EstadoBadge estado={grupo.estado} />
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <AppText variant="caption">
                        {grupo.cantidad} décimo{grupo.cantidad === 1 ? "" : "s"} ·{" "}
                        {formatMoney(grupo.monto)}
                      </AppText>
                      <View className="flex-row items-center gap-1">
                        <AppText variant="caption">
                          {etiquetaMetodo(grupo.metodo, grupo.nombreCambio)}
                        </AppText>
                        <Icon
                          name="chevron-forward"
                          size={14}
                          color={colors.muted}
                        />
                      </View>
                    </View>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Icon
                        name="wallet-outline"
                        size={13}
                        color={colors.muted}
                      />
                      <AppText variant="caption">
                        {formatFechaHora(grupo.fechaPago)}
                      </AppText>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            {resumen.cambios.length > 0 ? (
              <View className="gap-3">
                <SectionHeader title="Cambios sin abonado" />
                {resumen.cambios.map((cambio) => (
                  <View
                    key={cambio.id}
                    className="flex-row items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
                      <Icon
                        name="swap-horizontal"
                        size={17}
                        color={colors.warning}
                      />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {cambio.nombre}
                      </AppText>
                      <AppText variant="caption">
                        {formatFechaHora(cambio.fecha)} · 1 décimo
                      </AppText>
                    </View>
                    <Button
                      title="Anular"
                      size="sm"
                      variant="danger"
                      icon="trash-outline"
                      loading={anulandoCambioId === cambio.id}
                      onPress={() => confirmarAnularCambio(cambio)}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <Card className="gap-3">
              <AppText variant="label">Zona de riesgo</AppText>
              <AppText variant="caption" className="leading-5">
                Solo puedes eliminar un sorteo si no tiene ningún pago registrado.
              </AppText>
              <Button
                title={eliminando ? "Eliminando…" : "Eliminar sorteo"}
                variant="danger"
                icon="trash-outline"
                loading={eliminando}
                onPress={confirmarEliminar}
              />
            </Card>
          </ScrollView>

          <Sheet
            visible={editarVisible}
            onClose={() => setEditarVisible(false)}
            title="Editar sorteo"
          >
            <SorteoFormFields
              nombre={nombreEdit}
              onNombreChange={setNombreEdit}
              fecha={fechaEdit}
              onFechaChange={setFechaEdit}
              precio={precioEdit}
              onPrecioChange={setPrecioEdit}
            />
            {errorAccion ? <ErrorBlock message={errorAccion} /> : null}
            <Button
              title="Guardar cambios"
              icon="save-outline"
              loading={guardando}
              onPress={guardarEdicion}
            />
          </Sheet>

          <Sheet
            visible={ampliarVisible}
            onClose={() => setAmpliarVisible(false)}
            title="Ampliar stock"
          >
            <AppText variant="caption">
              Stock actual: {stockTotal} décimos · Disponibles: {stockDisponibles}
            </AppText>
            <Input
              label="Décimos a añadir"
              value={ampliarCantidad}
              onChangeText={setAmpliarCantidad}
              placeholder="10"
              keyboardType="number-pad"
              autoFocus
            />
            {errorAmpliar ? <ErrorBlock message={errorAmpliar} /> : null}
            <Button
              title="Añadir décimos"
              icon="add"
              loading={ampliando}
              onPress={guardarAmpliacion}
            />
          </Sheet>
        </>
      ) : null}
    </Screen>
  );
}
