import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLinkedin, faGithub } from '@fortawesome/free-brands-svg-icons'
import DraggableSpaceman from './DraggableSpaceman'
import styles from '../styles/Description.module.css'

const ABOUT_TEXT = "Building products end-to-end. Forward Deployed Operations Engineer at Palantir and Co-founder of Conversify, an AI-driven WhatsApp marketing platform. I spend my days deploying AI, and my evenings building a startup from scratch."

const LINE_HEIGHT = 28
const FONT = '16px Montserrat'

export default function HomeContent() {
  const textRef = useRef(null)
  const [textWidth, setTextWidth] = useState(0)
  const [spacemanPos, setSpacemanPos] = useState(null)
  const [pretextAPI, setPretextAPI] = useState(null)

  // Load pretext + wait for fonts
  useEffect(() => {
    let cancelled = false
    Promise.all([
      import('@chenglou/pretext'),
      document.fonts.ready,
    ]).then(([mod]) => {
      if (cancelled) return
      const prepared = mod.prepareWithSegments(ABOUT_TEXT, FONT)
      setPretextAPI({ prepared, layoutNextLine: mod.layoutNextLine })
    })
    return () => { cancelled = true }
  }, [])

  // Track text container width
  useEffect(() => {
    if (!textRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setTextWidth(entry.contentRect.width)
    })
    observer.observe(textRef.current)
    return () => observer.disconnect()
  }, [])

  // Convert spaceman's fixed (viewport) position to text-container-relative position
  const spacemanBounds = useMemo(() => {
    if (!spacemanPos || !textRef.current) return null
    const rect = textRef.current.getBoundingClientRect()
    return {
      x: spacemanPos.x - rect.left,
      y: spacemanPos.y - rect.top,
      width: spacemanPos.width,
      height: spacemanPos.height,
    }
  }, [spacemanPos])

  // Lay out text lines around spaceman
  const lines = useMemo(() => {
    if (!pretextAPI || !textWidth || textWidth <= 0) return null
    const { prepared, layoutNextLine } = pretextAPI
    const result = []
    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = 0
    const PADDING = 20

    while (true) {
      let availableWidth = textWidth
      let xOffset = 0

      if (spacemanBounds) {
        const smTop = spacemanBounds.y
        const smBottom = spacemanBounds.y + spacemanBounds.height
        const lineTop = y
        const lineBottom = y + LINE_HEIGHT

        if (lineBottom > smTop && lineTop < smBottom) {
          const spaceLeft = spacemanBounds.x - PADDING
          const spaceRight = textWidth - (spacemanBounds.x + spacemanBounds.width) - PADDING

          if (spaceLeft >= spaceRight && spaceLeft > 60) {
            availableWidth = spaceLeft
          } else if (spaceRight > 60) {
            availableWidth = spaceRight
            xOffset = spacemanBounds.x + spacemanBounds.width + PADDING
          }
        }
      }

      const line = layoutNextLine(prepared, cursor, Math.max(availableWidth, 40))
      if (line === null) break
      result.push({ text: line.text, x: xOffset, y })
      cursor = line.end
      y += LINE_HEIGHT
    }
    return result
  }, [pretextAPI, textWidth, spacemanBounds])

  const textHeight = lines && lines.length > 0 ? lines[lines.length - 1].y + LINE_HEIGHT : 120

  const handleSpacemanMove = (bounds) => {
    // bounds is { x, y, width, height } in viewport coords (fixed positioning)
    setSpacemanPos(bounds)
  }

  return (
    <div>
      {/* Hero section — horizontal layout */}
      <section style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '5rem 2rem 2rem',
        maxWidth: '42rem',
        margin: '0 auto',
        minHeight: 200,
      }}>
        {/* Spaceman occupies this space initially but is position:fixed */}
        <div style={{ width: 188, height: 188, flexShrink: 0 }} />
        <div>
          <h1 style={{
            fontSize: '2.8em',
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}>Daniel Raad</h1>
          <p style={{
            fontSize: '1.15em',
            fontWeight: 400,
            color: 'var(--text-muted)',
            margin: '0.4rem 0 0',
          }}>I build things</p>
        </div>
      </section>

      {/* Draggable spaceman — fixed position, starts aligned with hero */}
      <DraggableSpaceman
        onPositionChange={handleSpacemanMove}
        initialPos={{ x: Math.max((typeof window !== 'undefined' ? (window.innerWidth - 672) / 2 : 0) + 24, 24), y: 80 }}
      />

      {/* Content area */}
      <div className="max-w-2xl mx-auto px-6 pb-10">
        <div className={styles.content} style={{ paddingTop: '1rem' }}>
          {/* About card with pretext-rendered text */}
          <div className={styles.card}>
            <h2 className={styles.sectionHeader}>About</h2>
            <div
              ref={textRef}
              style={{
                position: 'relative',
                minHeight: textHeight,
                fontSize: '16px',
                fontFamily: 'Montserrat, sans-serif',
                lineHeight: `${LINE_HEIGHT}px`,
              }}
            >
              {lines ? (
                lines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: line.x,
                      top: line.y,
                      height: LINE_HEIGHT,
                      lineHeight: `${LINE_HEIGHT}px`,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre',
                      pointerEvents: 'none',
                    }}
                  >
                    {line.text}
                  </div>
                ))
              ) : (
                // Fallback before pretext loads — shows normal text
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  {ABOUT_TEXT}
                </p>
              )}
            </div>
          </div>

          {/* Find me card — normal DOM */}
          <div className={styles.card}>
            <h2 className={styles.sectionHeader}>Find me</h2>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <a href="https://www.linkedin.com/in/daniel-raad-784b4b231/" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faLinkedin} style={{ marginRight: '0.4em' }} />LinkedIn</a>
              </li>
              <li className={styles.linkItem}>
                <a href="https://github.com/daniel-raad" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faGithub} style={{ marginRight: '0.4em' }} />GitHub</a>
              </li>
              <li className={styles.linkItem}>
                <Link href="/dashboard">Dashboard</Link>
              </li>
            </ul>
          </div>

          {/* Nav buttons — normal DOM */}
          <div className={styles.navButtons}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/cv" target="_blank" rel="noopener noreferrer" className={styles.navButton}>
              CV
            </a>
            <Link href="/writings">
              <a className={styles.navButton}>Writing</a>
            </Link>
            <Link href="/projects">
              <a className={styles.navButton}>Projects</a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
