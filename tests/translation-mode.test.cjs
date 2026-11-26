const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createInstance } = require('i18next');

test('HomePanel selects Manga and starts with selected mode', async () => {
  const settings = { translationMode: 'game', model: 'test', modelList: [{ code: 'test', label: 'Model AI thử nghiệm' }], serverUrl: 'http://local', sourceLang: 'en', targetLang: 'vi', hasOverlayPermission: true };
  settings.token = 'test-token';
  settings.user = { isAdmin: true };
  settings.setTranslationMode = value => settings.translationMode = value;
  settings.setRunning = value => settings.running = value;
  let started;
  let guestRemaining = 2;
  let guestRequests = 0;
  let modelReloads = 0;
  settings.reloadModels = async () => { modelReloads++; };
  let prompt;
  let openPacks = 0;
  let openedLanguage;
  let platform = 'ios';
  let downloaded = [];
  let offlineRemaining = 0;
  let offlineError = false;
  let reloadedMe = 0;
  const reservations = [];
  settings.reloadMe = async () => { reloadedMe++; };
  let packState = null;
  let stateIndex = 0;
  let picker = null;
  const i18n = createInstance();
  await i18n.init({ lng: 'vi', fallbackLng: 'vi', interpolation: { escapeValue: false }, resources: {
    vi: { translation: require('../locales/vi.json') },
    fr: { translation: require('../locales/fr.json') },
  } });
  const { createLoader } = require('./helpers/load-ts.cjs');
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../components/HomePanel.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return { useEffect() {}, useCallback: fn => fn, useRef: current => ({ current }), useState(value) {
      const index = stateIndex++;
      if (index === 0) return [picker, next => { picker = next; }];
      if (index === 3) return [packState, () => {}];
      return [value, () => {}];
    } };
    if (name === 'expo-router') return { router: { push() {} } };
    if (name === 'react-native') return { Platform: { get OS() { return platform; } }, Pressable: 'Pressable', RefreshControl: 'RefreshControl', ScrollView: 'ScrollView', View: 'View', Text: 'Text', Alert: { alert: (...args) => { prompt = args; } } };
    if (name === 'react-native-reanimated') return { __esModule: true, default: { createAnimatedComponent: () => 'AnimatedButton' }, useSharedValue: value => ({ value }), useAnimatedStyle: () => ({}) };
    if (name === '../stores/configStore') return { useConfigStore: Object.assign((select) => select(settings), { getState: () => settings }) };
    if (name === '../stores/authStore') return { useAuthStore: Object.assign((select) => select(settings), { getState: () => settings }) };
    if (name === '../stores/modelStore') return { useModelStore: (select) => select(settings) };
    if (name === '../stores/serviceStore') return { useServiceStore: (select) => select(settings) };
    if (name === '../hooks/useTheme') return { useTheme: () => ({ styles: {}, ACCENT: 'green', TEXT_DIM: 'gray' }) };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: i18n.t }) };
    if (name === '../lib/main-interface-labels') return createLoader()('lib/main-interface-labels.ts');
    if (name === '../lib/translation-languages') return createLoader()('lib/translation-languages.ts');
    if (name === './TranslationLanguagePicker') return { __esModule: true, default: 'LanguagePicker' };
    if (name === '../lib/api') return { LANGS: [], fetchGuestQuota: async () => { guestRequests++; return { remaining: guestRemaining, freeLimit: 100 }; }, startTranslator: async config => { started = config; return true; } };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'Gradient' };
    if (name === '../modules/screen-translator') return { __esModule: true, default: {
      getDownloadedLanguagePacks: async () => downloaded,
      getOfflineTranslationRemaining: async () => offlineRemaining,
      prepareOfflineTranslation: async (...args) => {
        reservations.push(args);
        if (offlineError) throw new Error('Không có mạng');
        return true;
      },
    } };
    if (name === './StitchIcon') return { default: {} };
    return require(name);
  } });
  const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  const render = () => {
    stateIndex = 0;
    return walk(exports.default({ onOpenLanguagePacks(code) { openPacks++; openedLanguage = code; } }));
  };
  render().find(node => node.props?.accessibilityLabel === 'Chọn bộ dịch').props.onPress();
  assert.ok(render().some(node => node.props?.accessibilityLabel === 'Google Dịch (trên thiết bị)'));
  assert.ok(render().some(node => node.props?.accessibilityLabel === 'Model AI thử nghiệm'));
  picker = null;
  const radios = render().filter(node => node.props?.accessibilityRole === 'radio' && node.props?.accessibilityState?.checked !== undefined);
  const modelBox = render().find(node => node.type === 'View' && Array.isArray(node.props?.children) && node.props.children.some(child => child?.props?.accessibilityLabel === 'Chọn bộ dịch'));
  assert.ok(modelBox);
  assert.equal(walk(modelBox).filter(node => node.props?.accessibilityRole === 'radio').length, 2);
  assert.equal(radios.length, 2);
  assert.equal(radios[0].props.accessibilityState.checked, true);
  radios[1].props.onPress();
  assert.equal(settings.translationMode, 'manga');
  const selected = render().filter(node => node.props?.accessibilityRole === 'radio' && node.props?.accessibilityState?.checked !== undefined);
  assert.equal(selected[1].props.accessibilityState.checked, true);
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(started.mode, 'manga');
  assert.equal(started.allowAutomatic, true);
  assert.equal(settings.running, true);

  settings.token = null;
  settings.running = false;
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(started.token, '');
  assert.equal(started.model, 'ml-kit');
  assert.equal(settings.running, true);
  settings.running = false;
  guestRemaining = 0;
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(settings.running, false);
  assert.equal(prompt[0], 'Đã hết lượt dùng thử');
  assert.match(prompt[1], /100 lượt/);

  await i18n.changeLanguage('fr');
  settings.token = 'test-token';
  settings.user = { isAdmin: true };
  settings.modelList = [{ code: 'google/gemini-flash-lite', label: 'Gemini Flash-Lite (nhanh)' }];
  settings.model = 'google/gemini-flash-lite';
  assert.ok(render().some(node => node.props?.children === 'Gemini Flash-Lite (rapide)'));
  settings.modelList[0].label = 'Custom Flash <lite>';
  assert.ok(render().some(node => node.props?.children === 'Custom Flash <lite>'));
  settings.token = null;
  assert.ok(render().some(node => node.props?.children === 'Anglais'));
  assert.ok(render().some(node => node.props?.children === 'Vietnamien'));
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(prompt[0], 'Essai gratuit épuisé');
  assert.equal(prompt[1], 'Connectez-vous pour bénéficier de 100 traductions gratuites par jour.');
  guestRemaining = 1;
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.deepEqual([started.sourceLang, started.targetLang, started.mode], ['en', 'vi', 'game']);
  await i18n.changeLanguage('vi');
  platform = 'android';
  packState = [];
  settings.running = false;
  assert.equal(render().some(node => node.props?.children === 'Chuẩn bị dịch ngoại tuyến'), false);
  const reminder = render().find(node => node.props?.accessibilityRole === 'button' && walk(node).some(child => child.props?.accessibilityLiveRegion === 'polite'));
  assert.ok(walk(reminder).some(node => node.props?.children === 'Chưa tải gói: Tiếng Việt'));
  assert.ok(walk(reminder).some(node => node.props?.children === 'Cài đặt → Gói ngôn ngữ → Tải xuống'));
  reminder.props.onPress();
  assert.equal(openPacks, 1);
  assert.equal(openedLanguage, 'vi');
  const languageButtons = render().filter(node => node.type === 'Pressable' && node.props?.accessibilityRole === 'button' && walk(node).some(child => child.props?.children === 'Tiếng Việt' || child.props?.children === 'Tiếng Anh'));
  assert.equal(languageButtons.length, 2);
  languageButtons[0].props.onPress();
  assert.equal(render().find(node => node.type === 'LanguagePicker').props.codes.includes('ar'), false);
  languageButtons[1].props.onPress();
  assert.equal(render().find(node => node.type === 'LanguagePicker').props.codes.includes('ar'), true);
  picker = null;
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(settings.running, false);
  prompt[2][1].onPress();
  assert.equal(openPacks, 2);
  assert.equal(openedLanguage, 'vi');
  settings.targetLang = 'ar';
  downloaded = packState = ['vi'];
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(settings.running, false);
  prompt[2][1].onPress();
  assert.equal(openedLanguage, 'ar');
  settings.targetLang = 'vi';
  assert.equal(render().some(node => node.props?.accessibilityLiveRegion === 'polite'), false);
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.equal(settings.running, true);

  settings.running = false;
  settings.modelList[0].sharedAi = true;
  downloaded = packState = [];
  render().find(node => node.props?.accessibilityLabel === 'Chọn bộ dịch').props.onPress();
  assert.equal(render().find(node => node.props?.accessibilityLabel === 'Custom Flash <lite>').props.disabled, false);
  picker = null;
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.deepEqual([started.token, started.model, started.mode], ['', settings.model, 'game']);
  settings.token = 'free-token';
  settings.user = {};
  settings.running = false;
  await render().find(node => node.type === 'AnimatedButton').props.onPress();
  assert.deepEqual([started.token, started.model, started.mode, started.allowAutomatic], ['free-token', settings.model, 'game', false]);
  assert.equal(reservations.length, 0);

  settings.model = 'ml-kit';
  settings.user = { dailyLimit: 10, usageCount: 8 };
  settings.running = false;
  downloaded = ['vi'];
  const startBasic = async () => {
    await render().find(node => node.type === 'AnimatedButton').props.onPress();
    await new Promise(resolve => setImmediate(resolve));
  };
  await startBasic();
  assert.equal(settings.running, true);
  assert.deepEqual(reservations, [['http://local', 'free-token', 2]]);
  assert.equal(reloadedMe, 1);

  settings.running = false;
  offlineRemaining = 1;
  await startBasic();
  assert.equal(reservations.length, 1);

  settings.running = false;
  offlineRemaining = 0;
  offlineError = true;
  settings.user.usageCount = 0;
  prompt = undefined;
  await startBasic();
  assert.deepEqual(reservations[1], ['http://local', 'free-token', 3]);
  assert.equal(settings.running, true);
  assert.equal(prompt, undefined);
  assert.equal(reloadedMe, 1);

  await render().find(node => node.props?.refreshControl).props.refreshControl.props.onRefresh();
  assert.equal(reloadedMe, 2);
  assert.equal(modelReloads, 1);
  assert.equal(settings.running, true);
  settings.token = null;
  const previousGuestRequests = guestRequests;
  await render().find(node => node.props?.refreshControl).props.refreshControl.props.onRefresh();
  assert.equal(guestRequests, previousGuestRequests + 1);
  assert.equal(reloadedMe, 2);
  assert.equal(modelReloads, 2);
});
