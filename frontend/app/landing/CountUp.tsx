'use client'

import { useEffect, useRef, useState } from 'react'

// COP, es-CO, zero decimals — mirrors rail-core/time.ts formatCop exactly, so the
// animated intermediate frames read like real money ("$45.000"). Reimplemented
// here (not imported) to keep this a leaf client component with no core coupling.
const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// Exponential ease-out: fast to the figure, gentle to rest. Money "lands".
const easeOut = (t: number) => 1 - Math.pow(2, -10 * t)

/**
 * A money figure that counts itself up the first time it scrolls into view — the
 * ledger reacting to the day, not a static print. Honours reduced-motion by
 * showing the final value with no animation.
 */
export default function CountUp({
  to,
  durationMs = 1300,
  className,
}: {
  to: number
  durationMs?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setValue(to)
      return
    }

    let raf = 0
    let start = 0
    const run = (now: number) => {
      if (!start) start = now
      const t = Math.min((now - start) / durationMs, 1)
      setValue(to * easeOut(t))
      if (t < 1) raf = requestAnimationFrame(run)
    }

    const start2 = () => {
      if (done.current) return
      done.current = true
      raf = requestAnimationFrame(run)
      io.disconnect()
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) start2()
      },
      { threshold: 0.4 },
    )
    io.observe(el)

    // Failsafe: never leave money reading "$0" if the observer never fires
    // (short viewport, background tab restored, headless render).
    const failsafe = window.setTimeout(start2, 2500)

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.clearTimeout(failsafe)
    }
  }, [to, durationMs])

  return (
    <span ref={ref} className={className}>
      {COP.format(Math.round(value))}
    </span>
  )
}
