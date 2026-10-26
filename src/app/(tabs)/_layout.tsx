import { Tabs } from "expo-router";

import { Icon } from "@/components/ui/icon";

import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name={focused ? "home" : "home-outline"} size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="sorteos"
        options={{
          title: "Sorteos",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? "ticket" : "ticket-outline"}
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="abonados"
        options={{
          title: "Abonados",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? "people" : "people-outline"}
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cobros"
        options={{
          title: "Cobros",
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? "cash" : "cash-outline"}
              size={size}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
