const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, memoryStorage, waitFor } = require('./helpers/load-ts.cjs');

const CONFIG_KEY = 'lumo-lens-config';

// Nạp configStore với AsyncStorage giả. Trả về store và storage để kiểm tra.
function loadConfig(initial, globals) {
  const storage = memoryStorage(initial);
  const load = createLoader(
    { '@react-native-async-storage/async-storage': { __esModule: true, default: storage } },
    globals
  );
  const { useConfigStore } = load('stores/configStore.ts');
  return { useConfigStore, storage };
}

async function loaded(useConfigStore) {
  await waitFor(() => useConfigStore.getState().hydrated);
  return useConfigStore.getState();
}

test('chép dữ liệu từ khóa cũ sang khóa mới, xóa cả khóa admin cũ', async () => {
  const { useConfigStore, storage } = loadConfig({
    'lumo-lens-settings': JSON.stringify({ serverUrl: 'http://old', sourceLang: 'ja', targetLang: 'vi', model: 'm1' }),
    'lumo-lens-admin-key': 'secret',
    'lumo-lens-onboarded': 'yes',
  });
  const s = await loaded(useConfigStore);

  assert.equal(s.serverUrl, 'http://old');
  assert.equal(s.sourceLang, 'ja');
  assert.equal(s.targetLang, 'vi');
  assert.equal(s.model, 'm1');
  assert.equal(s.translationMode, 'game');
  // adminKey và onboarded không còn tồn tại trong store
  assert.equal('adminKey' in s, false);
  assert.equal('onboarded' in s, false);

  assert.ok(storage.data.has(CONFIG_KEY), 'phải ghi khóa mới');
  assert.equal(storage.data.has('lumo-lens-settings'), false);
  assert.equal(storage.data.has('lumo-lens-admin-key'), false);
  assert.equal(storage.data.has('lumo-lens-onboarded'), false);
});

test('storage trống thì dùng giá trị mặc định và env', async () => {
  const { useConfigStore } = loadConfig({}, { process: { env: { EXPO_PUBLIC_SERVER_URL: 'http://env' } } });
  const s = await loaded(useConfigStore);

  assert.equal(s.serverUrl, 'http://env');
  assert.equal(s.sourceLang, 'en');
  assert.equal(s.targetLang, 'vi');
  assert.equal(s.model, '');
});

test('dữ liệu cũ hỏng thì dùng mặc định, không lỗi', async () => {
  const { useConfigStore } = loadConfig({ 'lumo-lens-settings': 'broken' });
  const s = await loaded(useConfigStore);

  assert.equal(s.serverUrl, '');
  assert.equal(s.sourceLang, 'en');
  assert.equal(s.hydrated, true);
});

test('đọc AsyncStorage lỗi vẫn đánh dấu hydrated', async () => {
  const storage = memoryStorage();
  storage.getItem = async () => {
    throw new Error('io');
  };
  const load = createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const { useConfigStore } = load('stores/configStore.ts');
  const s = await loaded(useConfigStore);

  assert.equal(s.hydrated, true);
  assert.equal(s.sourceLang, 'en');
});

test('chọn trùng ngôn ngữ bên kia thì hoán đổi, swapLanguages đổi hai bên', async () => {
  const { useConfigStore } = loadConfig({});
  await loaded(useConfigStore);

  useConfigStore.getState().chooseLanguage('source', 'vi');
  assert.equal(useConfigStore.getState().sourceLang, 'vi');
  assert.equal(useConfigStore.getState().targetLang, 'en');

  useConfigStore.getState().chooseLanguage('target', 'ja');
  assert.equal(useConfigStore.getState().targetLang, 'ja');

  useConfigStore.getState().swapLanguages();
  assert.equal(useConfigStore.getState().sourceLang, 'ja');
  assert.equal(useConfigStore.getState().targetLang, 'vi');
});

test('ghi lỗi không làm app báo unhandled rejection', async () => {
  const { useConfigStore, storage } = loadConfig({});
  await loaded(useConfigStore);

  const unhandled = [];
  const onUnhandled = (err) => unhandled.push(err);
  process.on('unhandledRejection', onUnhandled);
  storage.setItem = async () => {
    throw new Error('disk full');
  };
  useConfigStore.getState().setServerUrl('http://new');
  // Chờ một nhịp để promise bị từ chối kịp nổi lên.
  await new Promise((resolve) => setTimeout(resolve, 50));
  process.off('unhandledRejection', onUnhandled);

  assert.equal(unhandled.length, 0);
  assert.equal(useConfigStore.getState().serverUrl, 'http://new');
});

test('xóa khóa cũ lỗi thì vẫn giữ dữ liệu đã chuyển', async () => {
  const storage = memoryStorage({
    'lumo-lens-settings': JSON.stringify({ serverUrl: 'http://old', model: 'm1' }),
    'lumo-lens-admin-key': 'secret',
  });
  storage.removeItem = async () => {
    throw new Error('busy');
  };
  const load = createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const { useConfigStore } = load('stores/configStore.ts');
  const s = await loaded(useConfigStore);

  assert.equal(s.serverUrl, 'http://old');
  assert.equal(s.model, 'm1');
  // Không còn chuyển adminKey sang store mới dù khóa cũ chưa xóa được.
  assert.equal('adminKey' in s, false);
});

test('lưu translationMode nhưng không lưu hydrated', async () => {
  const { useConfigStore, storage } = loadConfig({});
  await loaded(useConfigStore);

  useConfigStore.getState().setTranslationMode('manga');
  await waitFor(() => JSON.parse(storage.data.get(CONFIG_KEY) ?? '{}').state?.translationMode === 'manga');

  const saved = JSON.parse(storage.data.get(CONFIG_KEY)).state;
  assert.equal(saved.translationMode, 'manga');
  assert.equal('hydrated' in saved, false);
});
