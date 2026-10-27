import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/icon";

import { Pressable, RefreshControl, ScrollView, View } from "react-native";

import { TipoBadge } from "@/components/badges";
import {
  AppText,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Screen,
  SectionHeader,
  StatCard,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { getDashboard } from "@/lib/api/dashboard";
import type { PagoConRelaciones, SorteoResumen } from "@/lib/database.types";
import {
  etiquetaMetodo,
  formatFechaHora,
  formatFechaLarga,
  formatMoney,
} from "@/lib/format";
import { colors } from "@/lib/theme";

function ProximoSorteoCard({
  sorteo,
  esFuturo,
  onPress,
}: {
  sorteo: SorteoResumen;
  esFuturo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 active:bg-emerald-500/15"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="label" className="text-emerald-300/80">
            {esFuturo ? "Próximo sorteo" : "Sorteo más reciente"}
          </AppText>
          <AppText variant="title" numberOfLines={2}>
            {sorteo.nombre}
          </AppText>
          <AppText className="text-xs text-emerald-200/80">
            {formatFechaLarga(sorteo.fecha)}
          </AppText>
        </View>
        <TipoBadge tipo={sorteo.tipo} />
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-emerald-500/20 pt-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <Icon name="ticket-outline" size={15} color="#6EE7B7" />
            <AppText className="text-xs font-semibold text-emerald-100">
              {sorteo.decimos} vendidos
            </AppText>
          </View>
          {sorteo.tipo !== "mensual" ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="cube-outline" size={15} color="#6EE7B7" />
              <AppText className="text-xs font-semibold text-emerald-100">
                {sorteo.decimosDisponibles} disp.
              </AppText>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1.5">
            <Icon name="cash-outline" size={15} color="#6EE7B7" />
            <AppText className="text-xs font-semibold text-emerald-100">
              {formatMoney(sorteo.totalVendido)}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <AppText className="text-xs font-semibold text-emerald-200">Abrir</AppText>
          <Icon name="arrow-forward" size={14} color="#A7F3D0" />
        </View>
      </View>
    </Pressable>
  );
}

function CobroReciente({
  pago,
  onPress,
}: {
  pago: PagoConRelaciones;
  onPress: () => void;
}) {
  const nombre = pago.abonado?.nombre ?? "Abonado eliminado";
  const sorteo = pago.sorteo?.nombre ?? "Sorteo";
  const precio = Number(pago.sorteo?.precio ?? 0);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 active:bg-zinc-800/80"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
        <Icon name="checkmark" size={18} color={colors.brand} />
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong" numberOfLines={1}>
          {nombre}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {sorteo} · {formatFechaHora(pago.fecha_pago)}
        </AppText>
      </View>
      <View className="items-end gap-0.5">
        <AppText className="text-sm font-bold text-zinc-100">
          {formatMoney(precio)}
        </AppText>
        <AppText variant="caption">{etiquetaMetodo(pago.metodo_pago, pago.nombre_cambio)}</AppText>
      </View>
    </Pressable>
  );
}

export default function InicioScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, reload } = useAsync(getDashboard);
  const anio = new Date().getFullYear();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reload}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <PageHeader
          title="Lotería"
          subtitle="Abonados, sorteos y cobros en un solo lugar"
        />

        {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
        {loading && !data ? <LoadingBlock /> : null}

        {data ? (
          <>
            <View className="flex-row gap-3">
              <StatCard
                label="Abonados activos"
                value={String(data.abonadosActivos)}
                icon="people-outline"
                tone="info"
              />
              <StatCard
                label={`Sorteos ${anio}`}
                value={String(data.sorteosEsteAnio)}
                icon="calendar-outline"
                tone="neutral"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                label="Cobrado este mes"
                value={formatMoney(data.recaudadoMes)}
                icon="wallet-outline"
                tone="success"
              />
              <StatCard
                label="Cobrado total"
                value={formatMoney(data.recaudadoTotal)}
                icon="trending-up-outline"
                tone="warning"
              />
            </View>

            {data.proximoSorteo ? (
              <ProximoSorteoCard
                sorteo={data.proximoSorteo}
                esFuturo={data.proximoEsFuturo}
                onPress={() =>
                  router.push({
                    pathname: "/sorteo/[id]",
                    params: { id: data.proximoSorteo?.id ?? "" },
                  })
                }
              />
            ) : (
              <EmptyState
                icon="ticket-outline"
                title="Todavía no hay sorteos"
                description="Crea el primer sorteo para empezar a registrar décimos."
                actionLabel="Crear sorteo"
                onAction={() => router.push("/sorteo/nuevo")}
              />
            )}

            <View className="gap-3">
              <SectionHeader
                title="Últimos cobros"
                actionLabel="Ver sorteos"
                onAction={() => router.navigate("/sorteos")}
              />
              {data.ultimosCobros.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="Sin cobros recientes"
                  description="Los cobros que registres aparecerán aquí."
                  actionLabel="Ir a cobros"
                  onAction={() => router.navigate("/cobros")}
                />
              ) : (
                data.ultimosCobros.map((pago) => (
                  <CobroReciente
                    key={pago.id}
                    pago={pago}
                    onPress={() =>
                      router.push({
                        pathname: "/sorteo/[id]",
                        params: { id: pago.sorteo_id },
                      })
                    }
                  />
                ))
              )}
            </View>

            <Card className="gap-2">
              <AppText variant="label">Resumen global</AppText>
              <View className="flex-row items-center justify-between">
                <AppText variant="caption">Décimos vendidos</AppText>
                <AppText variant="bodyStrong">{data.decimosVendidos}</AppText>
              </View>
              <View className="flex-row items-center justify-between">
                <AppText variant="caption">Sorteos registrados</AppText>
                <AppText variant="bodyStrong">{data.totalSorteos}</AppText>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
