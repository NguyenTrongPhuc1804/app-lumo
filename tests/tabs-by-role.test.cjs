const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

// Danh sach tab phu thuoc quyen, tach ra de test khong can render.
function loadTabs() {
  const load = createLoader();
  return load('lib/tabs.ts');
}

test('người thường chỉ thấy ba tab, không có Model AI', () => {
  const { tabsForRole } = loadTabs();
  const keys = tabsForRole({ isAdmin: false }).map((tab) => tab.key);
  assert.deepEqual([...keys], ['home', 'settings', 'account']);
});

test('admin thấy thêm tab Model AI', () => {
  const { tabsForRole } = loadTabs();
  const keys = tabsForRole({ isAdmin: true }).map((tab) => tab.key);
  assert.deepEqual([...keys], ['home', 'models', 'settings', 'account']);
});

test('chưa có thông tin tài khoản thì coi như người thường', () => {
  const { tabsForRole } = loadTabs();
  const keys = tabsForRole(null).map((tab) => tab.key);
  assert.equal(keys.includes('models'), false);
});

test('mọi tab đều có nhãn tiếng Việt để hiện dưới icon', () => {
  const { tabsForRole } = loadTabs();
  for (const tab of tabsForRole({ isAdmin: true })) {
    assert.ok(tab.label.length > 0, `tab ${tab.key} thiếu nhãn`);
  }
});
