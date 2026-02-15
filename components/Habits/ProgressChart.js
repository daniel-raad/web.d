import React from "react"
import styles from "../../styles/Habits.module.css"

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export default function ProgressChart({ year, month, habits, entries }) {
  const totalDays = daysInMonth(year, month)
  const W = 250
  const H = 160
  const PAD = { top: 10, right: 10, bottom: 20, left: 30 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const points = []
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDate(year, month, d)
    const entry = entries[dateStr]
    if (!entry) continue
    const done = habits.filter((h) => entry.habits && entry.habits[h.id]).length
    const pct = habits.length > 0 ? (done / habits.length) * 100 : 0
    const x = PAD.left + ((d - 1) / (totalDays - 1)) * plotW
    const y = PAD.top + plotH - (pct / 100) * plotH
    points.push({ d, x, y, pct })
  }

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ")

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100]

  // Weight chart data
  const weightPoints = []
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDate(year, month, d)
    const entry = entries[dateStr]
    if (!entry || entry.weight == null) continue
    weightPoints.push({ d, weight: entry.weight })
  }

  let wMin = Infinity, wMax = -Infinity
  for (const p of weightPoints) {
    if (p.weight < wMin) wMin = p.weight
    if (p.weight > wMax) wMax = p.weight
  }
  // Add some padding to the range
  const wRange = wMax - wMin || 1
  wMin = wMin - wRange * 0.1
  wMax = wMax + wRange * 0.1
  const wSpan = wMax - wMin

  const weightMapped = weightPoints.map((p) => ({
    ...p,
    x: PAD.left + ((p.d - 1) / (totalDays - 1)) * plotW,
    y: PAD.top + plotH - ((p.weight - wMin) / wSpan) * plotH,
  }))
  const weightPolyline = weightMapped.map((p) => `${p.x},${p.y}`).join(" ")

  // Generate nice Y-axis labels for weight
  const wLabelCount = 4
  const wLabels = []
  for (let i = 0; i < wLabelCount; i++) {
    const val = wMin + (i / (wLabelCount - 1)) * wSpan
    wLabels.push(Math.round(val * 10) / 10)
  }

  // Sleep chart data
  const sleepPoints = []
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDate(year, month, d)
    const entry = entries[dateStr]
    if (!entry || entry.sleep == null) continue
    sleepPoints.push({ d, sleep: entry.sleep })
  }

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
    x: PAD.left + ((p.d - 1) / (totalDays - 1)) * plotW,
    y: PAD.top + plotH - ((p.sleep - sMin) / sSpan) * plotH,
  }))
  const sleepPolyline = sleepMapped.map((p) => `${p.x},${p.y}`).join(" ")

  const sLabelCount = 4
  const sLabels = []
  for (let i = 0; i < sLabelCount; i++) {
    const val = sMin + (i / (sLabelCount - 1)) * sSpan
    sLabels.push(Math.round(val * 10) / 10)
  }

  return (
    <div className={styles.chartPanel}>
      <div className={styles.chartTitle}>Daily Progress</div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
        {/* Grid lines */}
        {yLabels.map((v) => {
          const y = PAD.top + plotH - (v / 100) * plotH
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
              <text
                x={PAD.left - 4}
                y={y + 3}
                fill="rgba(255,255,255,0.3)"
                fontSize="7"
                textAnchor="end"
              >
                {v}%
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {[1, Math.ceil(totalDays / 2), totalDays].map((d) => {
          const x = PAD.left + ((d - 1) / (totalDays - 1)) * plotW
          return (
            <text
              key={d}
              x={x}
              y={H - 4}
              fill="rgba(255,255,255,0.3)"
              fontSize="7"
              textAnchor="middle"
            >
              {d}
            </text>
          )
        })}

        {/* Area fill */}
        {points.length > 1 && (
          <polygon
            points={`${PAD.left},${PAD.top + plotH} ${polyline} ${points[points.length - 1].x},${PAD.top + plotH}`}
            fill="rgba(59,130,246,0.1)"
          />
        )}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {points.map((p) => (
          <circle
            key={p.d}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill="#3b82f6"
            stroke="#0d0f1a"
            strokeWidth="1"
          />
        ))}
      </svg>

      {sleepPoints.length > 0 && (
        <>
          <div className={styles.chartTitle} style={{ marginTop: "1rem" }}>Sleep (hrs)</div>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
            {sLabels.map((v, i) => {
              const y = PAD.top + plotH - ((v - sMin) / sSpan) * plotH
              return (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={PAD.left - 4}
                    y={y + 3}
                    fill="rgba(255,255,255,0.3)"
                    fontSize="7"
                    textAnchor="end"
                  >
                    {v}
                  </text>
                </g>
              )
            })}

            {[1, Math.ceil(totalDays / 2), totalDays].map((d) => {
              const x = PAD.left + ((d - 1) / (totalDays - 1)) * plotW
              return (
                <text
                  key={d}
                  x={x}
                  y={H - 4}
                  fill="rgba(255,255,255,0.3)"
                  fontSize="7"
                  textAnchor="middle"
                >
                  {d}
                </text>
              )
            })}

            {sleepMapped.length > 1 && (
              <polygon
                points={`${PAD.left},${PAD.top + plotH} ${sleepPolyline} ${sleepMapped[sleepMapped.length - 1].x},${PAD.top + plotH}`}
                fill="rgba(34,197,94,0.1)"
              />
            )}

            {sleepMapped.length > 1 && (
              <polyline
                points={sleepPolyline}
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {sleepMapped.map((p) => (
              <circle
                key={p.d}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill="#22c55e"
                stroke="#0d0f1a"
                strokeWidth="1"
              >
                <title>{p.sleep} hrs</title>
              </circle>
            ))}
          </svg>
        </>
      )}

      {weightPoints.length > 0 && (
        <>
          <div className={styles.chartTitle} style={{ marginTop: "1rem" }}>Weight (kg)</div>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
            {/* Grid lines */}
            {wLabels.map((v, i) => {
              const y = PAD.top + plotH - ((v - wMin) / wSpan) * plotH
              return (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={PAD.left - 4}
                    y={y + 3}
                    fill="rgba(255,255,255,0.3)"
                    fontSize="7"
                    textAnchor="end"
                  >
                    {v}
                  </text>
                </g>
              )
            })}

            {/* X-axis labels */}
            {[1, Math.ceil(totalDays / 2), totalDays].map((d) => {
              const x = PAD.left + ((d - 1) / (totalDays - 1)) * plotW
              return (
                <text
                  key={d}
                  x={x}
                  y={H - 4}
                  fill="rgba(255,255,255,0.3)"
                  fontSize="7"
                  textAnchor="middle"
                >
                  {d}
                </text>
              )
            })}

            {/* Area fill */}
            {weightMapped.length > 1 && (
              <polygon
                points={`${PAD.left},${PAD.top + plotH} ${weightPolyline} ${weightMapped[weightMapped.length - 1].x},${PAD.top + plotH}`}
                fill="rgba(139,92,246,0.1)"
              />
            )}

            {/* Line */}
            {weightMapped.length > 1 && (
              <polyline
                points={weightPolyline}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Dots */}
            {weightMapped.map((p) => (
              <circle
                key={p.d}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill="#8b5cf6"
                stroke="#0d0f1a"
                strokeWidth="1"
              >
                <title>{p.weight} kg</title>
              </circle>
            ))}
          </svg>
        </>
      )}
    </div>
  )
}
