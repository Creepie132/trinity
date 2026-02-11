'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'default' | 'purple' | 'green' | 'orange' | 'pink' | 'dark'
export type Layout = 'classic' | 'modern' | 'compact'

export interface CustomizationSettings {
  // Sidebar
  sidebarPosition: 'right' | 'left'
  sidebarWidth: 'narrow' | 'normal' | 'wide'
  sidebarCollapsible: boolean
  
  // Cards
  cardStyle: 'flat' | 'shadow' | 'border' | 'glassmorphic'
  cardRoundness: 'none' | 'small' | 'medium' | 'large'
  cardSpacing: 'tight' | 'normal' | 'spacious'
  
  // Typography
  fontSize: 'small' | 'normal' | 'large'
  fontWeight: 'light' | 'normal' | 'bold'
  
  // Tables
  tableStyle: 'minimal' | 'striped' | 'bordered' | 'cards'
  tableDensity: 'compact' | 'normal' | 'comfortable'
  
  // Animations
  animations: boolean
  transitionSpeed: 'fast' | 'normal' | 'slow'
}

const defaultCustomization: CustomizationSettings = {
  sidebarPosition: 'right',
  sidebarWidth: 'normal',
  sidebarCollapsible: false,
  cardStyle: 'shadow',
  cardRoundness: 'medium',
  cardSpacing: 'normal',
  fontSize: 'normal',
  fontWeight: 'normal',
  tableStyle: 'striped',
  tableDensity: 'normal',
  animations: true,
  transitionSpeed: 'normal',
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  layout: Layout
  setLayout: (layout: Layout) => void
  customization: CustomizationSettings
  updateCustomization: (settings: Partial<CustomizationSettings>) => void
  resetCustomization: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const themes = {
  default: {
    primary: '#3b82f6', // blue-500
    secondary: '#60a5fa', // blue-400
    accent: '#2563eb', // blue-600
    name: 'כחול (ברירת מחדל)',
    gradient: 'from-blue-500 to-blue-600',
  },
  purple: {
    primary: '#a855f7', // purple-500
    secondary: '#c084fc', // purple-400
    accent: '#9333ea', // purple-600
    name: 'סגול',
    gradient: 'from-purple-500 to-purple-600',
  },
  green: {
    primary: '#22c55e', // green-500
    secondary: '#4ade80', // green-400
    accent: '#16a34a', // green-600
    name: 'ירוק',
    gradient: 'from-green-500 to-green-600',
  },
  orange: {
    primary: '#f97316', // orange-500
    secondary: '#fb923c', // orange-400
    accent: '#ea580c', // orange-600
    name: 'כתום',
    gradient: 'from-orange-500 to-orange-600',
  },
  pink: {
    primary: '#ec4899', // pink-500
    secondary: '#f472b6', // pink-400
    accent: '#db2777', // pink-600
    name: 'ורוד',
    gradient: 'from-pink-500 to-pink-600',
  },
  dark: {
    primary: '#6366f1', // indigo-500
    secondary: '#818cf8', // indigo-400
    accent: '#4f46e5', // indigo-600
    name: 'כהה (אינדיגו)',
    gradient: 'from-indigo-500 to-indigo-600',
  },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('default')
  const [layout, setLayoutState] = useState<Layout>('classic')
  const [customization, setCustomizationState] = useState<CustomizationSettings>(defaultCustomization)

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('trinity-theme') as Theme
    if (savedTheme && themes[savedTheme]) {
      setThemeState(savedTheme)
      applyTheme(savedTheme)
    }

    // Load layout from localStorage
    const savedLayout = localStorage.getItem('trinity-layout') as Layout
    if (savedLayout && ['classic', 'modern', 'compact'].includes(savedLayout)) {
      setLayoutState(savedLayout)
      applyLayout(savedLayout)
    }

    // Load customization from localStorage
    const savedCustomization = localStorage.getItem('trinity-customization')
    if (savedCustomization) {
      try {
        const parsed = JSON.parse(savedCustomization)
        setCustomizationState({ ...defaultCustomization, ...parsed })
        applyCustomization({ ...defaultCustomization, ...parsed })
      } catch (e) {
        console.error('Failed to parse customization settings:', e)
      }
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('trinity-theme', newTheme)
    applyTheme(newTheme)
  }

  const setLayout = (newLayout: Layout) => {
    setLayoutState(newLayout)
    localStorage.setItem('trinity-layout', newLayout)
    applyLayout(newLayout)
  }

  const applyTheme = (themeName: Theme) => {
    const themeColors = themes[themeName]
    document.documentElement.style.setProperty('--color-primary', themeColors.primary)
    document.documentElement.style.setProperty('--color-secondary', themeColors.secondary)
    document.documentElement.style.setProperty('--color-accent', themeColors.accent)
    
    // Add data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', themeName)
  }

  const applyLayout = (layoutName: Layout) => {
    // Add data attribute for CSS selectors
    document.documentElement.setAttribute('data-layout', layoutName)
  }

  const applyCustomization = (settings: CustomizationSettings) => {
    const root = document.documentElement
    
    // Apply data attributes for CSS selectors
    root.setAttribute('data-sidebar-position', settings.sidebarPosition)
    root.setAttribute('data-sidebar-width', settings.sidebarWidth)
    root.setAttribute('data-card-style', settings.cardStyle)
    root.setAttribute('data-card-roundness', settings.cardRoundness)
    root.setAttribute('data-card-spacing', settings.cardSpacing)
    root.setAttribute('data-font-size', settings.fontSize)
    root.setAttribute('data-font-weight', settings.fontWeight)
    root.setAttribute('data-table-style', settings.tableStyle)
    root.setAttribute('data-table-density', settings.tableDensity)
    root.setAttribute('data-animations', settings.animations ? 'enabled' : 'disabled')
    root.setAttribute('data-transition-speed', settings.transitionSpeed)
  }

  const updateCustomization = (newSettings: Partial<CustomizationSettings>) => {
    const updated = { ...customization, ...newSettings }
    setCustomizationState(updated)
    localStorage.setItem('trinity-customization', JSON.stringify(updated))
    applyCustomization(updated)
  }

  const resetCustomization = () => {
    setCustomizationState(defaultCustomization)
    localStorage.setItem('trinity-customization', JSON.stringify(defaultCustomization))
    applyCustomization(defaultCustomization)
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      layout, 
      setLayout, 
      customization, 
      updateCustomization, 
      resetCustomization 
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export { defaultCustomization }

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export { themes }
