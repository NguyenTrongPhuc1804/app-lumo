const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, memoryStorage, waitFor } = require('./helpers/load-ts.cjs');

const CONFIG_KEY = 'lumo-lens-config';

// Nạp configStore với AsyncStorage giả và một process.env riêng.
// Mặc định env rỗng để test không phụ thuộc biến môi trường của máy chạy
// (mobile/.env hoặc biến của CI) — nếu không, cùng một test sẽ xanh ở máy
// này và đỏ trên GitHub Actions.
function loadConfig(initial, env = {}) {
  const storage = memoryStorage(initial);
  const load = createLoader(
    { '@react-native-async-storage/async-storage': { __esModule: true, default: storage } },
    { process: { env } }
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
  const { useConfigStore } = loadConfig({}, { EXPO_PUBLIC_SERVER_URL: 'http://env' });
  const s = await loaded(useConfigStore);

  assert.equal(s.serverUrl, 'http://env');
  assert.equal(s.sourceLang, 'en');
  assert.equal(s.targetLang, 'vi');
  assert.equal(s.model, 'ml-kit');
});

test('URL đã lưu rỗng hoặc chỉ có khoảng trắng thì dùng URL môi trường', async () => {
  for (const serverUrl of ['', '   ']) {
    const { useConfigStore } = loadConfig({
      [CONFIG_KEY]: JSON.stringify({ state: { serverUrl, sourceLang: 'ja', model: 'm1' }, version: 0 }),
    }, { EXPO_PUBLIC_SERVER_URL: 'https://example.com/lumo' });
    const s = await loaded(useConfigStore);
    assert.equal(s.serverUrl, 'https://example.com/lumo');
    assert.equal(s.sourceLang, 'ja');
    assert.equal(s.model, 'm1');
  }
});

test('URL đã lưu có giá trị không bị URL môi trường ghi đè', async () => {
  const { useConfigStore } = loadConfig({
    [CONFIG_KEY]: JSON.stringify({ state: { serverUrl: 'https://saved.example.com' }, version: 0 }),
  }, { EXPO_PUBLIC_SERVER_URL: 'https://env.example.com' });
  assert.equal((await loaded(useConfigStore)).serverUrl, 'https://saved.example.com');
});

test('URL đã lưu và môi trường đều rỗng thì vẫn nạp cấu hình được', async () => {
  const { useConfigStore } = loadConfig({
    [CONFIG_KEY]: JSON.stringify({ state: { serverUrl: '' }, version: 0 }),
  });
  assert.equal((await loaded(useConfigStore)).serverUrl, '');
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
  const load = createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } }, { process: { env: {} } });
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

test('danh sách ML Kit có đủ mã, tên địa phương và tìm được tên tiếng Việt không dấu', () => {
  const { ML_KIT_LANGUAGES, OCR_LANGUAGES, findLanguages } = createLoader()('lib/translation-languages.ts');
  assert.equal(ML_KIT_LANGUAGES.length, 59);
  assert.equal(new Set(ML_KIT_LANGUAGES).size, ML_KIT_LANGUAGES.length);
  assert.ok(!OCR_LANGUAGES.includes('ar'));
  assert.ok(findLanguages(ML_KIT_LANGUAGES, 'a rap', 'vi').some(({ code, label }) => code === 'ar' && /Ả Rập/i.test(label)));
  assert.ok(findLanguages(ML_KIT_LANGUAGES, 'ar', 'en').some(({ code }) => code === 'ar'));
});

test('ngôn ngữ chỉ dùng làm đích không thể bị đảo sang nguồn', async () => {
  const { useConfigStore } = loadConfig({});
  await loaded(useConfigStore);
  const s = useConfigStore.getState();
  s.chooseLanguage('target', 'ar');
  s.swapLanguages();
  s.chooseLanguage('source', 'ar');
  assert.equal(useConfigStore.getState().sourceLang, 'en');
  assert.equal(useConfigStore.getState().targetLang, 'ar');
  s.chooseLanguage('target', 'en');
  assert.notEqual(useConfigStore.getState().sourceLang, useConfigStore.getState().targetLang);
  assert.equal(useConfigStore.getState().targetLang, 'en');
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
  const load = createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } }, { process: { env: {} } });
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
