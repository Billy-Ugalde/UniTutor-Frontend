import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// Execute the pure TypeScript translation functions using the existing compiler.
function loadCore() {
  const es = JSON.parse(fs.readFileSync('src/i18n/Lang/es.json', 'utf8'))
  const en = JSON.parse(fs.readFileSync('src/i18n/Lang/en.json', 'utf8'))
  const code = ts.transpileModule(fs.readFileSync('src/i18n/core.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: (name) => name.includes('/es.json') ? es : en })
  return { ...exports, es, en }
}

test('Spanish is the default, including invalid stored languages', () => {
  const { resolveLanguage } = loadCore()
  for (const value of [null, '', 'fr', 'EN', '{}']) assert.equal(resolveLanguage(value), 'es')
  assert.equal(resolveLanguage('en'), 'en')
})

test('Both dictionaries have identical keys and interpolation parameters', () => {
  const { es, en } = loadCore()
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort())
  for (const key of Object.keys(es)) {
    assert.ok(en[key].trim(), key)
    const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
    assert.deepEqual(params(es[key]), params(en[key]), key)
  }
})

test('Translations support English, Spanish fallback and safe interpolation', () => {
  const { translate } = loadCore()
  assert.equal(translate('es', 'Iniciar sesión'), 'Iniciar sesión')
  assert.equal(translate('en', 'Iniciar sesión'), 'Sign in')
  assert.equal(translate('en', 'Unknown key'), 'Unknown key')
  assert.equal(translate('en', '¡Bienvenido, {name}!', { name: '$& <Ana>' }), 'Welcome, $& <Ana>!')
  assert.equal(translate('en', '¡Bienvenido, {name}!'), 'Welcome, {name}!')
})

function loadStore(storage) {
  const exports = {}
  const document = { documentElement: { lang: '' } }
  const code = ts.transpileModule(fs.readFileSync('src/i18n/store.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  vm.runInNewContext(code, {
    exports, document, localStorage: storage,
    require: (name) => name === './core' ? loadCore() : require(name),
  })
  return { ...exports, document }
}

test('Switching languages persists the preference and updates the document language', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  const { useLanguageStore, document, LANGUAGE_STORAGE_KEY } = loadStore(storage)
  assert.equal(useLanguageStore.getState().language, 'es')
  assert.equal(document.documentElement.lang, 'es')
  useLanguageStore.getState().setLanguage('en')
  assert.equal(values.get(LANGUAGE_STORAGE_KEY), 'en')
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(loadStore(storage).useLanguageStore.getState().language, 'en')
  useLanguageStore.getState().setLanguage('es')
  assert.equal(document.documentElement.lang, 'es')
})

test('Language switching works even when browser storage is unavailable', () => {
  const storage = { getItem() { throw Error('Blocked') }, setItem() { throw Error('Blocked') } }
  const { useLanguageStore, document } = loadStore(storage)
  assert.equal(useLanguageStore.getState().language, 'es')
  useLanguageStore.getState().setLanguage('en')
  assert.equal(useLanguageStore.getState().language, 'en')
  assert.equal(document.documentElement.lang, 'en')
})
