'use client'

import { useState, useMemo, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

// ============================================
// УНИВЕРСАЛЬНЫЙ ШАБЛОН ПОИСКА TRINITY CRM
// Клиентская фильтрация — без API запросов, без перезагрузки.
// Минимум 2 символа для начала поиска.
// ============================================

interface TrinitySearchProps<T> {
  /** Массив данных для поиска */
  data: T[]
  /** Ключи объекта по которым искать (например ['name', 'phone', 'email']) */
  searchKeys: (keyof T)[]
  /** Минимум символов для начала поиска */
  minChars?: number
  /** Placeholder */
  placeholder?: string
  /** Callback — возвращает отфильтрованные результаты */
  onResults: (filtered: T[]) => void
  /** Locale для RTL */
  locale?: 'he' | 'ru'
  /** Дополнительные классы */
  className?: string
}

export function TrinitySearch<T extends Record<string, any>>({
  data,
  searchKeys,
  minChars = 2,
  placeholder,
  onResults,
  locale = 'ru',
  className = '',
}: TrinitySearchProps<T>) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isRTL = locale === 'he'
  const defaultPlaceholder = isRTL ? 'חיפוש...' : 'Поиск...'

  // Фильтрация на клиенте — моментальная, без API
  const filtered = useMemo(() => {
    if (!query || query.length < minChars) return data

    const q = query.toLowerCase()
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key]
        if (val == null) return false
        return String(val).toLowerCase().includes(q)
      })
    )
  }, [data, query, searchKeys, minChars])

  // Отдаём результаты наверх
  useEffect(() => {
    onResults(filtered)
  }, [filtered, onResults])

  function handleClear() {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Иконка поиска */}
      <Search
        size={18}
        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${
          isRTL ? 'right-3' : 'left-3'
        }`}
      />

      {/* Инпут */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        className={`w-full py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${
          isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
        }`}
        dir={isRTL ? 'rtl' : 'ltr'}
      />

      {/* Кнопка очистки */}
      {query && (
        <button
          onClick={handleClear}
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition ${
            isRTL ? 'left-3' : 'right-3'
          }`}
        >
          <X size={18} />
        </button>
      )}

      {/* Подсказка "минимум N символов" */}
      {query.length > 0 && query.length < minChars && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          {isRTL
            ? `הקלד לפחות ${minChars} תווים`
            : `Введите минимум ${minChars} символа`}
        </p>
      )}

      {/* Нет результатов */}
      {query.length >= minChars && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          {isRTL ? 'לא נמצאו תוצאות' : 'Ничего не найдено'}
        </p>
      )}
    </div>
  )
}

// ============================================
// ВАРИАНТ 2: TrinitySearchDropdown
// Поиск с выпадающим списком (как в форме визита)
// ============================================

interface TrinitySearchDropdownProps<T> {
  data: T[]
  searchKeys: (keyof T)[]
  minChars?: number
  placeholder?: string
  onSelect: (item: T) => void
  renderItem: (item: T) => ReactNode
  locale?: 'he' | 'ru'
  className?: string
}

