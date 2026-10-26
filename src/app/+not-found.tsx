import { Link } from "expo-router";
import { View } from "react-native";

import { AppText, Card, Screen } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <Screen edges={["left", "right", "bottom"]}>
      <View className="flex-1 items-center justify-center gap-5 p-6">
        <Card className="w-full items-center gap-3 py-8">
          <AppText className="text-4xl font-bold text-zinc-700">404</AppText>
          <AppText variant="title">Pantalla no encontrada</AppText>
          <AppText variant="caption" className="text-center">
            La ruta que buscas no existe en la aplicación.
          </AppText>
          <Link href="/" className="rounded-xl bg-emerald-500 px-4 py-3">
            <AppText className="text-sm font-bold text-zinc-950">
              Volver al inicio
            </AppText>
          </Link>
        </Card>
      </View>
    </Screen>
  );
}
