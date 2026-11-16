const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

// Dùng loader sẵn có vì auth-route.ts import ./auth-link
function loadAuthRoute() {
  const load = createLoader();
  return load('lib/auth-route.ts');
}

test('có token thì lưu token rồi về trang chủ', () => {
  const { decideAuthAction } = loadAuthRoute();
  const action = decideAuthAction({ token: 'abc', error: null });
  assert.equal(action.type, 'login');
  assert.equal(action.token, 'abc');
  assert.equal(action.target, '/');
});

test('chỉ có lỗi thì quay lại login kèm thông báo', () => {
  const { decideAuthAction } = loadAuthRoute();
  const action = decideAuthAction({ token: null, error: 'google_denied' });
  assert.equal(action.type, 'error');
  assert.match(action.message, /huỷ|hủy/i);
});

test('deep link rỗng thì về login nhưng không có thông báo lỗi', () => {
  const { decideAuthAction } = loadAuthRoute();
  const action = decideAuthAction({ token: null, error: null });
  assert.equal(action.type, 'error');
  assert.equal(action.message, null);
});

test('token rỗng không được coi là đăng nhập thành công', () => {
  const { decideAuthAction } = loadAuthRoute();
  assert.equal(decideAuthAction({ token: '', error: null }).type, 'error');
});

test('lỗi tài khoản bị khoá được mô tả bằng tiếng Việt', () => {
  const { decideAuthAction } = loadAuthRoute();
  assert.match(decideAuthAction({ token: null, error: 'account_blocked' }).message, /khoá/i);
});
