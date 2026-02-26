'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, User } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useQuery } from '@tanstack/react-query'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
}

interface ClientSearchInputProps {
  /** Callback при выборе клиента */
  onSelect: (name: string, phone: string) => void
  /** Текущее значение имени */
  value?: string
  /** Placeholder */
  placeholder?: string
  /** Locale для RTL */
  locale?: 'he' | 'ru'
  /** Дополнительные классы */
  className?: string
  /** ID организации для фильтрации (опционально) */
  orgId?: string
}

export function ClientSearchInput({
  onSelect,
  value = '',
  placeholder,
  locale = 'ru',
  className = '',
  orgId,
}: ClientSearchInputProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isRTL = locale === 'he'

  const defaultPlaceholder = isRTL ? 'חיפוש לקוח...' : 'Поиск клиента...'

  // Debounce для оптимизации запросов
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Поиск в Supabase
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client-search-input', orgId, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return []

      const supabase = createSupabaseBrowserClient()
      let queryBuilder = supabase
        .from('clients')
        .select('id, first_name, last_name, phone')

      // Фильтр по org_id если передан
      if (orgId) {
        queryBuilder = queryBuilder.eq('org_id', orgId)
      }

      const { data, error } = await queryBuilder
        .or(
          `first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%,phone.ilike.%${debouncedQuery}%`
        )
        .limit(10)

      if (error) {
        console.error('Client search error:', error)
        return []
      }

      return (data || []) as Client[]
    },
    enabled: debouncedQuery.length >= 2,
  })

  // Закрыть dropdown при клике вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(client: Client) {
    const fullName = `${client.first_name} ${client.last_name}`.trim()
    onSelect(fullName, client.phone || '')
    setQuery('')
    setIsOpen(false)
  }

  function handleClear() {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Синхронизируем внешнее значение с локальным состоянием
  useEffect(() => {
    if (!isOpen && value !== query) {
      setQuery(value)
    }
  }, [value, isOpen])

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
          if (e.target.value.length >= 2) {
            setIsOpen(true)
          }
        }}
        onFocus={() => {
          if (query.length >= 2) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder || defaultPlaceholder}
        className={`w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition ${
          isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
        }`}
        dir={isRTL ? 'rtl' : 'ltr'}
      />

      {/* Кнопка очистки */}
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition ${
            isRTL ? 'left-3' : 'right-3'
          }`}
        >
          <X size={18} />
        </button>
      )}

      {/* Dropdown с результатами - ВВЕРХ на мобильном, ВНИЗ на десктопе */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto bottom-full mb-1 md:bottom-auto md:top-full md:mb-0 md:mt-1">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              {isRTL ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : clients.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              {isRTL ? 'לא נמצאו לקוחות' : 'Клиенты не найдены'}
            </div>
          ) : (
            clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="w-full px-4 py-3 hover:bg-muted/50 cursor-pointer transition border-b border-border last:border-0 flex items-center gap-3 text-left"
              >
                <User size={16} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {client.first_name} {client.last_name}
                  </div>
                  {client.phone && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {client.phone}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Подсказка "минимум 2 символа" */}
      {query.length > 0 && query.length < 2 && !isOpen && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          {isRTL ? 'הקלד לפחות 2 תווים' : 'Введите минимум 2 символа'}
        </p>
      )}
    </div>
  )
}
