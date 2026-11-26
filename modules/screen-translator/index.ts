import { requireNativeModule } from "expo-modules-core";
import type { LanguagePreference } from "../../lib/interface-language";

export type TranslationMode = "game" | "manga";

export type TranslatorConfig = {
  mode: TranslationMode;
  sourceLang: string;
  targetLang: string;
  model: string;
  // Token dang nhap, gui kem moi request dich
  token?: string;
  allowAutomatic?: boolean;
};

export type StartOptions = {
  mode?: TranslationMode;
  serverUrl: string; // vi du: http://192.168.1.10:3000
  token: string;
  allowAutomatic?: boolean;
  sourceLang: string; // en | zh | ja | ko
  targetLang: string; // vi | en | zh | ja | ko
  accentColor: string; // mau nut noi, vi du #14B8A6
  model: string; // model dich, vi du google/gemini-flash-lite
};

type ScreenTranslatorNative = {
  getGuestInstallId(): string;
  hasActiveNetwork?(): boolean;
  getDownloadedLanguagePacks(): Promise<string[]>;
  downloadLanguagePack(language: string): Promise<void>;
  deleteLanguagePack(language: string): Promise<void>;
  prepareOfflineTranslation(serverUrl: string, token: string, count: number): Promise<boolean>;
  getOfflineTranslationRemaining(serverUrl: string, token: string): Promise<number>;
  clearOfflineTranslation(serverUrl: string, token: string): void;
  getDeviceLanguageTags(): string[];
  setInterfaceLanguage(language: LanguagePreference): void;
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  isRunning(): boolean;
  // Hien hop thoai xin quyen chup man hinh, tra ve true neu nguoi dung dong y
  start(options: StartOptions): Promise<boolean>;
  stop(): void;
  updateConfig(config: TranslatorConfig): void;
};

export default requireNativeModule<ScreenTranslatorNative>("ScreenTranslator");
