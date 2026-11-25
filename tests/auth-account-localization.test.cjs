const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createInstance } = require('i18next');
const { createLoader } = require('./helpers/load-ts.cjs');

const locales = ['vi', 'en', 'zh', 'ko', 'ja', 'fr'];

async function translationFor(language) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: false,
    resources: { [language]: { translation: require(`../locales/${language}.json`) } },
    interpolation: { escapeValue: false },
  });
  return { useTranslation: () => ({ t: i18n.t, i18n }) };
}

test('the authentication, account, and Pro catalogs provide translations in all six languages', async () => {
  const english = require('../locales/en.json');
  const welcomeTitles = new Set();
  const deleteTitles = new Set();
  for (const language of locales) {
    const catalog = require(`../locales/${language}.json`);
    const { t } = (await translationFor(language)).useTranslation();
    for (const section of ['auth', 'account', 'pro']) {
      const regularKeys = (entries) => Object.keys(entries)
        .filter((key) => !/^(coinBalance|proMonthlyCoins)(_|$)/.test(key)).sort();
      assert.deepEqual(regularKeys(catalog[section]), regularKeys(english[section]), `${language}: ${section}`);
      for (const [key, value] of Object.entries(catalog[section])) {
        if (key !== 'loginPerks') assert.ok(value.trim(), `${language}: ${section}.${key}`);
      }
    }
    const perks = t('auth.loginPerks', { returnObjects: true });
    assert.equal(perks.length, 3);
    assert.ok(perks.every((perk) => perk.trim()));
    assert.ok(t('account.lumoId', { id: '#42-LENS' }).includes('#42-LENS'));
    assert.ok(t('pro.proUpgrade', { price: '¥1,200' }).includes('¥1,200'));
    for (const key of ['account.coinBalance', 'pro.proMonthlyCoins']) {
      const pluralKeys = language === 'en' || language === 'fr' ? ['one', 'other'] : ['other'];
      for (const pluralKey of pluralKeys) assert.ok(t(`${key}_${pluralKey}`, { amount: '7' }).includes('7'));
      assert.ok(t(key, { count: 7, amount: '7' }).includes('7'));
    }
    welcomeTitles.add(t('auth.welcomeTitle'));
    deleteTitles.add(t('account.deleteTitle'));
  }
  assert.equal(welcomeTitles.size, locales.length);
  assert.equal(deleteTitles.size, locales.length);
});

