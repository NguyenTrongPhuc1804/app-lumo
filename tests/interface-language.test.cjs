const assert = require('node:assert/strict');
const test = require('node:test');
const { createInstance } = require('i18next');
const { createLoader, memoryStorage, waitFor } = require('./helpers/load-ts.cjs');

test('device language matches regions, checks preferred languages in order, and falls back to English', () => {
  const { resolveLanguage } = createLoader()('lib/interface-language.ts');
  for (const [tag, code] of Object.entries({ 'vi-VN': 'vi', 'en-US': 'en', 'zh-Hans-CN': 'zh', 'ko-KR': 'ko', 'ja-JP': 'ja', 'fr-CA': 'fr' })) {
    assert.equal(resolveLanguage('system', [tag]), code);
  }
  assert.equal(resolveLanguage('system', ['de-DE', 'fr-CA']), 'fr');
  assert.equal(resolveLanguage('system', ['de-DE']), 'en');
  assert.equal(resolveLanguage('system', []), 'en');
  assert.equal(resolveLanguage('ja', ['vi-VN']), 'ja');
});

function loadLanguageStore(storage) {
  return createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage }, zustand: require('zustand') })('stores/languageStore.ts').useLanguageStore;
}

test('manual choice persists after reopening and system mode follows the device again', async () => {
  const storage = memoryStorage();
  const first = loadLanguageStore(storage);
  await waitFor(() => first.getState().hydrated);
  assert.equal(first.getState().preference, 'system');
  await first.getState().setPreference('ko');
  const reopened = loadLanguageStore(storage);
  await waitFor(() => reopened.getState().hydrated);
  assert.equal(reopened.getState().preference, 'ko');
  await reopened.getState().setPreference('system');
  const reset = loadLanguageStore(storage);
  await waitFor(() => reset.getState().hydrated);
  assert.equal(reset.getState().preference, 'system');
});

test('invalid preferences fall back to system without a storage error', async () => {
  const store = loadLanguageStore(memoryStorage({ 'lumo-lens-interface-language': 'bad-value' }));
  await waitFor(() => store.getState().hydrated);
  assert.equal(store.getState().preference, 'system');
  assert.equal(store.getState().storageError, null);
});

test('failed reads finish hydration and report a fallback to system', async () => {
  const store = loadLanguageStore({ ...memoryStorage(), async getItem() { throw new Error('cannot read'); } });
  await waitFor(() => store.getState().hydrated);
  assert.equal(store.getState().preference, 'system');
  assert.equal(store.getState().storageError, 'read');
  await store.getState().setPreference('vi');
  assert.equal(store.getState().storageError, null);
});

test('failed writes keep the current choice, report a write error, and can be retried', async () => {
  const storage = memoryStorage();
  const store = loadLanguageStore({
    ...storage,
    async setItem(key, preference) {
      if (!storageAvailable) throw new Error('cannot write');
      await storage.setItem(key, preference);
    },
  });
  let storageAvailable = false;
  await waitFor(() => store.getState().hydrated);
  await store.getState().setPreference('fr');
  assert.equal(store.getState().preference, 'fr');
  assert.equal(store.getState().storageError, 'write');
  assert.equal(await storage.getItem('lumo-lens-interface-language'), null);

  storageAvailable = true;
  await store.getState().setPreference('fr');
  assert.equal(store.getState().storageError, null);
  assert.equal(await storage.getItem('lumo-lens-interface-language'), 'fr');
});

test('a failed earlier write does not leave an error after the latest choice is saved', async () => {
  const storage = memoryStorage();
  let firstWrite = true;
  const store = loadLanguageStore({
    ...storage,
    async setItem(key, preference) {
      if (firstWrite) {
        firstWrite = false;
        throw new Error('cannot write');
      }
      await storage.setItem(key, preference);
    },
  });
  await waitFor(() => store.getState().hydrated);
  const first = store.getState().setPreference('fr');
  const latest = store.getState().setPreference('fr');
  await Promise.all([first, latest]);
  assert.ok(!store.getState().storageError);
  assert.equal(await storage.getItem('lumo-lens-interface-language'), 'fr');
});

