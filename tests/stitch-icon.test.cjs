const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('StitchIcon renders a local glyph with fixed metrics and hides decorative icons from accessibility', () => {
  const file = path.join(__dirname, '../components/StitchIcon.tsx');
  assert.ok(fs.existsSync(file), 'StitchIcon component is missing');
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => name === 'react-native' ? { Text: 'Text' } : name === '../lib/theme' ? { TEXT: '#0F172A' } : require(name) });
  const icon = exports.default({ name: 'explore', size: 24, color: '#059669' });
  assert.equal(icon.props.children, '\ue87a');
  assert.equal(icon.props.style.fontFamily, 'MaterialSymbolsOutlined');
  assert.equal(icon.props.style.fontSize, 24);
  assert.equal(icon.props.style.color, '#059669');
  assert.equal(icon.props.allowFontScaling, false);
  assert.equal(icon.props.accessible, false);
  assert.equal(icon.props.importantForAccessibility, 'no');
  assert.equal(exports.default({ name: 'crop_free' }).props.children, '\ue3c2');
  assert.equal(exports.default({ name: 'play_arrow' }).props.children, '\ue037');
});
