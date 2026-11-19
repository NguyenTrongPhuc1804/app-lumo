const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

const waitFor = async (check) => {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timeout');
};

for (const error of [null, 'Mạng lỗi']) {
  test(`delete account: ${error || 'success'} preserves the API-before-logout order`, async () => {
    const data = new Map([['lumo-lens-token', 'tok']]);
    const events = [];
    const user = { id: 'u1', isAdmin: false };
    const load = createLoader({
      'expo-secure-store': {
        getItemAsync: async (key) => data.get(key) || null,
        deleteItemAsync: async (key) => { events.push('clear'); data.delete(key); },
      },
      '../lib/api': {
        fetchMe: async () => user,
        deleteAccount: async (url, token) => { assert.equal(token, 'tok'); events.push('api'); return error; },
        stopTranslator: () => events.push('stop'),
      },
    }, { process: { env: {} } });
    const { useAuthStore } = load('stores/authStore.ts');
    await waitFor(() => useAuthStore.getState().user);
    assert.equal(await useAuthStore.getState().deleteAccount(), error);
    assert.deepEqual(events, error ? ['api'] : ['api', 'stop', 'clear']);
    assert.equal(useAuthStore.getState().token, error ? 'tok' : null);
    assert.equal(data.has('lumo-lens-token'), !!error);
    assert.equal(useAuthStore.getState().user, error ? user : null);
  });
}

test('missing token does not call deletion API', async () => {
  const load = createLoader({
    'expo-secure-store': { getItemAsync: async () => null },
    '../lib/api': { deleteAccount: async () => { throw new Error('must not call'); } },
  }, { process: { env: {} } });
  const { useAuthStore } = load('stores/authStore.ts');
  await waitFor(() => useAuthStore.getState().hydrated);
  assert.equal(await useAuthStore.getState().deleteAccount(), 'Chưa đăng nhập');
});

test('confirmation explains permanent deletion and admin recreation', () => {
  const { confirmDeletionMessage } = createLoader({}, { process: { env: {} } })('lib/account-deletion.ts');
  assert.match(confirmDeletionMessage({}), /vĩnh viễn/i);
  assert.match(confirmDeletionMessage({}), /không thể hoàn tác/i);
  assert.match(confirmDeletionMessage({ isAdmin: true }), /quản trị/i);
});
