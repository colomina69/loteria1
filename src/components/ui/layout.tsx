import { useEffect, useRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/lib/theme";

import { Icon, type IconName } from "./icon";

import { cn } from "./cn";
import { AppText, IconBubble } from "./primitives";

export function Screen({
  children,
  className,
  edges = ["top", "left", "right"],
  style,
  ...props
}: ViewProps & {
  children: ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <SafeAreaView
      edges={edges}
      className={cn("flex-1 bg-zinc-950", className)}
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("flex-row items-start justify-between gap-3", className)}>
      <View className="flex-1 gap-1">
        <AppText variant="display">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone?: Tone;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-1 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4",
        className,
      )}
    >
      <IconBubble icon={icon} tone={tone} />
      <View className="gap-0.5">
        <AppText className="text-xl font-bold text-zinc-100">{value}</AppText>
        <AppText variant="caption">{label}</AppText>
      </View>
    </View>
  );
}

export function Fab({
  icon = "add",
  onPress,
  label,
  className,
}: {
  icon?: IconName;
  onPress: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        "absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-emerald-500 active:bg-emerald-400",
        className,
      )}
      style={{ elevation: 8 }}
    >
      <Icon name={icon} size={28} color="#09090B" />
    </Pressable>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const puedeCerrar = useRef(false);

  useEffect(() => {
    if (!visible) {
      puedeCerrar.current = false;
      return;
    }
    const timer = setTimeout(() => {
      puedeCerrar.current = true;
    }, 350);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheetRoot}>
          <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (puedeCerrar.current) onClose();
          }}
          accessibilityLabel="Cerrar"
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-zinc-700" />
          </View>
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <AppText variant="title" className="flex-1">
              {title}
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="active:opacity-60"
            >
              <Icon name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
          >
            {children}
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});

export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <Icon name="hourglass-outline" size={26} color={colors.muted} />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
      <View className="flex-row items-center gap-2">
        <Icon name="alert-circle" size={18} color={colors.danger} />
        <AppText variant="bodyStrong" className="flex-1 text-red-200">
          No se han podido cargar los datos
        </AppText>
      </View>
      <AppText className="text-xs leading-5 text-red-200/80">{message}</AppText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          className="self-start rounded-lg bg-red-500/20 px-3 py-2 active:bg-red-500/30"
        >
          <AppText className="text-xs font-bold text-red-200">Reintentar</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
