const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');
const { createInstance } = require('i18next');

const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
const useStore = select => select({ customModels: [], user: { isAdmin: true }, token: 'token', serverUrl: 'http://local' });

async function loadScreens(language, alert = () => {}) {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: 'vi', interpolation: { escapeValue: false }, resources: {
    [language]: { translation: require(`../locales/${language}.json`) },
  } });
  return createLoader({
    'react-i18next': { useTranslation: () => ({ t: i18n.t }) },
    react: { useState: value => [value, () => {}], useEffect() {}, useRef: value => ({ current: value }), useCallback: fn => fn },
    'react-native': { Alert: { alert }, Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' },
    'expo-router': { Stack: { Screen: 'StackScreen' }, useFocusEffect() {} },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../stores/authStore': { useAuthStore: useStore },
    '../stores/configStore': { useConfigStore: useStore },
    '../stores/modelStore': { useModelStore: useStore },
    '../../stores/authStore': { useAuthStore: useStore },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    '../../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    './StitchIcon': () => null,
    '../../assets/logo.png': 'logo',
    '../../components/StitchIcon': () => null,
    '../../components/PersonGlyph': () => null,
    '../../components/HomePanel': () => null,
    '../../components/AccountPanel': () => null,
    '../../components/SettingsPanel': () => null,
    '../../components/ModelsPanel': () => null,
  });
}

test('tab labels follow the interface language without losing the admin tab', async () => {
  for (const [language, labels] of Object.entries({
    vi: ['Trang chủ', 'Model AI', 'Cài đặt', 'Tài khoản'],
    en: ['Home', 'AI Models', 'Settings', 'Account'],
    zh: ['首页', 'AI 模型', '设置', '账户'],
    ko: ['홈', 'AI 모델', '설정', '계정'],
    ja: ['ホーム', 'AIモデル', '設定', 'アカウント'],
    fr: ['Accueil', 'Modèles IA', 'Paramètres', 'Compte'],
  })) {
    const load = await loadScreens(language);
    const Layout = load('app/(tabs)/_layout.tsx').default;
    const tabs = walk(Layout()).filter(node => node.props?.accessibilityRole === 'tab');
    assert.deepEqual(tabs.map(tab => walk(tab).find(node => node.type === 'Text').props.children), labels);
  }
});

test('model form localizes the accessible description and validation alerts', async () => {
  const alerts = [];
  const load = await loadScreens('ko', (...args) => alerts.push(args));
  const { ModelForm } = load('components/ModelForm.tsx');
  const nodes = walk(ModelForm({ id: 'new', onClose() {}, saving: false, onSavingChange() {} }));
  const [verifyButton, , saveButton] = nodes.filter(node => node.type === 'Pressable');
  assert.equal(walk(verifyButton).find(node => node.type === 'Text').props.children, '연결 테스트');
  assert.ok(nodes.some(node => node.type === 'TextInput' && node.props.accessibilityLabel === '모델 설명'));
  saveButton.props.onPress();
  assert.deepEqual(alerts[0], ['정보가 부족합니다', '표시 이름과 모델 ID를 입력하세요.']);
});
