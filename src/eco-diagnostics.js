/**
 * 纯前端节能运行状态与历史样本诊断（仅基于真实遥测与设备控制状态，不虚构能耗数值）。
 */

export function evaluateEcoStatus({ telemetry, controlDevice } = {}) {
  if (!telemetry && !controlDevice?.telemetry) {
    return {
      tone: 'idle',
      label: '节能策略待机',
      detail: '接入实时遥测后自动评估空场待机与自然光状态。',
    }
  }

  const t = controlDevice?.telemetry || {}
  const people = telemetry?.people_count ?? (t.vision_valid ? t.count : null)
  const lux = telemetry?.light_lux ?? null
  const fanOn = Boolean(t.fan_out)
  const ledOn = Boolean(t.led_out)
  const mode = t.mode || null

  if (people === 0 && (fanOn || ledOn)) {
    const active = [fanOn ? '风扇' : null, ledOn ? '灯环' : null].filter(Boolean).join('与')
    return {
      tone: 'warn',
      label: '空场空耗预警',
      detail: `当前识别 0 人，但${active}仍处于开启状态，建议执行离场节能或等待 AUTO 关断。`,
    }
  }

  if (people === 0) {
    return {
      tone: 'live',
      label: '无人节能待机',
      detail: mode === 'AUTO'
        ? '当前教室无人，设备已处于 AUTO 低功耗待机状态。'
        : '当前教室无人，主要可控负载已关闭。',
    }
  }

  if (lux != null && Number(lux) >= 300 && ledOn) {
    return {
      tone: 'warn',
      label: '自然光充足',
      detail: `当前照度 ${lux} lx（≥300 lx），可关闭教室灯环以减少照明能耗。`,
    }
  }

  if (mode === 'AUTO') {
    return {
      tone: 'live',
      label: 'AUTO 策略护航',
      detail: '设备正按人数、温湿度与照度门限自动调节负载。',
    }
  }

  return {
    tone: 'live',
    label: '按需运行中',
    detail: people != null ? `当前在场 ${people} 人，系统持续监测环境与空耗风险。` : '系统持续监测环境与空耗风险。',
  }
}

export function summarizeEcoHistory(historyRows) {
  if (!Array.isArray(historyRows) || historyRows.length === 0) {
    return null
  }
  let unoccupiedCount = 0
  let daylightCount = 0
  for (const row of historyRows) {
    if (row?.people_count === 0) unoccupiedCount += 1
    if (row?.light_lux != null && Number(row.light_lux) >= 300) daylightCount += 1
  }
  return {
    total: historyRows.length,
    unoccupiedCount,
    daylightCount,
  }
}
