import { test } from 'node:test'
import assert from 'node:assert/strict'

// Lightweight DOM mock for verifying UserWay script injection logic
function createMockDom() {
  const elements = new Map()
  const body = {
    children: [],
    appendChild(el) {
      this.children.push(el)
      if (el.id) elements.set(el.id, el)
      return el
    },
  }

  const documentMock = {
    body,
    getElementById(id) {
      return elements.get(id) || null
    },
    createElement(tagName) {
      const attributes = {}
      return {
        tagName,
        id: '',
        src: '',
        async: false,
        setAttribute(name, val) {
          attributes[name] = String(val)
        },
        getAttribute(name) {
          return attributes[name]
        },
      }
    },
  }

  return { documentMock, body }
}

function initUserWayScript(doc, { accountId, position, language }) {
  const SCRIPT_ID = 'userway-widget-script'
  if (!accountId) return null

  let script = doc.getElementById(SCRIPT_ID)
  if (!script) {
    script = doc.createElement('script')
    script.id = SCRIPT_ID
    script.src = 'https://cdn.userway.org/widget.js'
    script.setAttribute('data-account', accountId)
    if (position) {
      script.setAttribute('data-position', String(position))
    }
    if (language) {
      script.setAttribute('data-language', language)
    }
    script.async = true
    doc.body.appendChild(script)
  }
  return script
}

test('UserWay does not inject script if accountId is missing', () => {
  const { documentMock, body } = createMockDom()
  const result = initUserWayScript(documentMock, { accountId: '' })
  assert.equal(result, null)
  assert.equal(body.children.length, 0)
})

test('UserWay correctly configures script tag and attributes', () => {
  const { documentMock, body } = createMockDom()
  const script = initUserWayScript(documentMock, {
    accountId: 'sample-account-123',
    position: 3,
    language: 'es',
  })

  assert.ok(script)
  assert.equal(script.id, 'userway-widget-script')
  assert.equal(script.src, 'https://cdn.userway.org/widget.js')
  assert.equal(script.getAttribute('data-account'), 'sample-account-123')
  assert.equal(script.getAttribute('data-position'), '3')
  assert.equal(script.getAttribute('data-language'), 'es')
  assert.equal(script.async, true)
  assert.equal(body.children.length, 1)
})

test('UserWay script injection is idempotent and avoids duplicates', () => {
  const { documentMock, body } = createMockDom()
  initUserWayScript(documentMock, { accountId: 'sample-account-123' })
  initUserWayScript(documentMock, { accountId: 'sample-account-123' })

  assert.equal(body.children.length, 1)
})
