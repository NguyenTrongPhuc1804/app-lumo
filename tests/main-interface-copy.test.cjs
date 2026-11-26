const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');
const { createInstance } = require('i18next');

const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
const useStore = select => select({ user: { isAdmin: true }, token: 'token', serverUrl: 'http://local' });

async function loadScreens(language, alert = () => {}, { tab = 'home', reloadMe, reloadModels, setRefreshing = () => {} } = {}) {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: 'vi', interpolation: { escapeValue: false }, resources: {
    [language]: { translation: require(`../locales/${language}.json`) },
  } });
  return createLoader({
    'react-i18next': { useTranslation: () => ({ t: i18n.t }) },
    react: { useState: value => value === 'home' ? [tab, () => {}] : [value, value === false ? setRefreshing : () => {}], useEffect() {}, useRef: value => ({ current: value }), useCallback: fn => fn },
    'react-native': { Alert: { alert }, Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', RefreshControl: 'RefreshControl', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' },
    'expo-router': { Stack: { Screen: 'StackScreen' }, useFocusEffect() {} },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../stores/authStore': { useAuthStore: useStore },
    '../stores/configStore': { useConfigStore: useStore },
    '../stores/modelStore': { useModelStore: useStore },
    '../../stores/authStore': { useAuthStore: select => select({ token: 'token', reloadMe }) },
    '../../stores/modelStore': { useModelStore: select => select({ reloadModels }) },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    '../../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    './StitchIcon': () => null,
    '../../assets/logo.png': 'logo',
    '../../components/StitchIcon': () => null,
    '../../components/PersonGlyph': () => null,
    '../../components/HomePanel': () => null,
    '../../components/AccountPanel': () => null,
    '../../components/SettingsPanel': () => null,
  });
}

test('kéo làm mới mỗi tab tải đúng dữ liệu và dừng vòng xoay kể cả khi lỗi', async () => {
  for (const [tab, expected] of [['account', ['me']], ['settings', ['models']]]) {
    const calls = [];
    const loading = [];
    const load = await loadScreens('vi', undefined, {
      tab,
      reloadModels: async () => { calls.push('models'); },
      reloadMe: async () => { calls.push('me'); throw new Error('offline'); },
      setRefreshing: value => loading.push(value),
    });
    const nodes = walk(load('app/(tabs)/_layout.tsx').default());
    const control = nodes.find(node => node.props?.refreshControl)?.props.refreshControl;
    assert.equal(control?.type, 'RefreshControl', tab);
    await control.props.onRefresh();
    assert.deepEqual(calls.sort(), expected.sort(), tab);
    assert.deepEqual(loading, [true, false], tab);
  }
});

test('admin chỉ thấy ba tab, với nhãn theo ngôn ngữ giao diện', async () => {
  for (const [language, labels] of Object.entries({
    vi: ['Trang chủ', 'Cài đặt', 'Tài khoản'],
    en: ['Home', 'Settings', 'Account'],
    zh: ['首页', '设置', '账户'],
    ko: ['홈', '설정', '계정'],
    ja: ['ホーム', '設定', 'アカウント'],
    fr: ['Accueil', 'Paramètres', 'Compte'],
  })) {
    const load = await loadScreens(language);
    const Layout = load('app/(tabs)/_layout.tsx').default;
    const tabs = walk(Layout()).filter(node => node.props?.accessibilityRole === 'tab');
    assert.deepEqual(tabs.map(tab => walk(tab).find(node => node.type === 'Text').props.children), labels);
  }
});