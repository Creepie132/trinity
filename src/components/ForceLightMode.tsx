'use client'

import { useEffect } from 'react'

/**
 * Runs once on mount and:
 * 1. Removes any dark-mode class that may have been persisted on <html>
 * 2. Clears every theme/dark-mode key from localStorage so users
 *    who had dark mode enabled in a previous session get light mode.
 */
export function ForceLightMode() {
  useEffect(() => {
    // Clear all dark/theme related localStorage keys
    const keysToRemove = [
      'theme',
      'color-theme',
      'darkMode',
      'trinity-dark-mode',
      'trinity-theme',
    ]
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // Guarantee the dark class is never on <html>
    document.documentElement.classList.remove('dark')
  }, [])

  return null
}
