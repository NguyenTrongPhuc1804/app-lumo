const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTheme() {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/theme.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => {
    if (name === 'react-native') return { StyleSheet: { create: value => value } };
    return require(name);
  } });
  return exports.createTheme;
}

test('model picker theme provides a bottom sheet layout with touch-sized options', () => {
  const { styles } = loadTheme()(false, 1, 390);
  assert.equal(styles.sheetBackdrop.justifyContent, 'flex-end');
  assert.equal(styles.modelSheet.borderTopLeftRadius, 32);
  assert.equal(styles.sheetHandle.width, 48);
  assert.ok(styles.modelPickerItem.minHeight >= 48);
  assert.ok(styles.sheetClose.minHeight >= 48);
  assert.equal(styles.modelPickerList.maxHeight, 360);
});

// Nut dong dung ky tu "x" nen phai co line height co dinh, tat font padding
// va khong bi theme co nho (flexShrink) de khong bi lech goc duoi-phai.
test('sheet close glyph is centred and does not shrink', () => {
  const { styles } = loadTheme()(false, 1, 390);
  assert.ok(styles.sheetCloseText, 'sheetCloseText style must exist');
  assert.equal(styles.sheetCloseText.includeFontPadding, false);
  assert.equal(styles.sheetCloseText.textAlign, 'center');
  assert.equal(styles.sheetCloseText.flexShrink, 0);
  assert.equal(styles.sheetCloseText.fontSize, styles.sheetCloseText.lineHeight);
  assert.ok(styles.sheetCloseText.fontSize >= 22);
});
