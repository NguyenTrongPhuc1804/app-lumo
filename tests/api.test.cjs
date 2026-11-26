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
const screenTranslator = {};
vm.runInNewContext(compiled, {
  exports: moduleObject.exports,
  require: () => ({ __esModule: true, default: screenTranslator }),
  process,
  fetch: (...args) => global.fetch(...args),
  AbortController,
  setTimeout: (callback, ms) => setTimeout(callback, Math.min(ms, 50)),
  clearTimeout,
});
const api = moduleObject.exports;
afterEach(() => { global.fetch = originalFetch; });

for (const status of [200, 404]) {
  test(`delete account succeeds on ${status}`, async () => {
    global.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost/lumo/api/me');
      assert.equal(options.method, 'DELETE');
      assert.equal(options.headers.Authorization, 'Bearer token');
      assert.equal(options.body, undefined);
      return new Response('{}', { status });
    };
    assert.equal(await api.deleteAccount('http://localhost/lumo/', 'token'), null);
  });
}

test('delete account keeps authentication failures distinct from a missing account', async () => {
  global.fetch = async () => new Response('{}', { status: 401 });
  assert.equal(await api.deleteAccount('http://localhost', 'token'), 'Phiên đăng nhập đã hết hạn');
});

test('delete account finishes cleanup when a valid token belongs to a deleted account', async () => {
  global.fetch = async () => new Response(JSON.stringify({ code: 'ACCOUNT_NOT_FOUND' }), { status: 401 });
  assert.equal(await api.deleteAccount('http://localhost', 'token'), null);
});

test('delete account reports blocked, server and network failures', async () => {
  for (const status of [403, 503]) {
    global.fetch = async () => new Response(JSON.stringify({ error: 'Không xoá được' }), { status });
    assert.equal(await api.deleteAccount('http://localhost', 'token'), 'Không xoá được');
  }
  global.fetch = async () => { throw new Error('Network down'); };
  assert.equal(await api.deleteAccount('http://localhost', 'token'), 'Network down');
});

test('delete account rejects an empty server without making a request', async () => {
  global.fetch = async () => { throw new Error('must not fetch'); };
  assert.equal(await api.deleteAccount(' ', 'token'), 'Chưa cấu hình địa chỉ server');
});

test('public list preserves the HTTP status for connection diagnostics', async () => {
  for (const status of [401, 403, 404, 429, 503]) {
    global.fetch = async () => new Response('{}', { status });
    await assert.rejects(api.fetchModels('http://localhost'), { status });
  }
});

test('public list classifies DNS, generic network failures and invalid responses', async () => {
  for (const [message, reason] of [['UnknownHostException: private.local', 'dns'], ['Failed to fetch', 'network']]) {
    global.fetch = async () => { throw new Error(message); };
    await assert.rejects(api.fetchModels('http://localhost'), { reason });
  }
  for (const body of ['<html>', '[null]', '[{}]']) {
    global.fetch = async () => new Response(body);
    await assert.rejects(api.fetchModels('http://localhost'), { reason: 'invalidResponse' });
  }
});

test('a missing address is not a successful check and an offline device is distinct from DNS failure', async () => {
  global.fetch = async () => { assert.fail('missing URL must not fetch'); };
  await assert.rejects(api.fetchModels(' '), { reason: 'missingUrl' });
  screenTranslator.hasActiveNetwork = () => false;
  global.fetch = async () => { throw new Error('UnknownHostException'); };
  try {
    await assert.rejects(api.fetchModels('http://localhost'), { reason: 'offline' });
  } finally {
    delete screenTranslator.hasActiveNetwork;
  }
});

test('a stalled public list request times out', async () => {
  global.fetch = async (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  await assert.rejects(api.fetchModels('http://localhost'), { reason: 'timeout' });
});

test('a successful empty public list keeps default models', async () => {
  global.fetch = async () => new Response('[]');
  assert.equal((await api.fetchModels('http://localhost')).length, api.DEFAULT_MODELS.length);
});

test('me returns the account payload', async () => {
  const payload = { id: 'u1', email: 'a@x.com', name: 'A', avatar: '', role: 'user', plan: 'free', isAdmin: false, dailyLimit: 100, usageCount: 2, usageDate: '2026-11-16' };
  global.fetch = async () => new Response(JSON.stringify(payload));
  assert.equal((await api.fetchMe('http://localhost', 'token')).usageCount, 2);
});

test('me with expired token reports the session expired', async () => {
  global.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(api.fetchMe('http://localhost', 'token'), /hết hạn/);
});