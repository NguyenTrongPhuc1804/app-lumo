import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import ScreenTranslator from "../modules/screen-translator";
import { DEFAULT_MODELS, deleteModel, fetchAdminModels, fetchModels, type CustomModel } from "./api";
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

  translationMode: "game" | "manga";
  setTranslationMode: (value: "game" | "manga") => void;
  model: string;
  setModel: (code: string) => void;
  modelList: { code: string; label: string }[];
  customModels: CustomModel[];
  reloadModels: () => Promise<void>;
  reloadAdminModels: () => Promise<void>;
  modelsLoading: boolean;
  adminModelsLoading: boolean;
  modelsError: string | null;
  adminModelsError: string | null;
  deletingIds: string[];
  removeModel: (id: string) => Promise<string | null>;

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
  const [translationMode, setTranslationMode] = useState<"game" | "manga">("game");

  useEffect(() => {
    if (Platform.OS === "android") ScreenTranslator.updateConfig({ mode: translationMode, sourceLang, targetLang, model });
  }, [translationMode, sourceLang, targetLang, model]);
  const [modelList, setModelList] = useState(DEFAULT_MODELS);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [running, setRunning] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  const [modelsLoading, setModelsLoading] = useState(true);
  const [adminModelsLoading, setAdminModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [adminModelsError, setAdminModelsError] = useState<string | null>(null);
  const modelsRequest = useRef(0);
  const adminRequest = useRef(0);
  const config = useRef({ serverUrl, adminKey });
  config.current = { serverUrl, adminKey };
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const deleting = useRef(new Set<string>());

  // Chi request moi nhat duoc phep cap nhat du lieu va loading.
  const reloadModels = useCallback(async () => {
    if (config.current.serverUrl !== serverUrl) return;
    const request = ++modelsRequest.current;
    setModelsLoading(true);
    setModelsError(null);
    try {
      const list = await fetchModels(serverUrl);
      if (request !== modelsRequest.current) return;
      setModelList(list);
      setModel((prev) => (list.some((m) => m.code === prev) ? prev : list[0]?.code ?? ""));
    } catch (err) {
      if (request === modelsRequest.current) setModelsError(err instanceof Error ? err.message : "Không tải được danh sách model.");
    } finally {
      if (request === modelsRequest.current) setModelsLoading(false);
    }
  }, [serverUrl]);

  const reloadAdminModels = useCallback(async () => {
    if (config.current.serverUrl !== serverUrl || config.current.adminKey !== adminKey) return;
    const request = ++adminRequest.current;
    setAdminModelsLoading(true);
    setAdminModelsError(null);
    try {
      const list = await fetchAdminModels(serverUrl, adminKey);
      if (request === adminRequest.current) setCustomModels(list);
    } catch (err) {
      if (request === adminRequest.current) setAdminModelsError(err instanceof Error ? err.message : "Không tải được danh sách model.");
    } finally {
      if (request === adminRequest.current) setAdminModelsLoading(false);
    }
  }, [serverUrl, adminKey]);

  // Giu trang thai xoa o provider de khong mat khi chuyen tab.
  const removeModel = async (id: string) => {
    if (config.current.serverUrl !== serverUrl || config.current.adminKey !== adminKey) return "Cấu hình đã thay đổi. Vui lòng thử lại.";
    if (deleting.current.has(id)) return null;
    deleting.current.add(id);
    setDeletingIds([...deleting.current]);
    try {
      const error = await deleteModel(serverUrl, adminKey, id);
      if (error) return error;
      await Promise.all([reloadAdminModels(), reloadModels()]);
      return null;
    } finally {
      deleting.current.delete(id);
      setDeletingIds([...deleting.current]);
    }
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
    setModelList(DEFAULT_MODELS);
    reloadModels();
    return () => { modelsRequest.current++; };
  }, [reloadModels]);

  useEffect(() => {
    setCustomModels([]);
    reloadAdminModels();
    return () => { adminRequest.current++; };
  }, [reloadAdminModels]);

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
        translationMode,
        setTranslationMode,
        modelList,
        customModels,
        reloadModels,
        reloadAdminModels,
        modelsLoading,
        adminModelsLoading,
        modelsError,
        adminModelsError,
        deletingIds,
        removeModel,
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
