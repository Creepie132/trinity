'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type ThemeId = 'midnight' | 'forest' | 'plum' | 'amber'

export interface ThemeDefinition {
  id: ThemeId
  nameRu: string
  nameHe: string
  sidebar: string
  sidebarMuted: string
  accent: string
  accentText: string
  accentBg: string
  contentBg: string
  noteBg: string
  noteBorder: string
  noteText: string
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    nameRu: 'Midnight Slate',
    nameHe: 'כחול לילה',
    sidebar: '#1e2533',
    sidebarMuted: 'rgba(255,255,255,0.45)',
    accent: '#4a6fa5',
    accentText: '#7aa8e0',
    accentBg: 'rgba(74,111,165,0.25)',
    contentBg: '#f8f9fc',
    noteBg: '#eef2f7',
    noteBorder: '#c8d4e3',
    noteText: '#2d3a4e',
  },
  {
    id: 'forest',
    nameRu: 'Forest Night',
    nameHe: 'ירוק יער',
    sidebar: '#1a2620',
    sidebarMuted: 'rgba(255,255,255,0.45)',
    accent: '#2d6a4f',
    accentText: '#74c69d',
    accentBg: 'rgba(45,106,79,0.3)',
    contentBg: '#f6faf7',
    noteBg: '#d8eedf',
    noteBorder: '#a8d5b5',
    noteText: '#1a3d2b',
  },
  {
    id: 'plum',
    nameRu: 'Deep Plum',
    nameHe: 'סגול עמוק',
    sidebar: '#1f1428',
    sidebarMuted: 'rgba(255,255,255,0.45)',
    accent: '#7c3aed',
    accentText: '#c084fc',
    accentBg: 'rgba(124,58,237,0.25)',
    contentBg: '#faf8ff',
    noteBg: '#e9e0ff',
    noteBorder: '#c4b5fd',
    noteText: '#3b1d6e',
  },
  {
    id: 'amber',
    nameRu: 'Warm Amber',
    nameHe: 'ענבר חם',
    sidebar: '#1f1a0e',
    sidebarMuted: 'rgba(255,255,255,0.45)',
    accent: '#b45309',
    accentText: '#fbbf24',
    accentBg: 'rgba(180,83,9,0.3)',
    contentBg: '#fffdf5',
    noteBg: '#fde68a',
    noteBorder: '#f59e0b',
    noteText: '#451a03',
  },
]

const LS_KEY = 'trinity_ui_theme'

interface ThemeContextValue {
  themeId: ThemeId
  theme: ThemeDefinition
  setTheme: (id: ThemeId) => Promise<void>
  isSaving: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeCssVars(theme: ThemeDefinition) {
  const root = document.documentElement
  root.style.setProperty('--trinity-sidebar-bg', theme.sidebar)
  root.style.setProperty('--trinity-sidebar-muted', theme.sidebarMuted)
  root.style.setProperty('--trinity-accent', theme.accent)
  root.style.setProperty('--trinity-accent-text', theme.accentText)
  root.style.setProperty('--trinity-accent-bg', theme.accentBg)
  root.style.setProperty('--trinity-content-bg', theme.contentBg)
  root.style.setProperty('--trinity-note-bg', theme.noteBg)
  root.style.setProperty('--trinity-note-border', theme.noteBorder)
  root.style.setProperty('--trinity-note-text', theme.noteText)
}

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme?: ThemeId }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LS_KEY) as ThemeId | null
      if (cached && THEMES.find((t) => t.id === cached)) return cached
    }
    return initialTheme ?? 'midnight'
  })
  const [isSaving, setIsSaving] = useState(false)

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]

  useEffect(() => {
    applyThemeCssVars(theme)
  }, [theme])

  const setTheme = useCallback(async (id: ThemeId) => {
    setThemeId(id)
    localStorage.setItem(LS_KEY, id)
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: orgUser } = await supabase
        .from('org_users').select('org_id').eq('user_id', user.id).single()
      if (!orgUser) return
      const { data: org } = await supabase
        .from('organizations').select('metadata').eq('id', orgUser.org_id).single()
      await supabase
        .from('organizations')
        .update({ metadata: { ...(org?.metadata ?? {}), ui_theme: id } })
        .eq('id', orgUser.org_id)
    } catch {
      // silent — theme applied locally
    } finally {
      setIsSaving(false)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme, isSaving }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
