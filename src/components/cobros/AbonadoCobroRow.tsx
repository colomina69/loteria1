import { memo } from "react";
import { Icon } from "@/components/ui/icon";

import { Pressable, View } from "react-native";

import type {
  EstadoCuenta,
  ModalidadAbonado,
  SorteoTipo,
} from "@/lib/database.types";
import { etiquetaMetodo, formatFechaHora, formatMoney } from "@/lib/format";
import { colors } from "@/lib/theme";

import { EstadoBadge, ModalidadBadge, TipoBadges } from "../badges";
import { AppText } from "../ui";

export type CobroRowData = {
  id: string;
  nombre: string;
  tipos: SorteoTipo[];
  modalidad: ModalidadAbonado;
  estado: EstadoCuenta;
  cantidad: number;
  monto: number;
  metodo: string | null;
  nombreCambio: string | null;
  fecha: string | null;
};

export const AbonadoCobroRow = memo(function AbonadoCobroRow({
  row,
  onPress,
}: {
  row: CobroRowData;
  onPress: () => void;
}) {
  const cobrado = row.cantidad > 0;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:bg-zinc-800/80"
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <AppText variant="bodyStrong" className="flex-1" numberOfLines={1}>
              {row.nombre}
            </AppText>
            <EstadoBadge estado={row.estado} />
          </View>
          <View className="flex-row flex-wrap items-center gap-1">
            {row.modalidad === "extraordinario" ? (
              <ModalidadBadge modalidad={row.modalidad} />
            ) : null}
            <TipoBadges
              tipos={row.tipos.filter((tipo) => tipo !== "mensual")}
            />
          </View>
        </View>
        <View className="items-end gap-1">
          <AppText className="text-sm font-bold text-zinc-100">
            {cobrado ? formatMoney(row.monto) : "—"}
          </AppText>
          <AppText variant="caption">
            {cobrado ? `${row.cantidad} décimo${row.cantidad === 1 ? "" : "s"}` : "sin cobrar"}
          </AppText>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-zinc-800 pt-3">
        <View className="flex-row items-center gap-1.5">
          <Icon
            name={cobrado ? "wallet-outline" : "time-outline"}
            size={14}
            color={colors.muted}
          />
          <AppText
            variant="caption"
            className={row.metodo === "cambio" ? "text-amber-300" : undefined}
          >
            {cobrado
              ? etiquetaMetodo(row.metodo, row.nombreCambio)
              : "Pendiente"}
          </AppText>
        </View>
        <AppText variant="caption">{formatFechaHora(row.fecha)}</AppText>
      </View>
    </Pressable>
  );
});
