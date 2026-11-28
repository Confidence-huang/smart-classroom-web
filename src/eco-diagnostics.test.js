import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateEcoStatus, summarizeEcoHistory, TREND_THRESHOLDS } from './eco-diagnostics.js'

test('returns idle status when no telemetry or control device is present', () => {
  const res = evaluateEcoStatus({})
  assert.equal(res.tone, 'idle')
  assert.equal(res.label, '节能策略待机')
})

test('reports LOCAL_OFF emergency lock with error tone', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 2 },
    controlDevice: { telemetry: { mode: 'LOCAL_OFF', fan_out: 0, led_out: 0 } },
  })
  assert.equal(res.tone, 'error')
  assert.equal(res.label, '本地急停锁定')
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

test('detects IAQ ventilation trigger when eCO2 >= 1200 or TVOC >= 400', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 4, eco2_ppm: 1350, tvoc_ppb: 180 },
    controlDevice: { telemetry: { mode: 'AUTO', fan_out: 1, led_out: 0 } },
  })
  assert.equal(res.tone, 'warn')
  assert.equal(res.label, 'IAQ 自动通风中')
})

test('detects high temperature (>=30C) cooling trigger', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 4, temperature_c: 30.5 },
    controlDevice: { telemetry: { mode: 'AUTO' } },
  })
  assert.equal(res.tone, 'warn')
  assert.equal(res.label, '高温强力散热')
})

test('warns when natural daylight is sufficient (>=300 lx) and led is on', () => {
  const res = evaluateEcoStatus({
    telemetry: { people_count: 5, light_lux: 420 },
    controlDevice: { telemetry: { fan_out: 0, led_out: 1, mode: 'REMOTE' } },
  })
  assert.equal(res.tone, 'warn')
  assert.equal(res.label, '自然光充足')
})

test('summarizes unoccupied and daylight samples and exposes firmware thresholds', () => {
  const summary = summarizeEcoHistory([
    { people_count: 0, light_lux: 350 },
    { people_count: 3, light_lux: 180 },
    { people_count: 0, light_lux: 310 },
  ])
  assert.deepEqual(summary, { total: 3, unoccupiedCount: 2, daylightCount: 2 })
  assert.equal(TREND_THRESHOLDS.temp[0].value, 29)
  assert.equal(TREND_THRESHOLDS.light.length, 2)
})
