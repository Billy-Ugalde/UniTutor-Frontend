import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const es = JSON.parse(fs.readFileSync('src/i18n/Lang/es.json', 'utf8'))
const en = JSON.parse(fs.readFileSync('src/i18n/Lang/en.json', 'utf8'))
const issues = []
if (JSON.stringify(Object.keys(es).sort()) !== JSON.stringify(Object.keys(en).sort())) {
  issues.push('Spanish and English dictionaries must have identical keys.')
}
for (const file of fs.readdirSync('src', { recursive: true }).filter(f => f.endsWith('.tsx'))) {
  const ast = ts.createSourceFile(file, fs.readFileSync(path.join('src', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function report(node, message) {
    const { line } = ast.getLineAndCharacterOfPosition(node.getStart(ast))
    issues.push(`src/${file}:${line + 1}: ${message}`)
  }
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && ts.isStringLiteral(node.arguments[0])) {
      const key = node.arguments[0].text
      if (!Object.hasOwn(es, key)) report(node, `Missing translation key: ${key}`)
    }
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim()
      if (/[A-Za-zÁ-ú]/.test(text) && !['UniTutor', 'UniTutor ©', 'Español', 'English'].includes(text)) {
        report(node, `Untranslated visible text: ${text}`)
      }
    }
    if (ts.isJsxAttribute(node) && /^(label|title|placeholder|aria-label)$/.test(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const text = node.initializer.text
      // Names, addresses, phone numbers and neutral technical examples remain unchanged.
      if (!['Juan', 'Pérez', 'Carlos', 'Rodríguez', 'San Pedro, San José'].includes(text) && /[A-Za-zÁ-ú]/.test(text)) {
        report(node, `Untranslated attribute: ${text}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
if (issues.length) {
  console.error(issues.join('\n'))
  process.exitCode = 1
} else {
  console.log(`i18n: ${Object.keys(es).length} matching keys; no untranslated JSX text or attributes.`)
}
