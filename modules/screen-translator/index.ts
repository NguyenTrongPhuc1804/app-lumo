import { requireNativeModule } from "expo-modules-core";

export type TranslationMode = "game" | "manga";

export type TranslatorConfig = {
  mode: TranslationMode;
  sourceLang: string;
  targetLang: string;
  model: string;
};

export type StartOptions = {
  mode?: TranslationMode;
  serverUrl: string; // vi du: http://192.168.1.10:3000
  appKey: string;
  sourceLang: string; // en | zh | ja | ko
  targetLang: string; // vi | en | zh | ja | ko
  accentColor: string; // mau nut noi, vi du #14B8A6
  model: string; // model dich, vi du google/gemini-flash-lite
};

type ScreenTranslatorNative = {
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  isRunning(): boolean;
  // Hien hop thoai xin quyen chup man hinh, tra ve true neu nguoi dung dong y
  start(options: StartOptions): Promise<boolean>;
  stop(): void;
  updateConfig(config: TranslatorConfig): void;
};

export default requireNativeModule<ScreenTranslatorNative>("ScreenTranslator");
