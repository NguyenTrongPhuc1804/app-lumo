const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

function loadService(platform, native) {
  const load = createLoader({
    'react-native': { Platform: { OS: platform } },
    '../modules/screen-translator': { __esModule: true, default: native },
  });
  const { useServiceStore } = load('stores/serviceStore.ts');
  return useServiceStore;
}

test('refreshService đọc trạng thái native trên android', () => {
  const useServiceStore = loadService('android', {
    canDrawOverlays: () => true,
    isRunning: () => true,
  });

  useServiceStore.getState().refreshService();

  assert.equal(useServiceStore.getState().hasOverlayPermission, true);
  assert.equal(useServiceStore.getState().running, true);
});

test('refreshService không làm gì ngoài android', () => {
  const useServiceStore = loadService('ios', {
    canDrawOverlays: () => true,
    isRunning: () => true,
  });

  useServiceStore.getState().refreshService();

  assert.equal(useServiceStore.getState().hasOverlayPermission, false);
  assert.equal(useServiceStore.getState().running, false);
});

test('setRunning cập nhật trạng thái đang chạy', () => {
  const useServiceStore = loadService('android', {
    canDrawOverlays: () => false,
    isRunning: () => false,
  });

  useServiceStore.getState().setRunning(true);

  assert.equal(useServiceStore.getState().running, true);
});
