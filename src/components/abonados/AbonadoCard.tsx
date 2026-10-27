import { memo } from "react";
import { Icon } from "@/components/ui/icon";

import { Pressable, View } from "react-native";

import { resumenAbonado, tiposDeAbonado } from "@/lib/derive";
import type { AbonadoConHistorial } from "@/lib/database.types";
import { formatMoney } from "@/lib/format";
import { colors } from "@/lib/theme";

import { ModalidadBadge, TipoBadges } from "../badges";
import { AppText, Badge } from "../ui";

export const AbonadoCard = memo(function AbonadoCard({
  abonado,
  onPress,
}: {
  abonado: AbonadoConHistorial;
  onPress: () => void;
}) {
  const tipos = tiposDeAbonado(abonado);
  const resumen = resumenAbonado(abonado);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:bg-zinc-800/80"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
          <AppText className="text-sm font-bold text-zinc-200">
            {abonado.nombre.slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <AppText variant="bodyStrong" className="flex-1" numberOfLines={1}>
              {abonado.nombre}
            </AppText>
            {!abonado.activo ? <Badge label="Inactivo" tone="danger" /> : null}
          </View>
          <View className="flex-row flex-wrap items-center gap-1">
            <ModalidadBadge modalidad={abonado.modalidad} />
            <TipoBadges
              tipos={tipos.filter((tipo) => tipo !== "mensual")}
            />
          </View>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </View>

      <View className="mt-3 flex-row items-center gap-4 border-t border-zinc-800 pt-3">
        <View className="flex-row items-center gap-1.5">
          <Icon name="ticket-outline" size={14} color={colors.muted} />
          <AppText variant="caption">{resumen.decimos} décimos</AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon name="cash-outline" size={14} color={colors.muted} />
          <AppText variant="caption">{formatMoney(resumen.recaudado)}</AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon name="albums-outline" size={14} color={colors.muted} />
          <AppText variant="caption">{resumen.sorteos} sorteos</AppText>
        </View>
      </View>
    </Pressable>
  );
});