async function settingsNodes(language, storageError, languageStorageError, { preference = 'system', setPreference, platform = 'ios', showLanguagePacksFirst = false } = {}) {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: 'vi', interpolation: { escapeValue: false }, resources: {
    vi: { translation: require('../locales/vi.json') },
    [language]: { translation: require(`../locales/${language}.json`) },
  } });
  const SettingsPanel = createLoader({
    'react-i18next': { useTranslation: () => ({ t: i18n.t, i18n }) },
    'react-native': { Platform: { OS: platform }, ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    '../stores/languageStore': { useLanguageStore: select => select({ preference, setPreference, storageError: languageStorageError }) },
    '../stores/appearanceStore': { useAppearanceStore: select => select({ colorMode: 'light', textSize: 'auto', storageError }) },
    '../stores/serviceStore': { useServiceStore: select => select({ hasOverlayPermission: false }) },
    '../stores/configStore': { useConfigStore: select => select({ serverUrl: '' }) },
    '../stores/modelStore': { useModelStore: select => select({ modelsError: 'Lỗi từ máy chủ', modelsLoading: false }) },
    '../modules/screen-translator': {},
    './StitchIcon': function StitchIcon() { return null; },
    './LanguageFlag': function LanguageFlag() { return null; },
    './LanguagePacksPanel': 'LanguagePacksPanel',
  })('components/SettingsPanel.tsx').default;
  const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  return walk(SettingsPanel({ initialLanguagePack: showLanguagePacksFirst ? 'ar' : undefined }));
}

test('Android settings shows one language pack panel and moves it above appearance when opened from Home', async () => {
  for (const showLanguagePacksFirst of [false, true]) {
    const nodes = await settingsNodes('vi', null, null, { platform: 'android', showLanguagePacksFirst });
    const pack = nodes.findIndex(node => node.type === 'LanguagePacksPanel');
    const appearance = nodes.findIndex(node => node.props?.children === require('../locales/vi.json').settings.appearance);
    assert.equal(nodes.filter(node => node.type === 'LanguagePacksPanel').length, 1);
    assert.equal(pack < appearance, showLanguagePacksFirst);
    assert.equal(nodes[pack].props.initialLanguage, showLanguagePacksFirst ? 'ar' : undefined);
  }
});

test('settings localize the page and server section titles for every interface language', async () => {
  for (const [language, [title, server]] of Object.entries({
    vi: ['Cài đặt hệ thống', 'Địa chỉ server'],
    en: ['System settings', 'Server address'],
    zh: ['系统设置', '服务器地址'],
    ko: ['시스템 설정', '서버 주소'],
    ja: ['システム設定', 'サーバーアドレス'],
    fr: ['Paramètres système', 'Adresse du serveur'],
  })) {
    const nodes = await settingsNodes(language);
    assert.ok(nodes.some(node => node.type === 'Text' && node.props.children === title), language);
    assert.ok(nodes.some(node => node.type === 'Text' && node.props.children === server), language);
  }
});

test('settings show a localized fallback message instead of the write error when loading fails', async () => {
  for (const [language, fallback] of Object.entries({
    vi: /ngôn ngữ của thiết bị/i,
    en: /using the device language/i,
    zh: /使用设备语言/,
    ko: /기기 언어를 사용/,
    ja: /端末の言語を使用/,
    fr: /langue de l’appareil est utilisée/i,
  })) {
    const readTexts = (await settingsNodes(language, null, 'read')).filter(node => node.type === 'Text');
    const writeTexts = (await settingsNodes(language, null, 'write')).filter(node => node.type === 'Text');
    const message = readTexts.find(node => fallback.test(node.props.children));
    assert.ok(message, language);
    assert.notEqual(message.props.allowFontScaling, false, language);
    assert.ok(!writeTexts.some(node => fallback.test(node.props.children)), language);
  }
  const saveMessage = (await settingsNodes('en', null, 'write')).find(node => node.type === 'Text' && /couldn.t save the language/i.test(node.props.children));
  assert.ok(saveMessage);
  assert.notEqual(saveMessage.props.allowFontScaling, false);
});

