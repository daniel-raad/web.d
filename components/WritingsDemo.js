import React, { useState, useRef, useEffect, useMemo } from 'react'
import DraggableSpaceman from './DraggableSpaceman'

const SAMPLE_TEXT = `I build things — AI products, startups, and whatever else I can get my hands on. This page is where I write about what I'm working on and what I'm learning along the way.

The spaceman floating here isn't just decorative — try dragging it around. The text reflows in real time, calculated mathematically using pretext. No DOM measurement, no browser reflow. Pure arithmetic at sixty frames per second.

Sometimes the most interesting things are the small, interactive details. More writing below.`

const LINE_HEIGHT = 26
const FONT = '15px Montserrat'
const COL_GAP = 40
const PADDING = 20

export default function WritingsDemo() {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [spacemanBounds, setSpacemanBounds] = useState(null)
  const [pretextAPI, setPretextAPI] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      import('@chenglou/pretext'),
      document.fonts.ready,
    ]).then(([mod]) => {
      if (cancelled) return
      const prepared = mod.prepareWithSegments(SAMPLE_TEXT, FONT)
      setPretextAPI({ prepared, layoutNextLine: mod.layoutNextLine })
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Two-column layout with spaceman awareness
  const { lines, totalHeight } = useMemo(() => {
    if (!pretextAPI || !containerWidth || containerWidth <= 0) return { lines: [], totalHeight: 400 }
    const { prepared, layoutNextLine } = pretextAPI
    const innerWidth = containerWidth - 64 // 2rem padding each side
    const colWidth = (innerWidth - COL_GAP) / 2

    // First pass: lay out all lines at column width to find midpoint
    const allLines = []
    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    while (true) {
      const line = layoutNextLine(prepared, cursor, colWidth)
      if (line === null) break
      allLines.push({ text: line.text, end: line.end })
      cursor = line.end
    }

    const midpoint = Math.ceil(allLines.length / 2)

    // Second pass: lay out with spaceman awareness, split into columns
    const result = []
    cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let lineIdx = 0

    // Column 1 (left)
    let y = 0
    while (lineIdx < midpoint) {
      let availWidth = colWidth
      let xOff = 0

      if (spacemanBounds) {
        const smTop = spacemanBounds.y
        const smBottom = spacemanBounds.y + spacemanBounds.height
        const smLeft = spacemanBounds.x
        const smRight = spacemanBounds.x + spacemanBounds.width

        if (y + LINE_HEIGHT > smTop && y < smBottom) {
          // Spaceman overlaps this line in column 1 area (0 to colWidth)
          if (smLeft < colWidth + PADDING && smRight > -PADDING) {
            const spLeft = smLeft - PADDING
            const spRight = colWidth - smRight - PADDING

            if (spLeft >= spRight && spLeft > 40) {
              availWidth = spLeft
            } else if (spRight > 40) {
              availWidth = spRight
              xOff = smRight + PADDING
            }
          }
        }
      }

      const line = layoutNextLine(prepared, cursor, Math.max(availWidth, 30))
      if (line === null) break
      result.push({ text: line.text, x: xOff, y })
      cursor = line.end
      y += LINE_HEIGHT
      lineIdx++
    }

    const col1Height = y

    // Column 2 (right)
    y = 0
    const col2X = colWidth + COL_GAP
    while (true) {
      let availWidth = colWidth
      let xOff = col2X

      if (spacemanBounds) {
        const smTop = spacemanBounds.y
        const smBottom = spacemanBounds.y + spacemanBounds.height
        const smLeft = spacemanBounds.x - col2X
        const smRight = smLeft + spacemanBounds.width

        if (y + LINE_HEIGHT > smTop && y < smBottom) {
          if (smLeft < colWidth + PADDING && smRight > -PADDING) {
            const spLeft = Math.max(smLeft, 0) - PADDING
            const spRight = colWidth - Math.min(smRight, colWidth) - PADDING

            if (spLeft >= spRight && spLeft > 40) {
              availWidth = spLeft
              xOff = col2X
            } else if (spRight > 40) {
              availWidth = spRight
              xOff = col2X + Math.min(smRight, colWidth) + PADDING
            }
          }
        }
      }

      const line = layoutNextLine(prepared, cursor, Math.max(availWidth, 30))
      if (line === null) break
      result.push({ text: line.text, x: xOff, y })
      cursor = line.end
      y += LINE_HEIGHT
    }

    const col2Height = y
    return { lines: result, totalHeight: Math.max(col1Height, col2Height) }
  }, [pretextAPI, containerWidth, spacemanBounds])

  return (
    <div className="max-w-4xl mx-auto px-6 pb-10">
      <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
        <h2 style={{
          fontSize: '0.7em',
          fontWeight: 700,
          color: 'var(--text-faint)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          Writing
        </h2>
        <p style={{ fontSize: '0.95em', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Drag the spaceman around. Watch the text reflow.
        </p>
      </div>

      <div
        ref={containerRef}
        style={{
          position: 'relative',
          minHeight: totalHeight + 64,
          background: 'var(--bg-elevated)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {pretextAPI && (
          <>
            <DraggableSpaceman
              onPositionChange={setSpacemanBounds}
              containerRef={containerRef}
            />
            <div style={{ position: 'relative', width: '100%', minHeight: totalHeight }}>
              {lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: line.x,
                    top: line.y,
                    height: LINE_HEIGHT,
                    lineHeight: `${LINE_HEIGHT}px`,
                    fontSize: '15px',
                    fontFamily: 'Montserrat, sans-serif',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre',
                    pointerEvents: 'none',
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </>
        )}

        {!pretextAPI && (
          <p style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Loading...</p>
        )}
      </div>
    </div>
  )
}
