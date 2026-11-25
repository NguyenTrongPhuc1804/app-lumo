const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createInstance } = require('i18next');
const { createLoader } = require('./helpers/load-ts.cjs');

test('account deletion confirms, blocks repeated taps, and allows retry after failure', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'vi', resources: { vi: { translation: require('../locales/vi.json') } } });
  const alerts = [];
  let calls = 0;
  let resolve;
  const state = {
    user: { id: 'u1', name: 'A', email: 'a@x.com', dailyLimit: 100, usageCount: 1 },
    deleteAccount: () => { calls++; return new Promise((done) => { resolve = done; }); },
  };
  const { default: AccountPanel } = createLoader({
    react: { lazy: () => () => null, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', ActivityIndicator: 'Spinner', Alert: { alert: (...args) => alerts.push(args) } },
    '../stores/authStore': { useAuthStore: (select) => select(state) },
    '../hooks/useTheme': { useTheme: () => ({ styles: {} }) },
    'react-i18next': { useTranslation: () => ({ t: i18n.t, i18n }) },
    './StitchIcon': { __esModule: true, default: () => null },
    './BrandMarks': { GoogleMark: () => null },
  }, { process: { env: {} } })('components/AccountPanel.tsx');
  const nodes = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    nodes.push(node);
    walk(node.props?.children);
  };
  walk(AccountPanel({ onOpenModels() {} }));
  const button = nodes.find((node) => node.props?.accessibilityLabel === 'Xoá tài khoản vĩnh viễn');
  assert.ok(button);
  button.props.onPress();
  button.props.onPress();
  assert.equal(alerts.length, 1);
  alerts[0][2][0].onPress();
  assert.equal(calls, 0);
  button.props.onPress();
  const confirm = alerts[1][2][1].onPress;
  const pending = confirm();
  await confirm();
  button.props.onPress();
  assert.equal(calls, 1);
  assert.equal(alerts.length, 2);
  resolve('Mạng lỗi');
  await pending;
  assert.equal(alerts[2][0], 'Không xoá được tài khoản');
  button.props.onPress();
  assert.equal(alerts.length, 4);
});