test('language options expose individual radio labels and support system font scaling', async () => {
  const nodes = await settingsNodes('en');
  const label = nodes.find(node => node.type === 'Text' && node.props.children === 'Interface language');
  assert.ok(label);
  assert.notEqual(label.props.allowFontScaling, false);
  const group = nodes.find(node => node.props.accessibilityRole === 'radiogroup');
  assert.ok(group);
  assert.equal(group.props.accessibilityLabel, undefined);
  assert.notEqual(group.props.accessible, true);
  const options = group.props.children;
  assert.equal(options.length, 6);
  for (const option of options) {
    assert.equal(option.props.accessibilityRole, 'radio');
    assert.equal(option.props.accessibilityState.checked, option.props.accessibilityLabel === 'English');
    const [icon, text] = option.props.children;
    assert.equal(icon.type.name, 'LanguageFlag');
    assert.equal(option.props.accessibilityLabel, text.props.children);
    assert.notEqual(text.props.allowFontScaling, false);
  }
});

test('appearance radios use distinct theme icons and size previews', async () => {
  const groups = (await settingsNodes('en')).filter(node => node.props.accessibilityRole === 'radiogroup');
  const themeOptions = groups[1]?.props.children ?? [];
  const textSizeOptions = groups[2]?.props.children ?? [];
  assert.deepEqual(Array.from(themeOptions, node => node.props.children[0].props.name), ['light_mode', 'dark_mode']);
  assert.equal(textSizeOptions[0].props.children[0].props.name, 'format_size');
  const sizes = Array.from(textSizeOptions.slice(1), node => node.props.children[0].props.size);
  assert.equal(sizes.length, 4);
  assert.ok(sizes.every((size, index) => index === 0 || size > sizes[index - 1]));
});

test('the selected language radio follows the saved preference, not the active translation', async () => {
  const choices = [];
  const nodes = await settingsNodes('fr', null, null, { preference: 'ja', setPreference: option => choices.push(option) });
  const options = nodes.find(node => node.props.accessibilityRole === 'radiogroup').props.children;
  assert.equal(options.find(option => option.props.accessibilityState.checked).props.accessibilityLabel, '日本語');
  options.find(option => option.props.accessibilityLabel === 'English').props.onPress();
  assert.deepEqual(choices, ['en']);
});

test('settings keep connection checks but do not let users enter a server URL', async () => {
  const nodes = await settingsNodes('en');
  const texts = nodes.filter(node => node.type === 'Text').map(node => node.props.children);
  assert.ok(texts.includes('Text size preview'));
  assert.ok(texts.some(text => /screen width.*Android/i.test(text)));
  assert.ok(texts.includes('Check connection'));
  assert.ok(!nodes.some(node => node.type === 'TextInput'));
  assert.ok(!texts.some(text => /10\.0\.2\.2/.test(text)));
  assert.ok(texts.some(text => /Only admin accounts.*AI Models.*ADMIN_KEY/.test(text)));
});

test('settings localize read, save, and model load errors without exposing raw messages outside Vietnamese', async () => {
  const readError = 'Không đọc được giao diện đã lưu. Đang dùng mặc định.';
  const saveError = 'Không lưu được giao diện. Lựa chọn chỉ áp dụng cho lần mở này.';
  const texts = async (language, error) => (await settingsNodes(language, error)).filter(node => node.type === 'Text').map(node => node.props.children);
  const enRead = await texts('en', readError);
  const enSave = await texts('en', saveError);
  assert.ok(enRead.some(text => /couldn.t read.*defaults/i.test(text)));
  assert.ok(enSave.some(text => /couldn.t save.*session/i.test(text)));
  assert.ok(enSave.some(text => /couldn.t load.*models/i.test(text)));
  assert.ok(!enRead.includes(readError));
  assert.ok(!enSave.includes(saveError));
  assert.ok(!enSave.includes('Lỗi từ máy chủ'));
  assert.ok((await texts('vi', readError)).includes(readError));
  const viSave = await texts('vi', saveError);
  assert.ok(viSave.includes(saveError));
  assert.ok(viSave.includes('Lỗi từ máy chủ'));
});
