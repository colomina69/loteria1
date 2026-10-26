import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

import {
  AppText,
  Button,
  Card,
  ErrorBlock,
  Input,
  Screen,
} from "@/components/ui";
import { crearAbonado } from "@/lib/api/abonados";
import { mensajeError } from "@/lib/api/errors";

export default function NuevoAbonadoScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (nombre.trim().length === 0) {
      setError("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await crearAbonado(nombre);
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
            <Input
              label="Nombre completo"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. María García"
              autoCapitalize="words"
              autoFocus
              hint="La base de datos actual no guarda teléfono; solo el nombre."
            />
          </Card>

          <View className="gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <AppText variant="bodyStrong">Suscripciones</AppText>
            <AppText variant="caption" className="leading-5">
              No se guardan como columnas. «Mensual» se asigna automáticamente a todo
              abonado activo. «Navidad» y «Niño» se deducen de los pagos registrados en
              sorteos con esas palabras en el nombre.
            </AppText>
          </View>

          {error ? <ErrorBlock message={error} /> : null}

          <Button
            title="Crear abonado"
            icon="person-add-outline"
            loading={guardando}
            disabled={nombre.trim().length === 0}
            onPress={guardar}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
