import { View } from "react-native";

import { TIPO_LABEL } from "@/lib/derive";
import type { EstadoCuenta, SorteoTipo } from "@/lib/database.types";

import { Badge } from "./ui";

const TIPO_TONE: Record<SorteoTipo, "neutral" | "success" | "warning" | "info"> = {
  mensual: "info",
  navidad: "success",
  nino: "warning",
  extraordinario: "neutral",
};

const ESTADO_LABEL: Record<EstadoCuenta, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
  entregado: "Entregado",
};

const ESTADO_TONE: Record<
  EstadoCuenta,
  "neutral" | "success" | "warning" | "info"
> = {
  pendiente: "warning",
  parcial: "warning",
  pagado: "success",
  entregado: "info",
};

export function TipoBadge({ tipo }: { tipo: SorteoTipo }) {
  return <Badge label={TIPO_LABEL[tipo]} tone={TIPO_TONE[tipo]} />;
}

export function EstadoBadge({ estado }: { estado: EstadoCuenta }) {
  return <Badge label={ESTADO_LABEL[estado]} tone={ESTADO_TONE[estado]} />;
}

export function TipoBadges({ tipos }: { tipos: SorteoTipo[] }) {
  if (tipos.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-1">
      {tipos.map((tipo) => (
        <TipoBadge key={tipo} tipo={tipo} />
      ))}
    </View>
  );
}
