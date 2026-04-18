'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Ensure hydration matches
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="btn btn-ghost" style={{ padding: '0.4rem' }} disabled>
        <span style={{ width: 20, height: 20 }} />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="btn btn-ghost"
      title="Cambiar tema"
      style={{ 
        width: 40, 
        height: 40, 
        padding: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        flexShrink: 0
      }}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
