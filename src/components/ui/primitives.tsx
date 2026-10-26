import type { ReactNode } from "react";
import {
  Pressable,
  Text as RNText,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";

import { cn } from "./cn";
import { Icon, type IconName } from "./icon";

type TextVariant =
  | "display"
  | "title"
  | "subtitle"
  | "body"
  | "bodyStrong"
  | "caption"
  | "label"
  | "mono";

const TEXT_VARIANTS: Record<TextVariant, string> = {
  display: "text-3xl font-bold tracking-tight text-zinc-100",
  title: "text-xl font-semibold text-zinc-100",
  subtitle: "text-base font-medium text-zinc-200",
  body: "text-sm text-zinc-300",
  bodyStrong: "text-sm font-semibold text-zinc-100",
  caption: "text-xs text-zinc-400",
  label: "text-xs font-semibold uppercase tracking-wide text-zinc-500",
  mono: "text-sm font-mono text-zinc-200",
};

export function AppText({
  variant = "body",
  className,
  ...props
}: TextProps & { variant?: TextVariant }) {
  return <RNText className={cn(TEXT_VARIANTS[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("rounded-2xl border border-zinc-800 bg-zinc-900 p-4", className)}
      {...props}
    />
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-zinc-700 bg-zinc-800",
  success: "border-emerald-500/30 bg-emerald-500/15",
  warning: "border-amber-500/30 bg-amber-500/15",
  danger: "border-red-500/30 bg-red-500/15",
  info: "border-sky-500/30 bg-sky-500/15",
};

const BADGE_TEXT: Record<BadgeTone, string> = {
  neutral: "text-zinc-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-red-300",
  info: "text-sky-300",
};

export function Badge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-1 rounded-full border px-2.5 py-1",
        BADGE_TONES[tone],
        className,
      )}
    >
      <RNText className={cn("text-[11px] font-semibold", BADGE_TEXT[tone])}>
        {label}
      </RNText>
    </View>
  );
}

export function Divider({ className }: { className?: string }) {
  return <View className={cn("h-px w-full bg-zinc-800", className)} />;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <View className={cn("flex-row items-center justify-between", className)}>
      <AppText variant="subtitle">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} className="active:opacity-70">
          <RNText className="text-xs font-semibold text-emerald-400">
            {actionLabel}
          </RNText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
        <Icon name={icon} size={24} color="#A1A1AA" />
      </View>
      <AppText variant="bodyStrong" className="text-center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" className="mt-1 text-center leading-5">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-4 rounded-full bg-emerald-500 px-4 py-2 active:bg-emerald-400"
        >
          <RNText className="text-xs font-bold text-zinc-950">{actionLabel}</RNText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function IconBubble({
  icon,
  tone = "neutral",
  className,
}: {
  icon: IconName;
  tone?: BadgeTone;
  className?: string;
}) {
  const backgrounds: Record<BadgeTone, string> = {
    neutral: "bg-zinc-800",
    success: "bg-emerald-500/15",
    warning: "bg-amber-500/15",
    danger: "bg-red-500/15",
    info: "bg-sky-500/15",
  };
  const iconColors: Record<BadgeTone, string> = {
    neutral: "#D4D4D8",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    info: "#38BDF8",
  };

  return (
    <View
      className={cn(
        "h-10 w-10 items-center justify-center rounded-xl",
        backgrounds[tone],
        className,
      )}
    >
      <Icon name={icon} size={20} color={iconColors[tone]} />
    </View>
  );
}

export function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("flex-row items-center justify-between gap-3", className)}>
      <AppText variant="caption">{label}</AppText>
      {typeof value === "string" ? (
        <AppText variant="bodyStrong" className="text-right">
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}
