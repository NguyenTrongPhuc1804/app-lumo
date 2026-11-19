const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./helpers/load-ts.cjs');

test('legal URLs preserve deployment prefix and strip trailing slashes', () => {
  const { legalUrl } = createLoader({}, { process: { env: {} } })('lib/legal.ts');
  for (const [page, file] of Object.entries({ privacy: 'privacy.html', terms: 'terms.html', deletion: 'account-deletion.html' })) {
    assert.equal(legalUrl(' https://npnaphtha.com.vn/lumo/// ', page), `https://npnaphtha.com.vn/lumo/legal/${file}`);
  }
  assert.equal(legalUrl('', 'privacy'), '');
  assert.equal(legalUrl('   ', 'privacy'), '');
});
