const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, memoryStorage, waitFor } = require('./helpers/load-ts.cjs');

const APPEARANCE_KEY = 'lumo-lens-appearance-store';
const READ_ERROR = 'Không đọc được giao diện đã lưu. Đang dùng mặc định.';
const WRITE_ERROR = 'Không lưu được giao diện. Lựa chọn chỉ áp dụng cho lần mở này.';

function loadAppearance(initial) {
  const storage = memoryStorage(initial);
  const load = createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const { useAppearanceStore } = load('stores/appearanceStore.ts');
  return { useAppearanceStore, storage };
}

async function loaded(useAppearanceStore) {
  await waitFor(() => useAppearanceStore.getState().hydrated);
  return useAppearanceStore.getState();
}

test('chép dữ liệu từ khóa giao diện cũ', async () => {
  const { useAppearanceStore, storage } = loadAppearance({
    'lumo-lens-appearance': '{"colorMode":"dark","textSize":"large"}',
  });
  const s = await loaded(useAppearanceStore);

  assert.equal(s.colorMode, 'dark');
  assert.equal(s.textSize, 'large');
  assert.equal(storage.data.has('lumo-lens-appearance'), false);
  assert.ok(storage.data.has(APPEARANCE_KEY));
});

test('dữ liệu cũ hỏng thì về sáng và cỡ tự động', async () => {
  const { useAppearanceStore } = loadAppearance({ 'lumo-lens-appearance': 'broken' });
  const s = await loaded(useAppearanceStore);

  assert.equal(s.colorMode, 'light');
  assert.equal(s.textSize, 'auto');
});

test('đọc lỗi vẫn hydrated và hiện thông báo', async () => {
  const storage = memoryStorage();
  storage.getItem = async () => {
    throw new Error('io');
  };
  const load = createLoader({ '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const { useAppearanceStore } = load('stores/appearanceStore.ts');
  const s = await loaded(useAppearanceStore);

  assert.equal(s.hydrated, true);
  assert.equal(s.storageError, READ_ERROR);
});

test('ghi lỗi vẫn giữ lựa chọn trong phiên và hiện thông báo', async () => {
  const { useAppearanceStore, storage } = loadAppearance({});
  await loaded(useAppearanceStore);

  storage.setItem = async () => {
    throw new Error('full');
  };
  useAppearanceStore.getState().setColorMode('dark');
  await waitFor(() => useAppearanceStore.getState().storageError !== null);

  assert.equal(useAppearanceStore.getState().colorMode, 'dark');
  assert.equal(useAppearanceStore.getState().storageError, WRITE_ERROR);
});
