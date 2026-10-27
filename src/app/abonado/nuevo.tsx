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
  Segmented,
} from "@/components/ui";
import { crearAbonado } from "@/lib/api/abonados";
import { mensajeError } from "@/lib/api/errors";
import type { ModalidadAbonado } from "@/lib/database.types";
import { MODALIDAD_OPTIONS } from "@/lib/derive";

export default function NuevoAbonadoScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadAbonado>("mensual");
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
      await crearAbonado(nombre, modalidad);
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
            />

            <View className="gap-2">
              <AppText variant="label">Tipo de abonado</AppText>
              <Segmented
                options={MODALIDAD_OPTIONS}
                value={modalidad}
                onChange={setModalidad}
              />
              <AppText variant="caption" className="leading-5">
                {modalidad === "mensual"
                  ? "Participa en todos los sorteos, incluidos los mensuales, Navidad y Niño."
                  : "Solo se le pedirá cobro en los sorteos de Navidad, Niño y extraordinarios. No aparecerá en los mensuales."}
              </AppText>
            </View>
          </Card>

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
