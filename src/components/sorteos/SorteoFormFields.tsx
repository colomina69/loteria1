import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { tipoDesdeNombre } from "@/lib/derive";
import { formatFecha, parseFecha, toISODate } from "@/lib/format";
import { colors } from "@/lib/theme";

import { TipoBadge } from "../badges";
import { AppText, Input } from "../ui";

export function SorteoFormFields({
  nombre,
  onNombreChange,
  fecha,
  onFechaChange,
  precio,
  onPrecioChange,
  incluirStock = false,
  decimosIniciales = "0",
  onDecimosInicialesChange,
}: {
  nombre: string;
  onNombreChange: (value: string) => void;
  fecha: string;
  onFechaChange: (value: string) => void;
  precio: string;
  onPrecioChange: (value: string) => void;
  incluirStock?: boolean;
  decimosIniciales?: string;
  onDecimosInicialesChange?: (value: string) => void;
}) {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const tipo = tipoDesdeNombre(nombre);

  function cambiarFecha(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== "ios") setMostrarCalendario(false);
    if (event.type === "dismissed" || !date) return;
    onFechaChange(toISODate(date));
  }

  return (
    <View className="gap-4">
      <Input
        label="Nombre del sorteo"
        value={nombre}
        onChangeText={onNombreChange}
        placeholder="Ej. Navidad 2026"
        autoCapitalize="sentences"
        hint="El tipo se deduce del nombre: Navidad, Niño o Extraordinario. Si no, será mensual."
      />

      <View className="flex-row items-center gap-2">
        <AppText variant="label">Tipo detectado</AppText>
        <TipoBadge tipo={tipo} />
      </View>

      <View className="gap-1.5">
        <AppText variant="label">Fecha del sorteo</AppText>
        <Pressable
          onPress={() => setMostrarCalendario((visible) => !visible)}
          className="flex-row items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 active:bg-zinc-900"
        >
          <AppText className="text-base text-zinc-100">{formatFecha(fecha)}</AppText>
          <AppText variant="caption">Cambiar</AppText>
        </Pressable>
        {mostrarCalendario ? (
          <DateTimePicker
            value={parseFecha(fecha)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={cambiarFecha}
            themeVariant="dark"
            accentColor={colors.brand}
          />
        ) : null}
      </View>

      <Input
        label="Precio por décimo (€)"
        value={precio}
        onChangeText={onPrecioChange}
        placeholder="7,00"
        keyboardType="decimal-pad"
      />

      {incluirStock && onDecimosInicialesChange ? (
        <Input
          label="Décimos consignados"
          value={decimosIniciales}
          onChangeText={onDecimosInicialesChange}
          placeholder="0"
          keyboardType="number-pad"
          hint="Inventario inicial. En sorteos mensuales debe ser mayor que 0; los extraordinarios se pueden ampliar después."
        />
      ) : null}
    </View>
  );
}
