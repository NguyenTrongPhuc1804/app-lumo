const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createInstance } = require('i18next');

test('expanding/collapsing remains separate from selecting and errors stay visible', async () => {
  let state = ['', null];
  let cursor = 0;
  const calls = [];
  const i18n = createInstance();
  await i18n.init({ lng: 'vi', fallbackLng: 'vi', interpolation: { escapeValue: false }, resources: {
    vi: { translation: require('../locales/vi.json') },
    ja: { translation: require('../locales/ja.json') },
  } });
  const { createLoader } = require('./helpers/load-ts.cjs');
  const settings = { model: 'one', customModels: [{ id: '1', code: 'one', name: 'One', description: 'First' }, { id: '2', code: 'two', name: 'Two' }], deletingIds: [], adminModelsError: 'Tài khoản không có quyền quản lý model', setModel: (code) => calls.push(code) };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/ModelsPanel.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (name === 'react') return { useCallback: (f) => f, useState: () => { const i = cursor++; return [state[i], (value) => { state[i] = value; }]; } };
    if (name === 'expo-router') return { useFocusEffect: () => {} };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput' };
    if (name === '../stores/configStore') return { useConfigStore: (select) => select(settings) };
    if (name === '../stores/modelStore') return { useModelStore: (select) => select(settings) };
    if (name === '../hooks/useTheme') return { useTheme: () => ({ styles: {} }) };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: i18n.t }) };
    if (name === '../lib/main-interface-labels') return createLoader()('lib/main-interface-labels.ts');
    if (name === '../lib/model-search') return { filterModels: (models, query) => models.filter((m) => m.name.includes(query)) };
    if (name === './StitchIcon') return { default: () => null };
    return require(name);
  } });
  const render = () => { cursor = 0; return exports.default({ onOpenForm: () => {} }); };
  const walk = (node, predicate) => {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap((n) => walk(n, predicate));
    return [...(predicate(node) ? [node] : []), ...walk(node.props?.children, predicate)];
  };
  const find = (label) => walk(render(), (n) => n.props?.accessibilityLabel === label)[0];
  assert.ok(find('Thu gọn One'));
  find('Thu gọn One').props.onPress();
  assert.ok(find('Xem chi tiết One'));
  assert.ok(find('Xem chi tiết One')); // repeated render does not reopen
  find('Xem chi tiết Two').props.onPress();
  assert.ok(find('Thu gọn Two'));
  assert.equal(calls.length, 0);
  find('Dùng Two').props.onPress();
  assert.deepEqual(calls, ['two']);
  assert.ok(walk(render(), (n) => n.props?.children === settings.adminModelsError).length);

  await i18n.changeLanguage('ja');
  assert.ok(walk(render(), (n) => n.props?.children === settings.adminModelsError).length);
  settings.adminModelsError = 'Không tải được model: HTTP 503';
  assert.ok(walk(render(), (n) => n.props?.children === 'モデルを読み込めませんでした：HTTP 503').length);
  assert.ok(find('AIモデルを検索'));
  assert.ok(find('Twoを折りたたむ'));
  assert.ok(find('Twoを使用'));
  assert.ok(walk(render(), (n) => n.props?.children === 'Two').length);
});
