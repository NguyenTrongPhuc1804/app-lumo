const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const originalFetch = global.fetch;
const moduleObject = { exports: {} };
vm.runInNewContext(compiled, {
  exports: moduleObject.exports,
  require: () => ({ default: {} }),
  process,
  fetch: (...args) => global.fetch(...args),
});
const api = moduleObject.exports;
afterEach(() => { global.fetch = originalFetch; });

test('admin list HTTP errors are not reported as an empty list', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: 'Server unavailable' }), { status: 500 });
  await assert.rejects(api.fetchAdminModels('http://localhost', 'key'), /Server unavailable/);
});

test('unauthorized admin request reports an actionable error', async () => {
  global.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(api.fetchAdminModels('http://localhost', 'key'), /ADMIN_KEY/);
});

test('network errors are not reported as an empty admin list', async () => {
  global.fetch = async () => { throw new Error('Network down'); };
  await assert.rejects(api.fetchAdminModels('http://localhost', 'key'), /Network down/);
});

test('a successful empty admin list remains a valid result', async () => {
  global.fetch = async () => new Response('[]');
  assert.equal((await api.fetchAdminModels('http://localhost', 'key')).length, 0);
});

test('invalid admin response is rejected', async () => {
  global.fetch = async () => new Response('{}');
  await assert.rejects(api.fetchAdminModels('http://localhost', 'key'), /không hợp lệ/);
});

test('public list errors can be surfaced instead of silently falling back', async () => {
  global.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(api.fetchModels('http://localhost'), /503/);
});

test('a successful empty public list keeps default models', async () => {
  global.fetch = async () => new Response('[]');
  assert.equal((await api.fetchModels('http://localhost')).length, api.DEFAULT_MODELS.length);
});
