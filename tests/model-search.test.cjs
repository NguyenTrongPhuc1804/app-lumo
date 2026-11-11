const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
test('model search matches name, code, Vietnamese description without changing input', () => {
  const file = path.join(__dirname, '../lib/model-search.ts');
  assert.ok(fs.existsSync(file), 'search helper exists');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  const models = [{ name: 'Gemini', code: 'google/flash', description: 'Dịch truyện tiếng Việt' }, { name: 'Local', code: 'ollama' }];
  assert.equal(exports.filterModels(models, ' FLASH ')[0], models[0]);
  assert.equal(exports.filterModels(models, 'tiếng Việt')[0], models[0]);
  assert.equal(exports.filterModels(models, 'local')[0], models[1]);
  assert.equal(exports.filterModels(models, 'nothing').length, 0);
  assert.equal(exports.filterModels(models, '').length, 2);
  assert.equal(models.length, 2);
});
