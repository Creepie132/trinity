'use client'

import { useState, useMemo, useRef, useEffect, ReactNode } from 'react'
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
  /** Массив данных для поиска */
  data: T[]
  /** Ключи объекта по которым искать */
  searchKeys: (keyof T)[]
  /** Рендер функция для элемента списка */
  renderItem: (item: T) => ReactNode
  /** Callback при выборе элемента */
  onSelect: (item: T) => void
  /** Placeholder */
  placeholder?: string
  /** Locale для RTL */
  locale?: 'he' | 'ru'
  /** Минимум символов для показа результатов */
  minChars?: number
  /** Максимум результатов в dropdown */
  maxResults?: number
  /** Дополнительные классы */
  className?: string
}

export function TrinitySearchDropdown<T extends Record<string, any>>({
  data,
  searchKeys,
  renderItem,
  onSelect,
  placeholder,
  locale = 'ru',
  minChars = 2,
  maxResults = 10,
  className = '',
}: TrinitySearchDropdownProps<T>) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isRTL = locale === 'he'
  const defaultPlaceholder = isRTL ? 'חיפוש...' : 'Поиск...'

  // Фильтрация
  const filtered = useMemo(() => {
    if (!query || query.length < minChars) return []

    const q = query.toLowerCase()
    return data
      .filter((item) =>
        searchKeys.some((key) => {
          const val = item[key]
          if (val == null) return false
          return String(val).toLowerCase().includes(q)
        })
      )
      .slice(0, maxResults)
  }, [data, query, searchKeys, minChars, maxResults])

  // Закрытие при клике снаружи
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item: T) {
    onSelect(item)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
  }

  function handleClear() {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Инпут */}
      <div className="relative">
        <Search
          size={18}
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${
            isRTL ? 'right-3' : 'left-3'
          }`}
        />
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
      </div>

      {/* Dropdown */}
      {isOpen && query.length >= minChars && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-lg max-h-[300px] overflow-y-auto"
        >
          {filtered.length > 0 ? (
            <div className="py-1">
              {filtered.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(item)}
                  className="px-3 py-2 hover:bg-muted cursor-pointer transition"
                >
                  {renderItem(item)}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {isRTL ? 'לא נמצאו תוצאות' : 'Ничего не найдено'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
