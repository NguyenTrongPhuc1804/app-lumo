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

test('admin list HTTP errors are not reported as an empty list', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: 'Server unavailable' }), { status: 500 });
  await assert.rejects(api.fetchAdminModels('http://localhost', 'token'), /Server unavailable/);
});

test('unauthorized admin request reports an expired session', async () => {
  global.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(api.fetchAdminModels('http://localhost', 'token'), /hết hạn/);
});

test('forbidden admin request explains the account lacks the right', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: 'Tài khoản không có quyền quản lý model' }), { status: 403 });
  await assert.rejects(api.fetchAdminModels('http://localhost', 'token'), /không có quyền/);
});

test('network errors are not reported as an empty admin list', async () => {
  global.fetch = async () => { throw new Error('Network down'); };
  await assert.rejects(api.fetchAdminModels('http://localhost', 'token'), /Network down/);
});

test('a successful empty admin list remains a valid result', async () => {
  global.fetch = async () => new Response('[]');
  assert.equal((await api.fetchAdminModels('http://localhost', 'token')).length, 0);
});

test('invalid admin response is rejected', async () => {
  global.fetch = async () => new Response('{}');
  await assert.rejects(api.fetchAdminModels('http://localhost', 'token'), /không hợp lệ/);
});

test('missing token is reported before calling the server', async () => {
  let called = false;
  global.fetch = async () => { called = true; return new Response('[]'); };
  await assert.rejects(api.fetchAdminModels('http://localhost', '   '), /Cần đăng nhập/);
  assert.equal(called, false);
});

test('admin request sends the bearer token and no admin key', async () => {
  let seen = null;
  global.fetch = async (url, options) => { seen = options.headers; return new Response('[]'); };
  await api.fetchAdminModels('http://localhost', 'my-token');
  assert.equal(seen.Authorization, 'Bearer my-token');
  assert.equal('x-admin-key' in seen, false);
});

test('public list errors can be surfaced instead of silently falling back', async () => {
  global.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(api.fetchModels('http://localhost'), /503/);
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

test('delete model reports a blocked account instead of a generic error', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: 'Tài khoản đã bị khoá' }), { status: 403 });
  assert.equal(await api.deleteModel('http://localhost', 'token', 'id'), 'Tài khoản đã bị khoá');
});
