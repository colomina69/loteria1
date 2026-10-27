import { memo } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

import { Pressable, View } from "react-native";

import type { SorteoResumen } from "@/lib/database.types";
import { formatFechaLarga, formatMoney } from "@/lib/format";
import { colors } from "@/lib/theme";

import { TipoBadge } from "../badges";
import { AppText } from "../ui";

function Metric({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name={icon} size={15} color={colors.muted} />
      <View>
        <AppText className="text-sm font-semibold text-zinc-100">{value}</AppText>
        <AppText className="text-[10px] uppercase tracking-wide text-zinc-500">
          {label}
        </AppText>
      </View>
    </View>
  );
}

export const SorteoCard = memo(function SorteoCard({
  sorteo,
  onPress,
}: {
  sorteo: SorteoResumen;
  onPress: () => void;
}) {
  const porcentajeDisponible =
    sorteo.decimosTotales > 0
      ? Math.min(
          100,
          Math.round((sorteo.decimosDisponibles / sorteo.decimosTotales) * 100),
        )
      : 0;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:bg-zinc-800/80"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="subtitle" numberOfLines={2}>
            {sorteo.nombre}
          </AppText>
          <AppText variant="caption">{formatFechaLarga(sorteo.fecha)}</AppText>
        </View>
        <TipoBadge tipo={sorteo.tipo} />
      </View>

      <View className="mt-4 flex-row flex-wrap gap-x-5 gap-y-3">
        <Metric
          icon="ticket-outline"
          value={String(sorteo.decimos)}
          label="vendidos"
        />
        <Metric
          icon="people-outline"
          value={String(sorteo.abonadosCobrados)}
          label="abonados"
        />
        <Metric
          icon="cash-outline"
          value={formatMoney(sorteo.totalVendido)}
          label="total vendido"
        />
      </View>

      {sorteo.deudaCambios > 0 ? (
        <View className="mt-3 flex-row items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <View className="flex-row items-center gap-1.5">
            <Icon name="swap-horizontal" size={14} color={colors.warning} />
            <AppText className="text-xs font-semibold text-amber-200">
              Debo por {sorteo.decimosCambiados} cambio
              {sorteo.decimosCambiados === 1 ? "" : "s"}
            </AppText>
          </View>
          <AppText className="text-sm font-bold text-amber-300">
            {formatMoney(sorteo.deudaCambios)}
          </AppText>
        </View>
      ) : null}

      {sorteo.tipo === "mensual" ? (
        <View className="mt-4 flex-row items-center gap-1.5">
          <Icon
            name="information-circle-outline"
            size={13}
            color={colors.muted}
          />
          <AppText variant="caption">
            Stock ampliable automáticamente al cobrar
          </AppText>
        </View>
      ) : (
        <View className="mt-4 gap-2">
          <View className="flex-row items-center justify-between">
            <AppText variant="caption">Disponibles</AppText>
            <AppText
              className={
                sorteo.decimosDisponibles > 0
                  ? "text-xs font-semibold text-emerald-300"
                  : "text-xs font-semibold text-red-300"
              }
            >
              {sorteo.decimosDisponibles} de {sorteo.decimosTotales}
            </AppText>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <View
              style={{ width: `${porcentajeDisponible}%` }}
              className="h-full rounded-full bg-emerald-500"
            />
          </View>
        </View>
      )}

      <View className="mt-3 flex-row items-center justify-between border-t border-zinc-800 pt-3">
        <AppText variant="caption">
          {formatMoney(sorteo.precio)} por décimo
        </AppText>
        <View className="flex-row items-center gap-1">
          <Icon name="checkmark-circle-outline" size={13} color={colors.muted} />
          <AppText variant="caption">{sorteo.entregados} entregados</AppText>
        </View>
      </View>
    </Pressable>
  );
});
