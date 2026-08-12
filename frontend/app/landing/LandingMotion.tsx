'use client'

import { useEffect } from 'react'

/**
 * ONE authored motion moment for the whole page: elements marked [data-reveal]
 * rise + de-blur into place the first time they cross into view, staggered by
 * their `--rv` index. Mounted once; it observes the server-rendered DOM so the
 * page stays a React Server Component with only data-attributes sprinkled in.
 *
 * No-JS / reduced-motion: the CSS default IS the resting (visible) state, so the
 * content is fully legible even if this never runs. We only opt INTO motion by
 * adding `.rv-armed` on the root when animation is welcome.
 */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.landing-shell')
    if (!root) return

    // Nav gains a hairline + soft shadow once the page leaves the top — this runs
    // regardless of motion preference (it's a state change, not an animation).
    const nav = root.querySelector<HTMLElement>('.lz-nav')
    const onScroll = () => {
      if (nav) nav.dataset.scrolled = window.scrollY > 12 ? 'true' : 'false'
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      return () => window.removeEventListener('scroll', onScroll)
    }

    // Arm: switches [data-reveal] elements to their pre-reveal (hidden) state.
    root.classList.add('rv-armed')

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            obs.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    const els = root.querySelectorAll<HTMLElement>('[data-reveal]')
    els.forEach((el) => io.observe(el))

    // Safety net: anything still hidden after 3s (e.g. never intersects on short
    // viewports) is revealed so no content can get stranded off-screen.
    const failsafe = window.setTimeout(() => {
      els.forEach((el) => el.classList.add('is-in'))
    }, 3000)

    return () => {
      io.disconnect()
      window.clearTimeout(failsafe)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return null
}
