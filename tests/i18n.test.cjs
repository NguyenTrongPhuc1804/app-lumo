const assert = require('node:assert/strict');
const test = require('node:test');
const { createLoader } = require('./helpers/load-ts.cjs');

const languages = ['vi', 'en', 'zh', 'ko', 'ja', 'fr'];
const catalogs = Object.fromEntries(languages.map((language) => [language, require(`../locales/${language}.json`)]));

function leafEntries(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'object' && child !== null ? leafEntries(child, path) : [[path, child]];
  });
}

function variables(text) {
  return [...new Set([...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]))].sort();
}

test('all bundled catalogs have the same keys and interpolation variables', () => {
  const english = Object.fromEntries(leafEntries(catalogs.en));
  for (const [language, catalog] of Object.entries(catalogs)) {
    const entries = Object.fromEntries(leafEntries(catalog));
    const expected = Object.keys(english).filter((key) => !key.endsWith('_one') || language === 'en' || language === 'fr');
    assert.deepEqual(Object.keys(entries).sort(), expected.sort(), language);
    for (const [key, value] of Object.entries(entries)) {
      assert.equal(typeof value, 'string', `${language}:${key}`);
      assert.ok(value.trim(), `${language}:${key}`);
      assert.deepEqual(variables(value), variables(english[key]), `${language}:${key}`);
    }
  }
});

test('i18n initializes synchronously in the chosen language and switches without loading resources', async () => {
  const { createAppI18n } = createLoader()('lib/i18n.ts');
  const i18n = createAppI18n('ja');
  assert.equal(i18n.t('settings.language'), catalogs.ja.settings.language);
  assert.equal(i18n.t('account.lumoId', { id: 'A&B' }), 'LUMO アカウント ID：A&B');
  await i18n.changeLanguage('fr');
  assert.equal(i18n.t('settings.language'), catalogs.fr.settings.language);
  assert.equal(i18n.t('account.coinBalance', { count: 0, amount: '0' }), '0 pièce');
  assert.equal(i18n.t('account.coinBalance', { count: 2, amount: '2' }), '2 pièces');
  i18n.addResource('en', 'translation', 'testFallback', 'English fallback');
  assert.equal(i18n.t('testFallback'), 'English fallback');
});

test('French plural rules still work when the runtime has no Intl.PluralRules', () => {
  const { execFileSync } = require('node:child_process');
  const loader = JSON.stringify(require.resolve('./helpers/load-ts.cjs'));
  const result = execFileSync(process.execPath, ['-e', `
    delete Intl.PluralRules;
    const { createAppI18n } = require(${loader}).createLoader()('lib/i18n.ts');
    const i18n = createAppI18n('fr');
    require('node:assert/strict').equal(i18n.t('account.coinBalance', { count: 0, amount: '0' }), '0 pièce');
  `], { encoding: 'utf8' });
  assert.equal(result, '');
});
