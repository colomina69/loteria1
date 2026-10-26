import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from "react-native";

import { colors } from "@/lib/theme";

import { Icon, type IconName } from "./icon";

import { cn } from "./cn";
import { AppText } from "./primitives";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-emerald-500 active:bg-emerald-400",
  secondary: "border border-zinc-700 bg-zinc-800 active:bg-zinc-700",
  ghost: "bg-transparent active:bg-zinc-800/70",
  danger: "border border-red-500/30 bg-red-500/10 active:bg-red-500/20",
};

const BUTTON_TEXT: Record<ButtonVariant, string> = {
  primary: "text-zinc-950",
  secondary: "text-zinc-100",
  ghost: "text-zinc-300",
  danger: "text-red-300",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
};

const BUTTON_TEXT_SIZES: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-sm",
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  textClassName,
  disabled,
  ...props
}: Omit<PressableProps, "children"> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
  className?: string;
  textClassName?: string;
}) {
  const deshabilitado = disabled || loading;
  const iconColor = variant === "primary" ? "#09090B" : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={deshabilitado}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-xl",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        deshabilitado && "opacity-40",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 14 : 17} color={iconColor} />
      ) : null}
      <AppText
        className={cn(
          "font-bold",
          BUTTON_TEXT[variant],
          BUTTON_TEXT_SIZES[size],
          textClassName,
        )}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

export function Input({
  label,
  error,
  hint,
  containerClassName,
  leftIcon,
  onFocus,
  onBlur,
  multiline,
  className,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  leftIcon?: IconName;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View
        className={cn(
          "flex-row items-center gap-2 rounded-xl border bg-zinc-950 px-3",
          focused ? "border-emerald-500" : "border-zinc-800",
          multiline && "items-start py-1",
        )}
      >
        {leftIcon ? (
          <Icon
            name={leftIcon}
            size={18}
            color={focused ? colors.brand : colors.muted}
            style={multiline ? { marginTop: 12 } : undefined}
          />
        ) : null}
        <TextInput
          className={cn(
            "flex-1 py-3 text-base text-zinc-100",
            multiline && "min-h-24 text-top",
            className,
          )}
          placeholderTextColor={colors.muted}
          selectionColor={colors.brand}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </View>
      {error ? (
        <AppText className="text-xs text-red-400">{error}</AppText>
      ) : hint ? (
        <AppText className="text-xs leading-5 text-zinc-500">{hint}</AppText>
      ) : null}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar…",
  className,
}: {
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3",
        className,
      )}
    >
      <Icon name="search" size={17} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.brand}
        autoCorrect={false}
        className="flex-1 py-3 text-sm text-zinc-100"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10}>
          <Icon name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      className={className}
    >
      {options.map((option) => {
        const activo = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3.5 py-2 will-change-pressable",
              activo
                ? "border-emerald-500 bg-emerald-500 active:bg-emerald-400"
                : "border-zinc-800 bg-zinc-900 active:bg-zinc-800",
            )}
          >
            <AppText
              className={cn(
                "text-xs font-semibold",
                activo ? "text-zinc-950" : "text-zinc-300",
              )}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View className="flex-row items-center gap-5">
      <Pressable
        accessibilityLabel="Quitar un décimo"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 active:bg-zinc-700",
          value <= min && "opacity-40",
        )}
      >
        <Icon name="remove" size={22} color={colors.text} />
      </Pressable>
      <AppText className="min-w-10 text-center text-2xl font-bold text-zinc-100">
        {value}
      </AppText>
      <Pressable
        accessibilityLabel="Añadir un décimo"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 active:bg-zinc-700",
          value >= max && "opacity-40",
        )}
      >
        <Icon name="add" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  className,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3",
        className,
      )}
    >
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3F3F46", true: colors.brandDark }}
        thumbColor={value ? colors.brand : "#D4D4D8"}
        ios_backgroundColor="#3F3F46"
      />
    </View>
  );
}
