const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, memoryStorage, waitFor } = require('./helpers/load-ts.cjs');

// Nạp configStore và modelStore từ cùng một loader để chúng dùng chung một store.
function loadStores(api, token = "test-token") {
  const storage = memoryStorage();
  const secure = {
    data: new Map(token ? [["lumo-lens-token", token]] : []),
    async getItemAsync(key) { return this.data.has(key) ? this.data.get(key) : null; },
    async setItemAsync(key, value) { this.data.set(key, value); },
    async deleteItemAsync(key) { this.data.delete(key); },
  };
  const load = createLoader({
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'expo-secure-store': secure,
    '../lib/api': { fetchMe: async () => null, ...api },
  }, { process: { env: {} } });
  const { useConfigStore } = load('stores/configStore.ts');
  const { useModelStore } = load('stores/modelStore.ts');
  return { useConfigStore, useModelStore, secure };
}

async function ready(useConfigStore) {
  await waitFor(() => useConfigStore.getState().hydrated);
}

test('chỉ request mới nhất được cập nhật danh sách và loading', async () => {
  const pending = [];
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise((resolve) => pending.push(resolve)),
  });
  await ready(useConfigStore);

  const first = useModelStore.getState().reloadModels();
  const second = useModelStore.getState().reloadModels();

  pending[0]([{ code: 'old', label: 'Old' }]);
  await first;
  assert.equal(useModelStore.getState().modelsLoading, true);
  assert.equal(useModelStore.getState().connection, null);
  assert.equal(useModelStore.getState().modelList.length, 0);

  pending[1]([{ code: 'new', label: 'New' }]);
  await second;
  assert.equal(useModelStore.getState().modelsLoading, false);
  assert.equal(useModelStore.getState().modelList[0].code, 'new');
  assert.equal(useModelStore.getState().connection, 'connected');
});

test('response của server cũ về sau khi đổi server thì bị bỏ qua', async () => {
  const pending = [];
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise((resolve) => pending.push(resolve)),
  });
  await ready(useConfigStore);

  const old = useModelStore.getState().reloadModels();
  useConfigStore.setState({ serverUrl: 'http://new' });
  const fresh = useModelStore.getState().reloadModels();

  pending[1]([{ code: 'b', label: 'B' }]);
  await fresh;
  pending[0]([{ code: 'a', label: 'A' }]);
  await old;

  assert.equal(useModelStore.getState().modelList[0].code, 'b');
  assert.equal(useModelStore.getState().modelsLoading, false);
});

test('model đã lưu không còn trên server thì chọn model đầu tiên', async () => {
  const pending = [];
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise((resolve) => pending.push(resolve)),
  });
  await ready(useConfigStore);
  useConfigStore.getState().setModel('gone');

  const request = useModelStore.getState().reloadModels();
  pending[0]([
    { code: 'a', label: 'A' },
    { code: 'b', label: 'B' },
  ]);
  await request;

  assert.equal(useConfigStore.getState().model, 'a');
});

test('model người dùng chọn trong lúc đang tải thì không bị ghi đè', async () => {
  const pending = [];
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise((resolve) => pending.push(resolve)),
  });
  await ready(useConfigStore);

  const request = useModelStore.getState().reloadModels();
  // Người dùng chọn model khác trong lúc danh sách còn đang tải.
  useConfigStore.getState().setModel('b');
  pending[0]([
    { code: 'a', label: 'A' },
    { code: 'b', label: 'B' },
  ]);
  await request;

  assert.equal(useConfigStore.getState().model, 'b');
});

test('tải lỗi thì hiện lỗi và tắt loading', async () => {
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: async () => {
      throw new Error('down');
    },
  });
  await ready(useConfigStore);

  await useModelStore.getState().reloadModels();

  assert.equal(useModelStore.getState().modelsError, 'down');
  assert.equal(useModelStore.getState().connection.reason, 'network');
  assert.equal(useModelStore.getState().modelsLoading, false);
});

test('lỗi không phải Error thì dùng câu thông báo mặc định', async () => {
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: async () => {
      throw 'down';
    },
  });
  await ready(useConfigStore);

  await useModelStore.getState().reloadModels();

  assert.equal(useModelStore.getState().modelsError, 'Không tải được danh sách model.');
});