export function TrinitySearchDropdown<T extends Record<string, any>>({
  data,
  searchKeys,
  minChars = 2,
  placeholder,
  onSelect,
  renderItem,
  locale = 'ru',
  className = '',
}: TrinitySearchDropdownProps<T>) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const isRTL = locale === 'he'
  const defaultPlaceholder = isRTL ? 'חיפוש...' : 'Поиск...'

  useEffect(() => { setMounted(true) }, [])

  const filtered = useMemo(() => {
    if (query.length > 0 && query.length < minChars) return []
    if (query.length === 0) return minChars === 0 ? data.slice(0, 10) : []
    const q = query.toLowerCase()
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key]
        if (val == null) return false
        return String(val).toLowerCase().includes(q)
      })
    ).slice(0, 10)
  }, [data, query, searchKeys, minChars])

  // Пересчитываем позицию при открытии — через rAF чтобы дождаться layout
  useEffect(() => {
    if (!isOpen || !wrapRef.current) return
    const recalc = () => {
      if (wrapRef.current) setDropRect(wrapRef.current.getBoundingClientRect())
    }
    recalc()
    const raf = requestAnimationFrame(recalc)
    return () => cancelAnimationFrame(raf)
  }, [isOpen, query])

  // Закрыть dropdown при клике вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item: T) {
    onSelect(item)
    setQuery('')
    setIsOpen(false)
  }

  const showDropdown = isOpen && mounted && dropRect &&
    (query.length === 0 ? minChars === 0 : query.length >= minChars)

  // Показываем вниз если есть место (200px), иначе вверх
  const spaceBelow = dropRect ? window.innerHeight - dropRect.bottom : 300
  const dropUp = spaceBelow < 220

  const dropdown = showDropdown ? createPortal(
    <div style={{
      position: 'fixed',
      top:   dropUp ? undefined : dropRect!.bottom + 4,
      bottom: dropUp ? window.innerHeight - dropRect!.top + 4 : undefined,
      left:  dropRect!.left,
      width: dropRect!.width,
      zIndex: 10000,
      background: 'var(--color-background-primary, #fff)',
      border: '1px solid var(--color-border-secondary, #e2e8f0)',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      maxHeight: 220,
      overflowY: 'auto',
    }}>
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 16px' }}>
          {isRTL ? 'לא נמצאו תוצאות' : 'Ничего не найдено'}
        </p>
      ) : (
        filtered.map((item, i) => (
          <div key={i} onMouseDown={() => handleSelect(item)}
            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '0.5px solid var(--color-border-tertiary,#f1f5f9)' : 'none' }}
            className="hover:bg-muted/50 transition">
            {renderItem(item)}
          </div>
        ))
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <Search size={18}
        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
      <input ref={inputRef} type="text" value={query}
        onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder || defaultPlaceholder}
        className={`w-full py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
        dir={isRTL ? 'rtl' : 'ltr'} />
      {query && (
        <button onClick={() => { setQuery(''); setIsOpen(false) }}
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition ${isRTL ? 'left-3' : 'right-3'}`}>
          <X size={18} />
        </button>
      )}
      {dropdown}
    </div>
  )
}

// ============================================
// МОБИЛЬНЫЙ ПОИСК С РЕЗУЛЬТАТАМИ ВВЕРХ
// Шаблон для любого поиска на мобильном
// ============================================

interface TrinityMobileSearchProps<T> {
  data: T[]
  searchKeys: (keyof T)[]
  minChars?: number
  placeholder?: string
  onSelect: (item: T) => void
  renderItem: (item: T) => ReactNode
  locale?: 'he' | 'ru'
  className?: string
  /** Режим отображения результатов */
  dropDirection?: 'auto' | 'up' | 'down'
}

export function TrinityMobileSearch<T extends Record<string, any>>({
  data,
  searchKeys,
  minChars = 2,
  placeholder,
  onSelect,
  renderItem,
  locale = 'ru',
  className = '',
  dropDirection = 'auto',
}: TrinityMobileSearchProps<T>) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isRTL = locale === 'he'
  const defaultPlaceholder = isRTL ? 'חיפוש...' : 'Поиск...'

  const filtered = useMemo(() => {
    if (!query || query.length < minChars) return []

    const q = query.toLowerCase()
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key]
        if (val == null) return false
        return String(val).toLowerCase().includes(q)
      })
    ).slice(0, 10)
  }, [data, query, searchKeys, minChars])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item: T) {
    onSelect(item)
    setQuery('')
    setIsOpen(false)
  }

  // Определяем направление: auto = вверх на мобильном, вниз на десктопе
  const dropdownPositionClass =
    dropDirection === 'up'
      ? 'bottom-full mb-1'
      : dropDirection === 'down'
      ? 'top-full mt-1'
      : 'bottom-full mb-1 md:bottom-auto md:top-full md:mb-0 md:mt-1'

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Иконка поиска */}
      <Search
        size={18}
        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${
          isRTL ? 'right-3' : 'left-3'
        }`}
      />

      {/* Инпут */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => query.length >= minChars && setIsOpen(true)}
        placeholder={placeholder || defaultPlaceholder}
        className={`w-full py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${
          isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
        }`}
        dir={isRTL ? 'rtl' : 'ltr'}
      />

      {/* Кнопка очистки */}
      {query && (
        <button
          onClick={() => {
            setQuery('')
            setIsOpen(false)
          }}
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition ${
            isRTL ? 'left-3' : 'right-3'
          }`}
        >
          <X size={18} />
        </button>
      )}

      {/* Dropdown — ВВЕРХ на мобильном */}
      {isOpen && query.length >= minChars && (
        <div className={`absolute z-[9100] w-full bg-card border rounded-xl shadow-lg max-h-60 overflow-y-auto ${dropdownPositionClass}`}>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isRTL ? 'לא נמצאו תוצאות' : 'Ничего не найдено'}
            </p>
          ) : (
            filtered.map((item, i) => (
              <div
                key={i}
                onClick={() => handleSelect(item)}
                className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition border-b border-muted last:border-0"
              >
                {renderItem(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
