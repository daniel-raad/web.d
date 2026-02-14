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
            fill="rgba(231,76,60,0.1)"
          />
        )}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#e74c3c"
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
            fill="#e74c3c"
            stroke="#0d0f1a"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  )
}
