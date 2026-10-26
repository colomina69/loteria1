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
import { hoyISO, parseDecimal } from "@/lib/format";

export default function NuevoSorteoScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [precio, setPrecio] = useState("7,00");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precioNumero = parseDecimal(precio);
  const valido =
    nombre.trim().length > 0 && precioNumero !== null && precioNumero > 0;

  async function guardar() {
    if (!valido || precioNumero === null) {
      setError("Indica un nombre y un precio mayor que cero.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await crearSorteo({ nombre, fecha, precio: precioNumero });
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
            />
          </Card>

          {error ? <ErrorBlock message={error} /> : null}

          <View className="gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <AppText variant="bodyStrong">Cómo se calcula el tipo</AppText>
            <AppText variant="caption" className="leading-5">
              Si el nombre contiene «Navidad», «Niño» o «Extraordinario», el sorteo se
              clasifica así. En caso contrario será mensual. El stock no se guarda en
              la base de datos: se muestran los décimos cobrados y el importe.
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
