import "../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/lib/theme";

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "600" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="sorteo/nuevo"
            options={{ title: "Nuevo sorteo", presentation: "modal" }}
          />
          <Stack.Screen name="sorteo/[id]" options={{ title: "Sorteo" }} />
          <Stack.Screen
            name="abonado/nuevo"
            options={{ title: "Nuevo abonado", presentation: "modal" }}
          />
          <Stack.Screen name="abonado/[id]" options={{ title: "Abonado" }} />
          <Stack.Screen name="cobro/[sorteoId]" options={{ title: "Cobros" }} />
          <Stack.Screen name="+not-found" options={{ title: "No encontrado" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
