import type { StitchIconName } from "../components/StitchIcon";

export type TabKey = "home" | "settings" | "account";

export const tabs: { key: TabKey; icon: StitchIconName | "person" }[] = [
  { key: "home", icon: "explore" },
  { key: "settings", icon: "tune" },
  { key: "account", icon: "person" },
];
