'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, User } from 'lucide-react'
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

  // Поиск через API (server-side, service role, учитывает activeOrgId при impersonation)
  // Прямой Supabase browser-запрос не подходит: RLS блокирует доступ к чужому org
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client-search-input', orgId, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return []
      const res = await fetch(`/api/clients?search=${encodeURIComponent(debouncedQuery)}`)
      if (!res.ok) return []
      const data = await res.json()
      return (Array.isArray(data) ? data : []).slice(0, 8) as Client[]
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

      {/* Dropdown с результатами */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-[200] w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden top-full mt-1">
          <div className="max-h-[220px] overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                {isRTL ? 'טוען...' : 'Загрузка...'}
              </div>
            ) : clients.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                {isRTL ? 'לא נמצאו לקוחות' : 'Клиенты не найдены'}
              </div>
            ) : (
              <>
                {clients.slice(0, 5).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client)}
                    className="w-full px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition border-b border-border last:border-0 flex items-center gap-3 text-left"
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
                ))}
                {clients.length > 5 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground text-center bg-muted/30">
                    {isRTL
                      ? 'הקלד יותר תווים לתוצאות מדויקות יותר'
                      : 'Введите больше символов для точного поиска'}
                  </div>
                )}
              </>
            )}
          </div>
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
