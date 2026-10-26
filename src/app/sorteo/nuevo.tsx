import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

import { SorteoFormFields } from "@/components/sorteos/SorteoFormFields";
import {
  AppText,
  Button,
  Card,
  ErrorBlock,
  Screen,
} from "@/components/ui";
import { crearSorteo } from "@/lib/api/sorteos";
import { mensajeError } from "@/lib/api/errors";
import { tipoDesdeNombre } from "@/lib/derive";
import { hoyISO, parseDecimal } from "@/lib/format";

export default function NuevoSorteoScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [precio, setPrecio] = useState("7,00");
  const [decimosIniciales, setDecimosIniciales] = useState("0");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipo = tipoDesdeNombre(nombre);
  const precioNumero = parseDecimal(precio);
  const stockNumero = /^\d+$/.test(decimosIniciales.trim())
    ? Number.parseInt(decimosIniciales, 10)
    : null;
  const stockValido = stockNumero !== null && stockNumero >= 0;
  const valido =
    nombre.trim().length > 0 &&
    precioNumero !== null &&
    precioNumero > 0 &&
    stockValido &&
    (tipo !== "mensual" || (stockNumero ?? 0) > 0);

  async function guardar() {
    if (!valido || precioNumero === null || stockNumero === null) {
      setError(
        tipo === "mensual"
          ? "Indica nombre, precio y un stock inicial mayor que cero."
          : "Indica un nombre, un precio y un stock inicial válido.",
      );
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await crearSorteo({
        nombre,
        fecha,
        precio: precioNumero,
        decimosIniciales: stockNumero,
      });
      router.back();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card className="gap-5">
            <SorteoFormFields
              nombre={nombre}
              onNombreChange={setNombre}
              fecha={fecha}
              onFechaChange={setFecha}
              precio={precio}
              onPrecioChange={setPrecio}
              incluirStock
              decimosIniciales={decimosIniciales}
              onDecimosInicialesChange={setDecimosIniciales}
            />
          </Card>

          {error ? <ErrorBlock message={error} /> : null}

          <View className="gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <AppText variant="bodyStrong">Inventario y tipo</AppText>
            <AppText variant="caption" className="leading-5">
              Si el nombre contiene «Navidad», «Niño» o «Extraordinario», el sorteo se
              clasifica así. En caso contrario será mensual. Los sorteos mensuales
              necesitan stock inicial; los extraordinarios también se pueden ampliar
              después.
            </AppText>
          </View>

          <Button
            title="Crear sorteo"
            icon="checkmark"
            loading={guardando}
            disabled={!valido}
            onPress={guardar}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
