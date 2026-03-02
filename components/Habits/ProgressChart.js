import React, { useState, useEffect, useMemo } from "react"
import { getEntries, getMonthHabits } from "../../lib/firestore"
import styles from "../../styles/Habits.module.css"

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const RANGES = [
  { key: "1M", label: "1M", months: 1 },
  { key: "3M", label: "3M", months: 3 },
  { key: "6M", label: "6M", months: 6 },
  { key: "ALL", label: "All", months: 12 },
]

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getMonthRange(year, month, numMonths) {
  const months = []
  let y = year, m = month
  for (let i = 0; i < numMonths; i++) {
    months.unshift({ year: y, month: m })
    m--
    if (m < 1) { m = 12; y-- }
  }
  return months
}

export default function ProgressChart({ year, month, habits, entries }) {
  const [range, setRange] = useState("1M")
  const [extEntries, setExtEntries] = useState({})
  const [extHabits, setExtHabits] = useState(null)
  const [loadingExt, setLoadingExt] = useState(false)

  const rangeConfig = RANGES.find((r) => r.key === range)
  const monthList = useMemo(() => getMonthRange(year, month, rangeConfig.months), [year, month, rangeConfig.months])

  // Fetch extended data when range changes
  useEffect(() => {
    if (range === "1M") {
      setExtEntries({})
      setExtHabits(null)
      return
    }

    let cancelled = false
    setLoadingExt(true)

    async function load() {
      // Fetch entries for all months in range (except current which we already have)
      const extraMonths = monthList.filter((m) => !(m.year === year && m.month === month))
      const results = await Promise.all(extraMonths.map((m) => getEntries(m.year, m.month)))
      // Also fetch habits for earliest month to get habit definitions
      const earliestMonth = monthList[0]
      const earlyHabits = await getMonthHabits(earliestMonth.year, earliestMonth.month)

      if (cancelled) return
      const merged = {}
      results.forEach((r) => Object.assign(merged, r))
      setExtEntries(merged)
      setExtHabits(earlyHabits)
      setLoadingExt(false)
    }

    load()
    return () => { cancelled = true }
  }, [range, year, month, monthList])

  // Combine all entries
  const allEntries = range === "1M" ? entries : { ...extEntries, ...entries }
  // Use current habits for consistency (habit definitions may change month to month)
  const chartHabits = habits

  // Build flat date list for the range
  const dateList = useMemo(() => {
    const dates = []
    for (const m of monthList) {
      const days = daysInMonth(m.year, m.month)
      for (let d = 1; d <= days; d++) {
        dates.push({ year: m.year, month: m.month, day: d, dateStr: formatDateStr(m.year, m.month, d) })
      }
    }
    return dates
  }, [monthList])

  const totalDays = dateList.length

  const W = 250
  const H = 160
  const PAD = { top: 10, right: 10, bottom: 20, left: 30 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  // Daily progress points
  const points = []
  dateList.forEach((dt, i) => {
    const entry = allEntries[dt.dateStr]
    if (!entry) return
    const done = chartHabits.filter((h) => entry.habits && entry.habits[h.id]).length
    const pct = chartHabits.length > 0 ? (done / chartHabits.length) * 100 : 0
    const x = PAD.left + (i / Math.max(totalDays - 1, 1)) * plotW
    const y = PAD.top + plotH - (pct / 100) * plotH
    points.push({ i, x, y, pct, dateStr: dt.dateStr })
  })
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ")

  // Weight points
  const weightPoints = []
  dateList.forEach((dt, i) => {
    const entry = allEntries[dt.dateStr]
    if (!entry || entry.weight == null) return
    weightPoints.push({ i, weight: entry.weight, dateStr: dt.dateStr })
  })

  let wMin = Infinity, wMax = -Infinity
  for (const p of weightPoints) {
    if (p.weight < wMin) wMin = p.weight
    if (p.weight > wMax) wMax = p.weight
  }
  const wRange = wMax - wMin || 1
  wMin = wMin - wRange * 0.1
  wMax = wMax + wRange * 0.1
  const wSpan = wMax - wMin

  const weightMapped = weightPoints.map((p) => ({
    ...p,
    x: PAD.left + (p.i / Math.max(totalDays - 1, 1)) * plotW,
    y: PAD.top + plotH - ((p.weight - wMin) / wSpan) * plotH,
  }))
  const weightPolyline = weightMapped.map((p) => `${p.x},${p.y}`).join(" ")

  const wLabelCount = 4
  const wLabels = []
  for (let i = 0; i < wLabelCount; i++) {
    const val = wMin + (i / (wLabelCount - 1)) * wSpan
    wLabels.push(Math.round(val * 10) / 10)
  }

  // Sleep points
  const sleepPoints = []
  dateList.forEach((dt, i) => {
    const entry = allEntries[dt.dateStr]
    if (!entry || entry.sleep == null) return
    sleepPoints.push({ i, sleep: entry.sleep, dateStr: dt.dateStr })
  })

  let sMin = Infinity, sMax = -Infinity
  for (const p of sleepPoints) {
    if (p.sleep < sMin) sMin = p.sleep
    if (p.sleep > sMax) sMax = p.sleep
  }
  const sRange = sMax - sMin || 1
  sMin = sMin - sRange * 0.1
  sMax = sMax + sRange * 0.1
  const sSpan = sMax - sMin

  const sleepMapped = sleepPoints.map((p) => ({
    ...p,
    x: PAD.left + (p.i / Math.max(totalDays - 1, 1)) * plotW,
    y: PAD.top + plotH - ((p.sleep - sMin) / sSpan) * plotH,
  }))
  const sleepPolyline = sleepMapped.map((p) => `${p.x},${p.y}`).join(" ")

  const sLabelCount = 4
  const sLabels = []
  for (let i = 0; i < sLabelCount; i++) {
    const val = sMin + (i / (sLabelCount - 1)) * sSpan
    sLabels.push(Math.round(val * 10) / 10)
  }

  // X-axis labels based on range
  const xAxisLabels = useMemo(() => {
    if (range === "1M") {
      const days = daysInMonth(year, month)
      return [1, Math.ceil(days / 2), days].map((d) => ({
        label: String(d),
        idx: d - 1,
      }))
    }
    // For multi-month: show month abbreviations at month boundaries
    const labels = []
    let runningIdx = 0
    for (const m of monthList) {
      const days = daysInMonth(m.year, m.month)
      // Place label at the start of each month
      labels.push({
        label: MONTH_ABBRS[m.month - 1],
        idx: runningIdx,
      })
      runningIdx += days
    }
    return labels
  }, [range, year, month, monthList])

  // Reduce dot size for larger ranges
  const dotR = range === "1M" ? 2.5 : range === "3M" ? 1.8 : 1.2

  const rangeSelector = (
    <div className={styles.chartRangeSelector}>
      {RANGES.map((r) => (
        <button
          key={r.key}
          className={`${styles.chartRangeBtn} ${range === r.key ? styles.chartRangeBtnActive : ""}`}
          onClick={() => setRange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
  )

  function renderChart(title, dataPoints, mappedPoints, polylineStr, color, fillColor, yLabelsArr, yMin, ySpan, unitSuffix, extraStyle) {
    if (dataPoints.length === 0) return null
    const isPercent = unitSuffix === "%"
    return (
      <>
        <div className={styles.chartTitle} style={extraStyle}>{title}</div>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
          {/* Grid lines */}
          {yLabelsArr.map((v, i) => {
            const y = isPercent
              ? PAD.top + plotH - (v / 100) * plotH
              : PAD.top + plotH - ((v - yMin) / ySpan) * plotH
            return (
              <g key={i}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                <text x={PAD.left - 4} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="end">
                  {isPercent ? `${v}%` : v}
                </text>
              </g>
            )
          })}

          {/* X-axis labels */}
          {xAxisLabels.map((xl, i) => {
            const x = PAD.left + (xl.idx / Math.max(totalDays - 1, 1)) * plotW
            return (
              <text key={i} x={x} y={H - 4} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor={range === "1M" ? "middle" : "start"}>
                {xl.label}
              </text>
            )
          })}

          {/* Area fill */}
          {mappedPoints.length > 1 && (
            <polygon
              points={`${PAD.left},${PAD.top + plotH} ${polylineStr} ${mappedPoints[mappedPoints.length - 1].x},${PAD.top + plotH}`}
              fill={fillColor}
            />
          )}

          {/* Line */}
          {mappedPoints.length > 1 && (
            <polyline points={polylineStr} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots */}
          {mappedPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={dotR} fill={color} stroke="#0d0f1a" strokeWidth="0.8">
              {p.pct !== undefined && <title>{Math.round(p.pct)}%</title>}
              {p.weight !== undefined && <title>{p.weight} kg</title>}
              {p.sleep !== undefined && <title>{p.sleep} hrs</title>}
            </circle>
          ))}
        </svg>
      </>
    )
  }

  const yLabelsProgress = [0, 25, 50, 75, 100]

  return (
    <div className={styles.chartPanel}>
      {rangeSelector}
      {loadingExt && <div className={styles.chartLoading}>Loading...</div>}

      {renderChart("Daily Progress", points, points, polyline, "#3b82f6", "rgba(59,130,246,0.1)", yLabelsProgress, 0, 100, "%", undefined)}
      {renderChart("Sleep (hrs)", sleepPoints, sleepMapped, sleepPolyline, "#22c55e", "rgba(34,197,94,0.1)", sLabels, sMin, sSpan, "", { marginTop: "1rem" })}
      {renderChart("Weight (kg)", weightPoints, weightMapped, weightPolyline, "#8b5cf6", "rgba(139,92,246,0.1)", wLabels, wMin, wSpan, "", { marginTop: "1rem" })}
    </div>
  )
}
