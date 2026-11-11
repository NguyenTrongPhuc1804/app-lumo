const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load() {
  const file = path.join(__dirname, '../lib/appearance-options.ts');
  assert.ok(fs.existsSync(file), 'appearance options must exist');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  return exports;
}
test('appearance defaults and invalid stored values recover safely', () => {
  const { parseAppearance } = load();
  for (const value of [null, 'broken', '{}', 'null', '{"colorMode":"unknown","textSize":"huge"}']) {
    assert.equal(parseAppearance(value).colorMode, 'light');
    assert.equal(parseAppearance(value).textSize, 'auto');
  }
  assert.equal(parseAppearance('{"colorMode":"dark","textSize":"large"}').textSize, 'large');
});
test('themes keep contrast tokens, scale text and stack narrow tiles', () => {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../lib/theme.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => ({ StyleSheet: { create: (value) => value } }) });
  const light = exports.createTheme(false, 1, 390);
  const dark = exports.createTheme(true, 1.15, 600);
  assert.equal(light.BACKGROUND, '#F8FAFC');
  assert.equal(light.styles.actionBtnAccent.backgroundColor, '#047857');
  assert.equal(dark.styles.container.backgroundColor, '#0F172A');
  assert.equal(dark.styles.input.backgroundColor, '#1E293B');
  assert.equal(dark.styles.sectionTitle.color, dark.TEXT);
  assert.equal(dark.styles.pageTitle.fontSize, 28);
  assert.equal(dark.styles.pageTitle.lineHeight, 37);
  assert.equal(light.styles.bentoTile.flexBasis, '100%');
  assert.equal(dark.styles.bentoTile.flexBasis, 200);
  assert.equal(dark.styles.actionBtn.minHeight, 48);
});

test('auto size is bounded and manual sizes ignore screen width', () => {
  const { getTextScale } = load();
  assert.equal(getTextScale('auto', 320), 0.9);
  assert.equal(getTextScale('auto', 390), 1);
  assert.equal(getTextScale('auto', 900), 1);
  assert.equal(getTextScale('tiny', 320), 0.8);
  assert.equal(getTextScale('tiny', 900), 0.8);
  assert.equal(load().parseAppearance('{"textSize":"tiny"}').textSize, 'tiny');
  assert.equal(getTextScale('small', 900), 0.9);
  assert.equal(getTextScale('normal', 320), 1);
  assert.equal(getTextScale('large', 320), 1.15);
});
