const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function theme() {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/theme.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: () => ({ StyleSheet: { create: value => value } }) });
  return exports.createTheme(false, 1, 390).styles;
}

test('model management and form theme supports Stitch-style cards and large controls', () => {
  const styles = theme();
  assert.ok(styles.modelCardItem.borderRadius >= 16);
  assert.ok(styles.modelSearch.minHeight >= 48);
  assert.ok(styles.modelActionsRow);
  assert.ok(styles.modelFormGroup.padding >= 12);
  assert.ok(styles.input.minHeight >= 48);
  assert.ok(styles.verifyBtn.minHeight >= 48);
  assert.ok(styles.saveBtn.minHeight >= 48);
});
