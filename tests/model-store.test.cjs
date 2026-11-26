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
    fetchAdminModels: async () => [],
    deleteModel: async () => null,
  });
  await ready(useConfigStore);

  const first = useModelStore.getState().reloadModels();
  const second = useModelStore.getState().reloadModels();

  pending[0]([{ code: 'old', label: 'Old' }]);
  await first;
  assert.equal(useModelStore.getState().modelsLoading, true);
  assert.equal(useModelStore.getState().modelList.length, 0);

  pending[1]([{ code: 'new', label: 'New' }]);
  await second;
  assert.equal(useModelStore.getState().modelsLoading, false);
  assert.equal(useModelStore.getState().modelList[0].code, 'new');
});

test('response của server cũ về sau khi đổi server thì bị bỏ qua', async () => {
  const pending = [];
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise((resolve) => pending.push(resolve)),
    fetchAdminModels: async () => [],
    deleteModel: async () => null,
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
    fetchAdminModels: async () => [],
    deleteModel: async () => null,
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
    fetchAdminModels: async () => [],
    deleteModel: async () => null,
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
    fetchAdminModels: async () => [],
    deleteModel: async () => null,
  });
  await ready(useConfigStore);

  await useModelStore.getState().reloadModels();

  assert.equal(useModelStore.getState().modelsError, 'down');
  assert.equal(useModelStore.getState().modelsLoading, false);
});

test('lỗi không phải Error thì dùng câu thông báo mặc định', async () => {
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: async () => {
      throw 'down';
    },
    fetchAdminModels: async () => [],
    deleteModel: async () => null,
  });
  await ready(useConfigStore);

  await useModelStore.getState().reloadModels();

  assert.equal(useModelStore.getState().modelsError, 'Không tải được danh sách model.');
});

test('xóa model: chặn trùng id, đổi server trong lúc chờ thì không tải lại', async () => {
  let finishDelete;
  let deleteCalls = 0;
  const pending = [];
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise((resolve) => pending.push(resolve)),
    fetchAdminModels: async () => [],
    deleteModel: () => {
      deleteCalls++;
      return new Promise((resolve) => {
        finishDelete = resolve;
      });
    },
  });
  await ready(useConfigStore);
  useModelStore.setState({ customModels: [{ id: 'model-1', name: 'One', code: 'one', baseUrl: '', apiKey: '' }] });

  const removing = useModelStore.getState().removeModel('model-1');
  // Copy sang mảng của test vì store chạy trong vm (realm khác).
  assert.deepEqual([...useModelStore.getState().deletingIds], ['model-1']);
  assert.equal(await useModelStore.getState().removeModel('model-1'), null);
  assert.equal(deleteCalls, 1);

  const before = pending.length;
  useConfigStore.setState({ serverUrl: 'http://third' });
  finishDelete(null);
  await removing;

  assert.equal(pending.length, before);
  assert.equal(useModelStore.getState().deletingIds.length, 0);
});

test('xóa model: cấu hình không đổi thì tải lại cả hai danh sách', async () => {
  let modelCalls = 0;
  let adminCalls = 0;
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: async () => {
      modelCalls++;
      return [];
    },
    fetchAdminModels: async () => {
      adminCalls++;
      return [{ id: 'x', name: 'X', code: 'x', baseUrl: '', apiKey: '' }];
    },
    deleteModel: async () => null,
  });
  await ready(useConfigStore);
  await useModelStore.getState().reloadAdminModels();
  modelCalls = 0;
  adminCalls = 0;

  assert.equal(await useModelStore.getState().removeModel('x'), null);

  assert.equal(modelCalls, 1);
  assert.equal(adminCalls, 1);
});

test('xóa model: id không còn trong danh sách hiện tại thì không gửi DELETE', async () => {
  let deleteCalls = 0;
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: async () => [],
    fetchAdminModels: async () => [],
    deleteModel: async () => {
      deleteCalls++;
      return null;
    },
  });
  await ready(useConfigStore);

  // Danh sách của server cũ đã bị xóa khi đổi server, nên id này không còn hợp lệ.
  const error = await useModelStore.getState().removeModel('model-of-old-server');

  assert.equal(error, 'Cấu hình đã thay đổi. Vui lòng thử lại.');
  assert.equal(deleteCalls, 0);
});

test('xóa model: server trả lỗi thì trả về câu lỗi và không tải lại', async () => {
  let modelCalls = 0;
  const { useConfigStore, useModelStore } = loadStores({
    DEFAULT_MODELS: [],
    fetchModels: async () => {
      modelCalls++;
      return [];
    },
    fetchAdminModels: async () => [],
    deleteModel: async () => 'Tài khoản không có quyền quản lý model',
  });
  await ready(useConfigStore);
  useModelStore.setState({ customModels: [{ id: 'x', name: 'X', code: 'x', baseUrl: '', apiKey: '' }] });
  modelCalls = 0;

  assert.equal(await useModelStore.getState().removeModel('x'), 'Tài khoản không có quyền quản lý model');
  assert.equal(modelCalls, 0);
  assert.equal(useModelStore.getState().deletingIds.length, 0);
});
