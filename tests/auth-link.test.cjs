const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Tach ham thuan de test khong can render React Native.
function loadAuthLink() {
  const file = path.join(__dirname, '../lib/auth-link.ts');
  assert.ok(fs.existsSync(file), 'lib/auth-link.ts phai ton tai');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, URLSearchParams });
  return exports;
}

test('doc token tu deep link', () => {
  const { parseAuthLink } = loadAuthLink();
  assert.equal(parseAuthLink('lumolens://auth?token=abc').token, 'abc');
  assert.equal(parseAuthLink('lumolens://auth?token=abc').error, null);
});

test('doc ma loi tu deep link', () => {
  const { parseAuthLink } = loadAuthLink();
  assert.equal(parseAuthLink('lumolens://auth?error=google_denied').error, 'google_denied');
  assert.equal(parseAuthLink('lumolens://auth?error=google_denied').token, null);
});

test('deep link khong co gi thi tra ve ca hai null', () => {
  const { parseAuthLink } = loadAuthLink();
  assert.deepEqual({ token: parseAuthLink('lumolens://auth').token, error: parseAuthLink('lumolens://auth').error }, { token: null, error: null });
  assert.deepEqual({ token: parseAuthLink(null).token, error: parseAuthLink(null).error }, { token: null, error: null });
});

test('deep link hong khong lam crash', () => {
  const { parseAuthLink } = loadAuthLink();
  assert.equal(parseAuthLink('khong-phai-url').token, null);
});

test('mo ta loi hien thi than thien bang tieng Viet', () => {
  const { describeAuthError } = loadAuthLink();
  assert.match(describeAuthError('google_denied'), /huỷ|hủy/i);
  assert.match(describeAuthError('account_blocked'), /khoá/i);
  assert.match(describeAuthError('google_failed'), /thử lại/i);
  assert.equal(describeAuthError(null), null);
});

test('dung deep link co dinh lumolens://auth', () => {
  const { AUTH_DEEP_LINK } = loadAuthLink();
  assert.equal(AUTH_DEEP_LINK, 'lumolens://auth');
});
