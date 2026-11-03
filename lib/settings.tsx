import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import ScreenTranslator from "../modules/screen-translator";
import { DEFAULT_MODELS, fetchAdminModels, fetchModels, type CustomModel } from "./api";
const STORAGE_KEY = "lumo-lens-settings";
const ONBOARDED_KEY = "lumo-lens-onboarded";
const ADMIN_KEY_STORAGE = "lumo-lens-admin-key";

type Settings = {
  serverUrl: string;
  setServerUrl: (value: string) => void;
  adminKey: string;
  setAdminKey: (value: string) => void;

  sourceLang: string;
  targetLang: string;
  chooseLanguage: (forWhich: "source" | "target", code: string) => void;
  swapLanguages: () => void;

  model: string;
  setModel: (code: string) => void;
  modelList: { code: string; label: string }[];
  customModels: CustomModel[];
  reloadModels: () => void;
  reloadAdminModels: () => Promise<void>;

  running: boolean;
  setRunning: (value: boolean) => void;
  hasOverlayPermission: boolean;

  onboarded: boolean | null; // null = dang doc storage
  finishOnboarding: () => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings phai nam trong SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrl] = useState(process.env.EXPO_PUBLIC_SERVER_URL ?? "");
  const [adminKey, setAdminKeyState] = useState(process.env.EXPO_PUBLIC_ADMIN_KEY ?? "");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("vi");
  const [model, setModel] = useState("");
  const [modelList, setModelList] = useState(DEFAULT_MODELS);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [running, setRunning] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Cap nhat lai danh sach model app chon duoc
  const reloadModels = () => {
    fetchModels(serverUrl).then((list) => {
      setModelList(list);
      setModel((prev) => (list.some((m) => m.code === prev) ? prev : list[0]?.code ?? ""));
    });
  };

  const reloadAdminModels = async () => {
    const result = await fetchAdminModels(serverUrl, adminKey);
    if (result !== "unauthorized") setCustomModels(result);
  };

  // Doc cai dat da luu 1 lan khi mo app
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        const data = JSON.parse(saved);
        if (data.serverUrl) setServerUrl(data.serverUrl);
        if (data.sourceLang) setSourceLang(data.sourceLang);
        if (data.targetLang) setTargetLang(data.targetLang);
        if (data.model) setModel(data.model);
      }
    });
    AsyncStorage.getItem(ADMIN_KEY_STORAGE).then((saved) => {
      if (saved) setAdminKeyState(saved);
    });
    AsyncStorage.getItem(ONBOARDED_KEY).then((value) => setOnboarded(value === "yes"));
  }, []);

  useEffect(() => {
    reloadModels();
  }, [serverUrl]);

  // Moi lan quay lai app (vd sau khi cap quyen o man hinh Cai dat) thi kiem tra lai trang thai
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const refresh = () => {
      setHasOverlayPermission(ScreenTranslator.canDrawOverlays());
      setRunning(ScreenTranslator.isRunning());
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, []);

  const setAdminKey = (value: string) => {
    setAdminKeyState(value);
    AsyncStorage.setItem(ADMIN_KEY_STORAGE, value);
  };

  // Chon ngon ngu. Neu chon trung ngon ngu kia thi hoan doi hai ben.
  const chooseLanguage = (forWhich: "source" | "target", code: string) => {
    if (forWhich === "source") {
      if (code === targetLang) setTargetLang(sourceLang);
      setSourceLang(code);
    } else {
      if (code === sourceLang) setSourceLang(targetLang);
      setTargetLang(code);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARDED_KEY, "yes");
    setOnboarded(true);
  };

  return (
    <SettingsContext.Provider
      value={{
        serverUrl,
        setServerUrl,
        adminKey,
        setAdminKey,
        sourceLang,
        targetLang,
        chooseLanguage,
        swapLanguages,
        model,
        setModel,
        modelList,
        customModels,
        reloadModels,
        reloadAdminModels,
        running,
        setRunning,
        hasOverlayPermission,
        onboarded,
        finishOnboarding,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
