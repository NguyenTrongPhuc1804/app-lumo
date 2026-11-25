// Nạp file TypeScript của app vào Node để test, không cần Metro hay Babel.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ROOT = path.join(__dirname, '../..');

// AsyncStorage giả: giữ dữ liệu trong Map, tất cả hàm đều async như bản thật.
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}

// Chờ cho tới khi check() trả về true; quá 1 giây thì báo lỗi để test không treo.
function waitFor(check) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (check()) return resolve();
      if (Date.now() - start > 1000) return reject(new Error('waitFor: hết thời gian chờ'));
      setTimeout(tick, 5);
    };
    tick();
  });
}

// Trả về hàm load(file). file tính từ thư mục mobile/, ví dụ "stores/configStore.ts".
// mocks: tên module -> giá trị trả về. Module import default cần có __esModule: true.
function createLoader(mocks = {}, globals = {}) {
  const cache = new Map();

  function findFile(base) {
    const candidates = [base, base + '.ts', base + '.tsx', base + '.js'];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    for (const candidate of [path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  function run(file, fromDir) {
    const real = findFile(path.resolve(fromDir, file));
    if (!real) throw new Error(`Không tìm thấy module: ${file} (từ ${fromDir})`);
    if (real.endsWith('.json')) return require(real);
    if (cache.has(real)) return cache.get(real).exports;

    const module = { exports: {} };
    // Đưa vào cache trước khi chạy để module import vòng tròn không lặp vô hạn.
    cache.set(real, module);

    const code = ts.transpileModule(fs.readFileSync(real, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: real,
    }).outputText;

    const dir = path.dirname(real);
    const context = {
      exports: module.exports,
      module,
      require(name) {
        if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
        if (name.startsWith('.')) return run(name, dir);
        return require(name);
      },
      process,
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      ...globals,
    };

    vm.runInNewContext(code, context, { filename: real });
    // TypeScript gán thêm thuộc tính lên exports nên trả về đúng object đó.
    return module.exports;
  }

  return (file) => run(file, ROOT);
}

module.exports = { createLoader, memoryStorage, waitFor };
