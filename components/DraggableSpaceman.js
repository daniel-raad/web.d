import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext'

const SPACEMAN_SIZE = 140
const PORTAL_INSET = 24  // portal extends this far beyond the image on each side

export default function DraggableSpaceman({ onPositionChange, containerRef, initialPos }) {
  const { toggleTheme } = useTheme()
  const [position, setPosition] = useState(null)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const pointerStart = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const elRef = useRef(null)

  const isConstrained = !!containerRef

  // Initialize position
  useEffect(() => {
    if (initialPos) {
      setPosition(initialPos)
      return
    }
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const initialX = rect.width - SPACEMAN_SIZE - 60
      const initialY = 40
      setPosition({ x: initialX, y: initialY })
      onPositionChange?.({ x: initialX - PORTAL_INSET, y: initialY - PORTAL_INSET, width: SPACEMAN_SIZE + PORTAL_INSET * 2, height: SPACEMAN_SIZE + PORTAL_INSET * 2 })
    } else {
      // Free-floating mode: center horizontally, position near top (hero area)
      const x = (window.innerWidth - SPACEMAN_SIZE) / 2
      const y = 80
      setPosition({ x, y })
      onPositionChange?.({ x: x - PORTAL_INSET, y: y - PORTAL_INSET, width: SPACEMAN_SIZE + PORTAL_INSET * 2, height: SPACEMAN_SIZE + PORTAL_INSET * 2 })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    e.target.setPointerCapture(e.pointerId)
    setIsDragging(true)
    hasMoved.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    const rect = elRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (elRef.current) {
      const rect = elRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)))
      const deltaY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)))
      setTilt({
        rotateX: -deltaY * 15,
        rotateY: deltaX * 15,
      })
    }

    if (!isDragging) return

    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved.current = true
    }

    if (isConstrained && containerRef.current) {
      // Constrained to container (writings page)
      const containerRect = containerRef.current.getBoundingClientRect()
      const newX = e.clientX - containerRect.left - dragOffset.current.x
      const newY = e.clientY - containerRect.top - dragOffset.current.y
      const clampedX = Math.max(0, Math.min(newX, containerRect.width - SPACEMAN_SIZE))
      const clampedY = Math.max(0, Math.min(newY, containerRect.height - SPACEMAN_SIZE))
      setPosition({ x: clampedX, y: clampedY })
      onPositionChange?.({ x: clampedX - PORTAL_INSET, y: clampedY - PORTAL_INSET, width: SPACEMAN_SIZE + PORTAL_INSET * 2, height: SPACEMAN_SIZE + PORTAL_INSET * 2 })
    } else {
      // Free-floating (homepage) — fixed positioning, clamped to viewport
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      const clampedX = Math.max(0, Math.min(newX, window.innerWidth - SPACEMAN_SIZE))
      const clampedY = Math.max(0, Math.min(newY, window.innerHeight - SPACEMAN_SIZE))
      setPosition({ x: clampedX, y: clampedY })
      onPositionChange?.({ x: clampedX - PORTAL_INSET, y: clampedY - PORTAL_INSET, width: SPACEMAN_SIZE + PORTAL_INSET * 2, height: SPACEMAN_SIZE + PORTAL_INSET * 2 })
    }
  }, [isDragging, isConstrained, onPositionChange, containerRef])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setTilt({ rotateX: 0, rotateY: 0 })

    if (!hasMoved.current && elRef.current) {
      const rect = elRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      toggleTheme(centerX, centerY)
    }
  }, [toggleTheme])

  if (!position) return null

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: isConstrained ? 'absolute' : 'fixed',
        left: position.x,
        top: position.y,
        width: SPACEMAN_SIZE,
        height: SPACEMAN_SIZE,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 9998 : 10,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ width: '100%', height: '100%', perspective: '600px' }}>
        <div style={{
          width: '100%',
          height: '100%',
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}>
          {/* Space portal backdrop */}
          <div style={{
            position: 'absolute',
            inset: -24,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #0b0d17 0%, #141832 45%, rgba(26,31,61,0.6) 62%, transparent 72%)',
            zIndex: 0,
            boxShadow: 'inset 0 0 20px rgba(100,180,255,0.1), 0 0 60px rgba(100,180,255,0.08), 0 0 120px rgba(100,180,255,0.04)',
          }} />
          {/* Stars */}
          <div style={{
            position: 'absolute',
            inset: -24,
            borderRadius: '50%',
            backgroundImage: [
              'radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent)',
              'radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.5), transparent)',
              'radial-gradient(1.5px 1.5px at 40% 70%, rgba(255,255,255,0.7), transparent)',
              'radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.4), transparent)',
              'radial-gradient(1px 1px at 15% 65%, rgba(255,255,255,0.5), transparent)',
              'radial-gradient(1.5px 1.5px at 70% 80%, rgba(255,255,255,0.6), transparent)',
              'radial-gradient(1px 1px at 35% 15%, rgba(255,255,255,0.4), transparent)',
              'radial-gradient(1px 1px at 85% 25%, rgba(255,255,255,0.5), transparent)',
            ].join(', '),
            zIndex: 0,
            pointerEvents: 'none',
          }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/astro.png"
            alt="Drag me! Click to toggle theme."
            draggable={false}
            style={{
              position: 'relative',
              zIndex: 1,
              borderRadius: '50%',
              border: '2px solid rgba(100, 180, 255, 0.25)',
              filter: 'drop-shadow(0 0 16px rgba(100, 180, 255, 0.3))',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>
    </div>
  )
}
