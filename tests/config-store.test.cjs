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

test('chép dữ liệu từ 3 khóa cũ sang khóa mới rồi xóa khóa cũ', async () => {
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
  assert.equal(s.adminKey, 'secret');
  assert.equal(s.onboarded, true);
  assert.equal(s.translationMode, 'game');

  assert.ok(storage.data.has(CONFIG_KEY), 'phải ghi khóa mới');
  assert.equal(storage.data.has('lumo-lens-settings'), false);
  assert.equal(storage.data.has('lumo-lens-admin-key'), false);
  assert.equal(storage.data.has('lumo-lens-onboarded'), false);
});

test('storage trống thì dùng giá trị mặc định và env', async () => {
  const { useConfigStore } = loadConfig({}, { process: { env: { EXPO_PUBLIC_SERVER_URL: 'http://env' } } });
  const s = await loaded(useConfigStore);

  assert.equal(s.serverUrl, 'http://env');
  assert.equal(s.adminKey, '');
  assert.equal(s.sourceLang, 'en');
  assert.equal(s.targetLang, 'vi');
  assert.equal(s.model, '');
  assert.equal(s.onboarded, false);
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

test('lưu translationMode nhưng không lưu hydrated', async () => {
  const { useConfigStore, storage } = loadConfig({});
  await loaded(useConfigStore);

  useConfigStore.getState().setTranslationMode('manga');
  await waitFor(() => JSON.parse(storage.data.get(CONFIG_KEY) ?? '{}').state?.translationMode === 'manga');

  const saved = JSON.parse(storage.data.get(CONFIG_KEY)).state;
  assert.equal(saved.translationMode, 'manga');
  assert.equal('hydrated' in saved, false);
});
