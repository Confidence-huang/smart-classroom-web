import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateEcoStatus, summarizeEcoHistory } from './eco-diagnostics.js'

test('returns idle status when no telemetry or control device is present', () => {
  const res = evaluateEcoStatus({})
  assert.equal(res.tone, 'idle')
  assert.equal(res.label, '节能策略待机')
})

test('warns when room is unoccupied but fan or led is still on', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 0, light_lux: 120 },
    controlDevice: { telemetry: { fan_out: 1, led_out: 0, mode: 'REMOTE' } },
  })
  assert.equal(res.tone, 'warn')
  assert.equal(res.label, '空场空耗预警')
  assert.match(res.detail, /风扇/)
})

test('reports unoccupied standby when room has 0 people and loads are off', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 0 },
    controlDevice: { telemetry: { fan_out: 0, led_out: 0, mode: 'AUTO' } },
  })
  assert.equal(res.tone, 'live')
  assert.equal(res.label, '无人节能待机')
})

test('warns when natural daylight is sufficient (>=300 lx) and led is on', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 5, light_lux: 420 },
    controlDevice: { telemetry: { fan_out: 0, led_out: 1, mode: 'REMOTE' } },
  })
  assert.equal(res.tone, 'warn')
  assert.equal(res.label, '自然光充足')
})

test('summarizes unoccupied and daylight samples from real history rows', () => {
  const summary = summarizeEcoHistory([
    { people_count: 0, light_lux: 350 },
    { people_count: 3, light_lux: 180 },
    { people_count: 0, light_lux: 310 },
  ])
  assert.deepEqual(summary, { total: 3, unoccupiedCount: 2, daylightCount: 2 })
})
