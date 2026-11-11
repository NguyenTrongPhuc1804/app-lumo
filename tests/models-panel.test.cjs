const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('expanding/collapsing remains separate from selecting and errors stay visible', () => {
  let state = ['', null];
  let cursor = 0;
  const calls = [];
  const settings = { model: 'one', customModels: [{ id: '1', code: 'one', name: 'One', description: 'First' }, { id: '2', code: 'two', name: 'Two' }], deletingIds: [], adminModelsError: 'ADMIN_KEY không hợp lệ', setModel: (code) => calls.push(code) };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/ModelsPanel.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (name === 'react') return { useCallback: (f) => f, useState: () => { const i = cursor++; return [state[i], (value) => { state[i] = value; }]; } };
    if (name === 'expo-router') return { useFocusEffect: () => {} };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput' };
    if (name === '../lib/settings') return { useSettings: () => settings };
    if (name === '../lib/appearance') return { useAppearance: () => ({ styles: {} }) };
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
});
