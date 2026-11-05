const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('latest model request wins and retains loading until it finishes', async () => {
  const states = [];
  const refs = [];
  let s = 0;
  let r = 0;
  let context;
  const pending = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => context,
    useState: initial => {
      const index = s++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef: initial => refs[r++] ?? (refs[r - 1] = { current: initial }),
    useCallback: fn => fn,
    useEffect: () => {},
  };
  let finishDelete;
  let deleteCalls = 0;
  const api = {
    deleteModel: () => { deleteCalls++; return new Promise(resolve => { finishDelete = resolve; }); },
    DEFAULT_MODELS: [],
    fetchModels: () => new Promise(resolve => pending.push(resolve)),
    fetchAdminModels: async () => [],
  };
  const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/settings.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, {
    exports, process,
    require: name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx: (_, props) => { context = props.value; } } : name === './api' ? api : {},
  });
  const render = () => { s = 0; r = 0; exports.SettingsProvider({ children: null }); };
  render();
  const first = context.reloadModels();
  const second = context.reloadModels();
  pending[0]([{ code: 'old', label: 'Old' }]);
  await first;
  render();
  assert.equal(context.modelsLoading, true);
  assert.equal(context.modelList.length, 0);
  pending[1]([{ code: 'new', label: 'New' }]);
  await second;
  render();
  assert.equal(context.modelsLoading, false);
  assert.equal(context.modelList[0].code, 'new');

  // A delete callback from the old configuration must not start another old request.
  const oldReload = context.reloadModels;
  context.setServerUrl('http://new-server');
  render();
  const before = pending.length;
  const stale = oldReload();
  assert.equal(pending.length, before);
  await stale;
  assert.equal(context.modelList[0].code, 'new');

  const removing = context.removeModel('model-1');
  render();
  assert.equal(context.deletingIds[0], 'model-1');
  await context.removeModel('model-1');
  assert.equal(deleteCalls, 1);
  // Server changes while DELETE is pending: its old reload must not run.
  context.setServerUrl('http://third-server');
  render();
  finishDelete(null);
  await removing;
  render();
  assert.equal(pending.length, before);
  assert.equal(context.deletingIds.length, 0);
});
