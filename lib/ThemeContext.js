import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggleTheme = useCallback((originX, originY) => {
    const newTheme = theme === 'light' ? 'dark' : 'light'

    const applyTheme = () => {
      document.documentElement.setAttribute('data-theme', newTheme)
      setTheme(newTheme)
      localStorage.setItem('theme', newTheme)
    }

    // Use View Transition API for a real circular reveal
    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--theme-toggle-x', `${originX}px`)
      document.documentElement.style.setProperty('--theme-toggle-y', `${originY}px`)

      const transition = document.startViewTransition(applyTheme)

      transition.finished.then(() => {
        document.documentElement.style.removeProperty('--theme-toggle-x')
        document.documentElement.style.removeProperty('--theme-toggle-y')
      })
    } else {
      // Fallback for older browsers
      applyTheme()
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
