import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/ui/icon";

import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { EstadoBadge, TipoBadges } from "@/components/badges";
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Input,
  LoadingBlock,
  Screen,
  SectionHeader,
  SwitchRow,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { actualizarAbonado, getAbonado } from "@/lib/api/abonados";
import { mensajeError } from "@/lib/api/errors";
import {
  decimosActivos,
  esPagoActivo,
  estadoDePagos,
  resumenAbonado,
  tiposDeAbonado,
} from "@/lib/derive";
import type { AbonadoConHistorial, EstadoCuenta } from "@/lib/database.types";
import {
  etiquetaMetodo,
  formatFechaHora,
  formatFechaCorta,
  formatMoney,
} from "@/lib/format";
import { colors } from "@/lib/theme";

type GrupoHistorial = {
  sorteoId: string;
  nombre: string;
  fecha: string;
  estado: EstadoCuenta;
  cantidad: number;
  monto: number;
  fechaPago: string | null;
  metodo: string | null;
};

function construirHistorial(
  abonado: AbonadoConHistorial | null,
): GrupoHistorial[] {
  if (!abonado) return [];

  const grupos = new Map<string, GrupoHistorial>();
  for (const pago of abonado.pagos) {
    if (!pago.sorteo) continue;
    const actual = grupos.get(pago.sorteo_id) ?? {
      sorteoId: pago.sorteo_id,
      nombre: pago.sorteo.nombre,
      fecha: pago.sorteo.fecha,
      estado: "pendiente" as EstadoCuenta,
      cantidad: 0,
      monto: 0,
      fechaPago: null,
      metodo: null,
    };

    const pagosDelSorteo = abonado.pagos.filter(
      (item) => item.sorteo_id === pago.sorteo_id,
    );
    const cantidad = decimosActivos(pagosDelSorteo);
    const activo = pagosDelSorteo.find(esPagoActivo);

    grupos.set(pago.sorteo_id, {
      ...actual,
      estado: estadoDePagos(pagosDelSorteo),
      cantidad,
      monto: cantidad * Number(pago.sorteo.precio),
      fechaPago: activo?.fecha_pago ?? null,
      metodo: activo?.metodo_pago ?? null,
    });
  }

  return Array.from(grupos.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function AbonadoEditor({
  abonado,
  onSaved,
}: {
  abonado: AbonadoConHistorial;
  onSaved: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(abonado.nombre);
  const [activo, setActivo] = useState(abonado.activo);
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function guardar() {
    if (nombre.trim().length === 0) {
      setErrorAccion("El nombre no puede estar vacío.");
      return;
    }

    setGuardando(true);
    setErrorAccion(null);
    try {
      await actualizarAbonado(abonado.id, { nombre, activo });
      await onSaved();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="gap-4">
      <SectionHeader title="Datos del abonado" />
      <Input
        label="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre del abonado"
        autoCapitalize="words"
      />
      <SwitchRow
        label="Abonado activo"
        description="Los inactivos no aparecen para registrar cobros"
        value={activo}
        onValueChange={setActivo}
      />
      {errorAccion ? <ErrorBlock message={errorAccion} /> : null}
      <Button
        title="Guardar cambios"
        icon="save-outline"
        loading={guardando}
        onPress={guardar}
      />
      <AppText variant="caption" className="leading-5">
        Los abonados no se eliminan para conservar el historial de pagos.
        Desactívalos cuando ya no participen.
      </AppText>
    </Card>
  );
}

export default function AbonadoDetalleScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const abonadoId = Array.isArray(params.id) ? params.id[0] : params.id;

  const cargar = useCallback(() => getAbonado(abonadoId ?? ""), [abonadoId]);
  const { data, loading, error, reload } = useAsync(cargar);

  const tipos = useMemo(() => (data ? tiposDeAbonado(data) : []), [data]);
  const resumen = useMemo(
    () => (data ? resumenAbonado(data) : { decimos: 0, recaudado: 0, sorteos: 0 }),
    [data],
  );
  const historial = useMemo(() => construirHistorial(data), [data]);

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: data?.nombre ?? "Abonado" }} />

      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <View className="p-5">
          <ErrorBlock message={error} onRetry={reload} />
        </View>
      ) : data ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Card className="gap-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <AppText variant="title">{data.nombre}</AppText>
                  <AppText variant="caption">
                    Alta: {formatFechaCorta(data.created_at.slice(0, 10))}
                  </AppText>
                </View>
                <TipoBadges tipos={tipos} />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-xl font-bold text-zinc-100">
                    {resumen.decimos}
                  </AppText>
                  <AppText variant="caption">décimos</AppText>
                </View>
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-xl font-bold text-emerald-400">
                    {formatMoney(resumen.recaudado)}
                  </AppText>
                  <AppText variant="caption">pagado</AppText>
                </View>
                <View className="flex-1 rounded-xl bg-zinc-950 p-3">
                  <AppText className="text-xl font-bold text-zinc-100">
                    {resumen.sorteos}
                  </AppText>
                  <AppText variant="caption">sorteos</AppText>
                </View>
              </View>
            </Card>

            <AbonadoEditor key={data.id} abonado={data} onSaved={reload} />

            {error ? <ErrorBlock message={error} onRetry={reload} /> : null}

            <View className="gap-3">
              <SectionHeader
                title="Historial de pagos"
                actionLabel="Ver sorteos"
                onAction={() => router.navigate("/sorteos")}
              />
              {historial.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="Sin pagos registrados"
                  description="Cuando cobres un décimo a este abonado aparecerá aquí."
                />
              ) : (
                historial.map((grupo) => (
                  <Pressable
                    key={grupo.sorteoId}
                    onPress={() =>
                      router.push({
                        pathname: "/sorteo/[id]",
                        params: { id: grupo.sorteoId },
                      })
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 active:bg-zinc-800/80"
                  >
                    <View className="flex-row items-center gap-2">
                      <AppText
                        variant="bodyStrong"
                        className="flex-1"
                        numberOfLines={1}
                      >
                        {grupo.nombre}
                      </AppText>
                      <EstadoBadge estado={grupo.estado} />
                    </View>
                    <View className="mt-1 flex-row items-center justify-between">
                      <AppText variant="caption">{formatFechaCorta(grupo.fecha)}</AppText>
                      <AppText variant="caption">
                        {grupo.cantidad} décimo{grupo.cantidad === 1 ? "" : "s"} ·{" "}
                        {formatMoney(grupo.monto)}
                      </AppText>
                    </View>
                    <View className="mt-2 flex-row items-center justify-between border-t border-zinc-800 pt-2">
                      <View className="flex-row items-center gap-1.5">
                        <Icon
                          name="wallet-outline"
                          size={13}
                          color={colors.muted}
                        />
                        <AppText variant="caption">
                          {etiquetaMetodo(grupo.metodo)}
                        </AppText>
                      </View>
                      <AppText variant="caption">
                        {formatFechaHora(grupo.fechaPago)}
                      </AppText>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </Screen>
  );
}
