import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors } from "@/lib/theme";

function HomeIcon() {
  return (
    <>
      <Path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <Path d="M9 22V12h6v10" />
    </>
  );
}

function TicketIcon() {
  return (
    <>
      <Path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <Path d="M13 5v2M13 17v2M13 11v2" />
    </>
  );
}

function UsersIcon() {
  return (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  );
}

function CashIcon() {
  return (
    <>
      <Rect x="2" y="6" width="20" height="12" rx="2" />
      <Circle cx="12" cy="12" r="2" />
      <Path d="M6 12h.01M18 12h.01" />
    </>
  );
}

function CalendarIcon() {
  return (
    <>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </>
  );
}

function WalletIcon() {
  return (
    <>
      <Path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <Path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </>
  );
}

function TrendingUpIcon() {
  return (
    <>
      <Path d="M23 6l-9.5 9.5-5-5L1 18" />
      <Path d="M17 6h6v6" />
    </>
  );
}

function ReceiptIcon() {
  return (
    <>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <Path d="M8 7h8M8 11h8M8 15h5" />
    </>
  );
}

function CheckIcon() {
  return <Path d="M20 6L9 17l-5-5" />;
}

function CloseIcon() {
  return <Path d="M18 6L6 18M6 6l12 12" />;
}

function PlusIcon() {
  return <Path d="M12 5v14M5 12h14" />;
}

function MinusIcon() {
  return <Path d="M5 12h14" />;
}

function SearchIcon() {
  return (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M21 21l-4.35-4.35" />
    </>
  );
}

function AlertCircleIcon() {
  return (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 8v4M12 16h.01" />
    </>
  );
}

function InfoIcon() {
  return (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4M12 8h.01" />
    </>
  );
}

function ChevronRightIcon() {
  return <Path d="M9 18l6-6-6-6" />;
}

function ArrowRightIcon() {
  return <Path d="M5 12h14M12 5l7 7-7 7" />;
}

function SaveIcon() {
  return (
    <>
      <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <Path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  );
}

function EditIcon() {
  return (
    <>
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  );
}

function TrashIcon() {
  return (
    <>
      <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </>
  );
}

function PackageIcon() {
  return (
    <>
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </>
  );
}

function UserPlusIcon() {
  return (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M19 8v6M22 11h-6" />
    </>
  );
}

function CheckCircleIcon() {
  return (
    <>
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Path d="M22 4L12 14.01l-3-3" />
    </>
  );
}

function XCircleIcon() {
  return (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M15 9l-6 6M9 9l6 6" />
    </>
  );
}

function HourglassIcon() {
  return (
    <Path d="M6 2h12M6 22h12M6 2v4a6 6 0 0 0 6 6 6 6 0 0 0 6-6V2M6 22v-4a6 6 0 0 1 6-6 6 6 0 0 1 6 6v4" />
  );
}

function InboxIcon() {
  return (
    <>
      <Path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  );
}

function ClockIcon() {
  return (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </>
  );
}

function LayersIcon() {
  return <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
}

const ICONS = {
  home: HomeIcon,
  "home-outline": HomeIcon,
  ticket: TicketIcon,
  "ticket-outline": TicketIcon,
  people: UsersIcon,
  "people-outline": UsersIcon,
  cash: CashIcon,
  "cash-outline": CashIcon,
  "calendar-outline": CalendarIcon,
  "wallet-outline": WalletIcon,
  "trending-up-outline": TrendingUpIcon,
  "receipt-outline": ReceiptIcon,
  checkmark: CheckIcon,
  close: CloseIcon,
  add: PlusIcon,
  remove: MinusIcon,
  search: SearchIcon,
  "alert-circle": AlertCircleIcon,
  "information-circle-outline": InfoIcon,
  "chevron-forward": ChevronRightIcon,
  "arrow-forward": ArrowRightIcon,
  "save-outline": SaveIcon,
  "create-outline": EditIcon,
  "trash-outline": TrashIcon,
  "cube-outline": PackageIcon,
  "person-add-outline": UserPlusIcon,
  "checkmark-circle-outline": CheckCircleIcon,
  "close-circle": XCircleIcon,
  "close-circle-outline": XCircleIcon,
  "hourglass-outline": HourglassIcon,
  "file-tray-outline": InboxIcon,
  "time-outline": ClockIcon,
  "albums-outline": LayersIcon,
} satisfies Record<string, ComponentType>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth = 1.9,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const Component = ICONS[name] ?? InboxIcon;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <Component />
    </Svg>
  );
}
