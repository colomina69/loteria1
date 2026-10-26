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
  LoadingBlock,
  Screen,
  SectionHeader,
  Sheet,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { mensajeError } from "@/lib/api/errors";
import {
  actualizarSorteo,
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

  const resumen = useMemo(() => {
    const pagos = data?.pagos ?? [];
    const activos = pagos.filter(esPagoActivo);
    const grupos = new Map<string, Grupo>();

    for (const pago of pagos) {
      const actual = grupos.get(pago.abonado_id) ?? {
        abonadoId: pago.abonado_id,
        nombre: pago.abonado?.nombre ?? "Abonado",
        pagos: [],
        estado: "pendiente" as EstadoCuenta,
        cantidad: 0,
        monto: 0,
      };
      actual.pagos.push(pago);
      grupos.set(pago.abonado_id, actual);
    }

    const lista = Array.from(grupos.values())
      .map((grupo) => {
        const cantidad = decimosActivos(grupo.pagos);
        return {
          ...grupo,
          estado: estadoDePagos(grupo.pagos),
          cantidad,
          monto: cantidad * Number(data?.precio ?? 0),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      decimos: activos.length,
      abonadosCobrados: new Set(activos.map((pago) => pago.abonado_id)).size,
      entregados: activos.filter((pago) => pago.estado === "delivered").length,
      pendientes: pagos.filter((pago) => pago.estado === "pending").length,
      grupos: lista,
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

  const tipo = data ? tipoDesdeNombre(data.nombre) : "mensual";
  const recaudado = resumen.decimos * Number(data?.precio ?? 0);

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

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-xl font-bold text-zinc-100">
                    {resumen.decimos}
                  </AppText>
                  <AppText variant="caption">décimos vendidos</AppText>
                </View>
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-xl font-bold text-emerald-400">
                    {formatMoney(recaudado)}
                  </AppText>
                  <AppText variant="caption">cobrado</AppText>
                </View>
              </View>

              <View className="gap-2">
                <InfoRow label="Precio por décimo" value={formatMoney(Number(data.precio))} />
                <InfoRow label="Abonados con cobro" value={String(resumen.abonadosCobrados)} />
                <InfoRow label="Décimos entregados" value={String(resumen.entregados)} />
                <InfoRow label="Filas pendientes" value={String(resumen.pendientes)} />
              </View>

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
                          {formatFechaHora(
                            grupo.pagos.find((pago) => esPagoActivo(pago))?.fecha_pago ??
                              null,
                          )}
                        </AppText>
                        <Icon
                          name="chevron-forward"
                          size={14}
                          color={colors.muted}
                        />
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

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
        </>
      ) : null}
    </Screen>
  );
}