test('Chinese login localizes legal link labels without changing the destination', async () => {
  const opened = [];
  const { default: LoginScreen } = createLoader({
    react: { useEffect: () => {}, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    'react-native': { Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-router': { router: {}, useLocalSearchParams: () => ({ error: 'google_failed' }) },
    'expo-web-browser': { openBrowserAsync: async (url) => opened.push(url) },
    '../assets/logo.png': 'logo',
    'react-i18next': await translationFor('zh'),
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    '../stores/authStore': { useAuthStore: (select) => select({}) },
    '../stores/configStore': { useConfigStore: (select) => select({ serverUrl: 'https://lumo.test/' }) },
    '../components/StitchIcon': { __esModule: true, default: () => null },
    '../components/BrandMarks': { GoogleMark: () => null, FacebookMark: () => null, FingerprintMark: () => null },
  })('app/login.tsx');
  const children = LoginScreen().props.children;
  const status = children[2].props.children;
  assert.equal(status.props.children, '无法使用 Google 登录，请重试。');
  const perks = children[5].props.children[1];
  assert.equal(perks.length, 3);
  assert.equal(perks[0].props.children[1].props.children, '在所有设备间同步模型设置和翻译额度');
  const links = children[6].props.children[1].props.children;
  assert.equal(links[0].props.accessibilityLabel, '打开使用条款');
  assert.equal(links[2].props.accessibilityLabel, '打开隐私政策');
  await links[0].props.onPress();
  await links[2].props.onPress();
  assert.deepEqual(opened, ['https://lumo.test/legal/terms.html', 'https://lumo.test/legal/privacy.html']);
});

test('the callback displays localized errors and passes the original code to login', async () => {
  const translation = await translationFor('en');
  let error;
  const navigations = [];
  const { default: AuthCallbackScreen } = createLoader({
    react: { useEffect: (effect) => effect(), useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    'react-native': { View: 'View', Text: 'Text', ActivityIndicator: 'Spinner' },
    'expo-router': {
      router: { replace: (route) => navigations.push(route) },
      useLocalSearchParams: () => ({ error }),
    },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    'react-i18next': translation,
    '../stores/authStore': { useAuthStore: (select) => select({ completeLogin: () => assert.fail('no token') }) },
  })('app/auth.tsx');
  for (const [code, expected] of [
    ['google_denied', 'You cancelled Google sign-in. Try again when you’re ready.'],
    ['account_blocked', 'Your account is locked. Contact an administrator.'],
    ['google_failed', 'Could not sign in with Google. Please try again.'],
    ['unknown_error', 'Sign-in failed. Please try again.'],
  ]) {
    error = code;
    const status = AuthCallbackScreen().props.children[1];
    assert.equal(status.props.children, expected);
    assert.equal(status.props.accessibilityLiveRegion, 'polite');
    assert.equal(navigations.at(-1).pathname, '/login');
    assert.equal(navigations.at(-1).params.error, code);
  }
});

test('the Korean Pro panel keeps the Play price and localizes the billing end date', async () => {
  const { default: PlayProPanel } = createLoader({
    react: { useEffect: () => {}, useState: (value) => [value, () => {}] },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'expo-iap': { useIAP: () => ({ subscriptions: [{ id: 'pro', platform: 'android', subscriptionOffers: [{ basePlanIdAndroid: 'monthly', offerTokenAndroid: 'offer', displayPrice: '₩3,000' }] }] }) },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    'react-i18next': await translationFor('ko'),
    '../lib/api': {},
    '../stores/authStore': {},
    '../stores/configStore': {},
  })('components/PlayProPanel.tsx');
  const user = { playPro: { productId: 'pro', basePlanId: 'monthly', monthlyCoins: 2000 } };
  const purchaseChildren = PlayProPanel({ user }).props.children;
  assert.match(purchaseChildren[1].props.children, /2,000코인/);
  assert.equal(purchaseChildren[4].props.children.props.children, '업그레이드 · 월 ₩3,000');
  const expiry = '2026-11-23T12:00:00Z';
  const activeChildren = PlayProPanel({ user: { ...user, proExpiresAt: expiry } }).props.children;
  const localDate = new Date(expiry).toLocaleDateString('ko');
  assert.equal(activeChildren[2].props.children, `현재 결제 주기는 ${localDate}에 종료됩니다.`);
  assert.equal(activeChildren[4], false);
});

test('French account deletion localizes accessibility and confirmation while preserving server details', async () => {
  const alerts = [];
  const state = {
    user: { id: 'u1', name: '', email: '', isAdmin: true, plan: 'pro', dailyLimit: 0, usageCount: 0, coinPaymentsEnabled: true, coinBalance: 0 },
    deleteAccount: async () => 'Server diagnostic',
  };
  const { default: AccountPanel } = createLoader({
    react: { lazy: () => () => null, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', Alert: { alert: (...args) => alerts.push(args) } },
    '../stores/authStore': { useAuthStore: (select) => select(state) },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    'react-i18next': await translationFor('fr'),
    './StitchIcon': { __esModule: true, default: () => null },
    './BrandMarks': { GoogleMark: () => null },
  })('components/AccountPanel.tsx');
  const nodes = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    nodes.push(node);
    walk(node.props?.children);
  };
  walk(AccountPanel({ onOpenModels() {} }));
  assert.ok(nodes.some((node) => node.props?.children === 'ID LUMO : #1-LENS'));
  assert.ok(nodes.some((node) => node.props?.children === '0 pièce'));
  state.user.coinBalance = 1200;
  nodes.length = 0;
  walk(AccountPanel({ onOpenModels() {} }));
  assert.ok(nodes.some((node) => node.props?.children === `${(1200).toLocaleString('fr')} pièces`));
  const button = nodes.find((node) => node.props?.accessibilityLabel === 'Supprimer définitivement le compte');
  assert.ok(button);
  button.props.onPress();
  assert.equal(alerts[0][0], 'Supprimer définitivement le compte ?');
  assert.match(alerts[0][1], /minuit, heure du Vietnam/);
  assert.match(alerts[0][1], /droits d’administration/);
  await alerts[0][2][1].onPress();
  assert.equal(alerts[1][0], 'Impossible de supprimer le compte');
  assert.equal(alerts[1][1], 'Server diagnostic');
});
