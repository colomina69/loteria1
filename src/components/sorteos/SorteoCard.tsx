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
        <Metric icon="ticket-outline" value={String(sorteo.decimos)} label="décimos" />
        <Metric
          icon="people-outline"
          value={String(sorteo.abonadosCobrados)}
          label="abonados"
        />
        <Metric
          icon="cash-outline"
          value={formatMoney(sorteo.recaudado)}
          label="cobrado"
        />
      </View>

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
