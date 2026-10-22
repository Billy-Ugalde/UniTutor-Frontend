import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const file = 'src/modules/requests/utils/request-state.ts'
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { canRespond, isConfirmed, safeMeetingUrl, requestLoadErrorKey } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

test('a missing requests API is reported as unavailable instead of an empty inbox', () => {
  assert.equal(requestLoadErrorKey({ code: 'PGRST202' }), 'El módulo de solicitudes todavía no está habilitado. Contacta al administrador.')
  assert.equal(requestLoadErrorKey({ code: '42883' }), 'El módulo de solicitudes todavía no está habilitado. Contacta al administrador.')
  for (const error of [null, new Error('Network failure'), { code: '42501' }]) {
    assert.equal(requestLoadErrorKey(error), 'No se pudieron cargar las solicitudes. Inténtalo nuevamente.')
  }
})

test('only pending requests for future scheduled sessions can be answered', () => {
  const now = new Date('2026-10-20T12:00:00-06:00')
  const row = { status: 'pendiente', session_status: 'programada', session_date: '2026-10-21', start_time: '12:00:00' }
  assert.equal(canRespond(row, now), true)
  for (const status of ['aceptada', 'rechazada', 'cancelada']) {
    assert.equal(canRespond({ ...row, status }, now), false)
  }
  for (const session_status of ['cancelada', 'completada', 'en_curso']) {
    assert.equal(canRespond({ ...row, session_status }, now), false)
  }
  assert.equal(canRespond({ ...row, session_date: '2026-10-20', start_time: '12:00:00' }, now), false)
})

test('cancelled sessions and unaccepted requests are not confirmed', () => {
  assert.equal(isConfirmed({ status: 'aceptada', session_status: 'programada' }), true)
  assert.equal(isConfirmed({ status: 'aceptada', session_status: 'cancelada' }), false)
  assert.equal(isConfirmed({ status: 'pendiente', session_status: 'programada' }), false)
})

test('meeting links permit only absolute HTTP and HTTPS URLs', () => {
  assert.equal(safeMeetingUrl('https://meet.example.com/lesson'), 'https://meet.example.com/lesson')
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '/local', 'Aula 12', '']) {
    assert.equal(safeMeetingUrl(url), null)
  }
})
