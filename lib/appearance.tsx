import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { getTextScale, parseAppearance, type Appearance, type ColorMode, type TextSize } from "./appearance-options";
import { createTheme } from "./theme";

const STORAGE_KEY = "lumo-lens-appearance";
type AppearanceContextValue = ReturnType<typeof createTheme> & Appearance & {
  setColorMode: (mode: ColorMode) => void;
  setTextSize: (size: TextSize) => void;
  storageError: string | null;
};
const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>({ colorMode: "light", textSize: "auto" });
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const writes = useRef(Promise.resolve());
  const { width } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (active) setAppearance(parseAppearance(saved));
    }).catch(() => {
      if (active) setStorageError("Không đọc được giao diện đã lưu. Đang dùng mặc định.");
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const change = (next: Appearance) => {
    setAppearance(next);
    // Ghi tuan tu de lua chon cu khong ghi de lua chon moi khi bam nhanh.
    writes.current = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))).then(() => setStorageError(null)).catch(() => setStorageError("Không lưu được giao diện. Lựa chọn chỉ áp dụng cho lần mở này."));
  };
  const theme = useMemo(() => createTheme(appearance.colorMode === "dark", getTextScale(appearance.textSize, width), width), [appearance, width]);
  if (!ready) return null;
  return (
    <AppearanceContext.Provider value={{ ...theme, ...appearance, storageError, setColorMode: (colorMode) => change({ ...appearance, colorMode }), setTextSize: (textSize) => change({ ...appearance, textSize }) }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance phải nằm trong AppearanceProvider");
  return value;
}
