const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

function memorySecure(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async getItemAsync(key) { return data.has(key) ? data.get(key) : null; },
    async setItemAsync(key, value) { data.set(key, value); },
    async deleteItemAsync(key) { data.delete(key); },
  };
}

function loadAuth({ secure = memorySecure(), response = null } = {}) {
  const stops = [];
  const load = createLoader({
    'expo-secure-store': secure,
    '../lib/api': {
      fetchMe: async () => {
        if (response instanceof Error) throw response;
        return response;
      },
      stopTranslator: () => stops.push(true),
    },
  }, { process: { env: {} } });
  const { useAuthStore } = load('stores/authStore.ts');
  return { useAuthStore, secure, stops };
}

const waitFor = async (check) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > 1000) throw new Error('waitFor: hết thời gian chờ');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const user = { id: 'u1', name: 'A', email: 'a@x.com', avatar: '', role: 'user', plan: 'free', isAdmin: false, dailyLimit: 100, usageCount: 1, usageDate: '2026-11-16' };

test('đăng xuất phải tắt lớp phủ dịch, nếu không nó tiếp tục gửi token cũ', async () => {
  const { useAuthStore, stops } = loadAuth({ response: user });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('tok');
  await useAuthStore.getState().logout();
  assert.equal(stops.length, 1);
  assert.equal(useAuthStore.getState().token, null);
});

test('đăng xuất vẫn xoá token dù lớp phủ đang không chạy', async () => {
  const secure = memorySecure({ 'lumo-lens-token': 'tok' });
  const load = createLoader({
    'expo-secure-store': secure,
    '../lib/api': {
      fetchMe: async () => user,
      stopTranslator: () => { throw new Error('chưa chạy'); },
    },
  }, { process: { env: {} } });
  const { useAuthStore } = load('stores/authStore.ts');
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().token, null);
  assert.equal(secure.data.has('lumo-lens-token'), false);
});

test('đăng xuất trả hạn mức về trạng thái chưa biết', async () => {
  const { useAuthStore } = loadAuth({ response: user });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('tok');
  assert.equal(useAuthStore.getState().user.dailyLimit, 100);
  await useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().user, null);
});
