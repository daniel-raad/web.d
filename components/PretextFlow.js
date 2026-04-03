import React, { useMemo } from 'react'

const LINE_HEIGHT = 28
const FONT_SIZE = 16
const PADDING = 20 // gap between text and spaceman

export default function PretextFlow({ prepared, layoutNextLine, spacemanBounds, containerWidth }) {
  const lines = useMemo(() => {
    if (!prepared || !layoutNextLine || !containerWidth || containerWidth <= 0) return []

    const result = []
    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = 0

    while (true) {
      let availableWidth = containerWidth
      let xOffset = 0

      if (spacemanBounds) {
        const smTop = spacemanBounds.y
        const smBottom = spacemanBounds.y + spacemanBounds.height
        const lineTop = y
        const lineBottom = y + LINE_HEIGHT

        // Does this line vertically overlap the spaceman?
        if (lineBottom > smTop && lineTop < smBottom) {
          const spaceLeft = spacemanBounds.x - PADDING
          const spaceRight = containerWidth - (spacemanBounds.x + spacemanBounds.width) - PADDING

          if (spaceLeft >= spaceRight && spaceLeft > 60) {
            // Text on the left
            availableWidth = spaceLeft
            xOffset = 0
          } else if (spaceRight > 60) {
            // Text on the right
            availableWidth = spaceRight
            xOffset = spacemanBounds.x + spacemanBounds.width + PADDING
          } else {
            // Not enough space on either side, use full width
            availableWidth = containerWidth
            xOffset = 0
          }
        }
      }

      const line = layoutNextLine(prepared, cursor, Math.max(availableWidth, 40))
      if (line === null) break

      result.push({
        text: line.text,
        width: line.width,
        x: xOffset,
        y,
      })

      cursor = line.end
      y += LINE_HEIGHT
    }

    return result
  }, [prepared, layoutNextLine, spacemanBounds, containerWidth])

  const totalHeight = lines.length > 0 ? lines[lines.length - 1].y + LINE_HEIGHT : 0

  return (
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
            fontSize: `${FONT_SIZE}px`,
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
  )
}
