'use client'

import { useEffect, useState } from 'react'

// DEV ONLY — overlay FPS instantané + moyenne glissante (~2s).
// À retirer avant commit final.
export default function FpsCounter() {
  const [fps, setFps] = useState(60)
  const [avg, setAvg] = useState(60)
  const [min, setMin] = useState(60)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    let rafId = 0
    let frames = 0
    let lastTime = performance.now()
    const samples: number[] = []
    let minSeen = 60

    const tick = (now: number) => {
      frames++
      const dt = now - lastTime
      if (dt >= 250) {
        const f = Math.round((frames * 1000) / dt)
        setFps(f)
        samples.push(f)
        if (samples.length > 8) samples.shift()
        setAvg(Math.round(samples.reduce((s, v) => s + v, 0) / samples.length))
        if (f < minSeen) { minSeen = f; setMin(f) }
        frames = 0
        lastTime = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  if (process.env.NODE_ENV !== 'development') return null

  const color = fps >= 55 ? '#7ee787' : fps >= 30 ? '#f7c873' : '#ff7b72'

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        background: 'rgba(0,0,0,0.78)',
        color,
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.4,
        zIndex: 99999,
        borderRadius: 4,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div>FPS: {fps}</div>
      <div style={{ opacity: 0.8 }}>avg: {avg}</div>
      <div style={{ opacity: 0.8 }}>min: {min}</div>
    </div>
  )
}
