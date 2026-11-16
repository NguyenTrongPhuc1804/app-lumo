const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

// SecureStore giả: chỉ giữ chuỗi trong Map, giống hợp đồng getItemAsync/setItemAsync.
function memorySecure(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async getItemAsync(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async setItemAsync(key, value) {
      data.set(key, value);
    },
    async deleteItemAsync(key) {
      data.delete(key);
    },
  };
}

// Loader có mock fetch để không gọi mạng thật.
function loadAuth({ secure = memorySecure(), response = null } = {}) {
  const calls = [];
  const load = createLoader({
    'expo-secure-store': secure,
    '../lib/api': {
      fetchMe: async (url, token) => {
        calls.push({ url, token });
        if (response instanceof Error) throw response;
        return response;
      },
    },
  });
  const { useAuthStore } = load('stores/authStore.ts');
  return { useAuthStore, secure, calls, load };
}

const waitFor = async (check) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > 1000) throw new Error('waitFor: hết thời gian chờ');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const user = {
  id: 'u1',
  email: 'a@x.com',
  name: 'Nguyễn Văn A',
  avatar: '',
  role: 'user',
  plan: 'free',
  isAdmin: false,
  dailyLimit: 100,
  usageCount: 3,
  usageDate: '2026-11-16',
};

test('không có token đã lưu thì hydrated sau khi đọc xong, token null', async () => {
  const { useAuthStore } = loadAuth();
  await waitFor(() => useAuthStore.getState().hydrated);
  assert.equal(useAuthStore.getState().token, null);
  assert.equal(useAuthStore.getState().user, null);
});

test('có token đã lưu thì nạp user từ server', async () => {
  const { useAuthStore, calls } = loadAuth({ secure: memorySecure({ 'lumo-lens-token': 'saved' }), response: user });
  await waitFor(() => useAuthStore.getState().hydrated);
  await waitFor(() => useAuthStore.getState().user !== null);
  assert.equal(calls[0].token, 'saved');
  assert.equal(useAuthStore.getState().user.name, 'Nguyễn Văn A');
});

test('đọc SecureStore lỗi vẫn đánh dấu hydrated để app không treo', async () => {
  const secure = memorySecure();
  secure.getItemAsync = async () => {
    throw new Error('keystore lỗi');
  };
  const { useAuthStore } = loadAuth({ secure });
  await waitFor(() => useAuthStore.getState().hydrated);
  assert.equal(useAuthStore.getState().token, null);
});

test('completeLogin lưu token vào SecureStore và nạp user', async () => {
  const { useAuthStore, secure } = loadAuth({ response: user });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('fresh-token');
  assert.equal(secure.data.get('lumo-lens-token'), 'fresh-token');
  assert.equal(useAuthStore.getState().token, 'fresh-token');
  assert.equal(useAuthStore.getState().user.email, 'a@x.com');
});

test('completeLogin gọi hai lần với cùng token không lỗi', async () => {
  const { useAuthStore, secure } = loadAuth({ response: user });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('same');
  await useAuthStore.getState().completeLogin('same');
  assert.equal(secure.data.get('lumo-lens-token'), 'same');
  assert.equal(useAuthStore.getState().token, 'same');
});

test('logout xoá token và user', async () => {
  const { useAuthStore, secure } = loadAuth({ response: user });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('tok');
  await useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().token, null);
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(secure.data.has('lumo-lens-token'), false);
});

test('reloadMe cập nhật hạn mức mà không đổi token', async () => {
  const updated = { ...user, usageCount: 10 };
  const { useAuthStore } = loadAuth({ response: updated });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('tok');
  await useAuthStore.getState().reloadMe();
  assert.equal(useAuthStore.getState().user.usageCount, 10);
  assert.equal(useAuthStore.getState().token, 'tok');
});

test('reloadMe gặp lỗi phiên hết hạn thì xoá token', async () => {
  const { useAuthStore } = loadAuth({ response: new Error('Phiên đăng nhập đã hết hạn') });
  await waitFor(() => useAuthStore.getState().hydrated);
  await useAuthStore.getState().completeLogin('tok').catch(() => {});
  assert.equal(useAuthStore.getState().token, null);
});
