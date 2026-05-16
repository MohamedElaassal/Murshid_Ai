import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const applyDocumentTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem('mourchid_theme')
  if (stored === 'light' || stored === 'dark') {
    applyDocumentTheme(stored)
    return stored
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme: Theme = prefersDark ? 'dark' : 'light'
  applyDocumentTheme(theme)
  return theme
}

export const useTheme = (): {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
} => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    applyDocumentTheme(theme)
    window.localStorage.setItem('mourchid_theme', theme)
  }, [theme])

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return { theme, isDark: theme === 'dark', toggleTheme }
}
