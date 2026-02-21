'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, User, CreditCard, Package, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SearchResults {
  clients: Array<{
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string | null
  }>
  payments: Array<{
    id: string
    transaction_id: string
    amount: number
    currency: string
    clients: {
      first_name: string
      last_name: string
    }
  }>
  services: Array<{
    id: string
    name: string
    price: number
    duration: number
  }>
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { orgId } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    payments: [],
    services: [],
  })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate total results
  const totalResults =
    results.clients.length + results.payments.length + results.services.length

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !orgId) {
        setResults({ clients: [], payments: [], services: [] })
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&org_id=${orgId}`
        )
        const data = await response.json()

        if (response.ok) {
          setResults(data)
        } else {
          console.error('Search failed:', data.error)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    },
    [orgId]
  )

  useEffect(() => {
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => {
      if (searchTimeoutRef.current !== null) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, performSearch])

  // Reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ clients: [], payments: [], services: [] })
      setSelectedIndex(0)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelectResult(selectedIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, totalResults])

  const handleSelectResult = (index: number) => {
    let currentIndex = 0

    // Clients
    if (index < results.clients.length) {
      const client = results.clients[index]
      router.push(`/clients?client=${client.id}`)
      onOpenChange(false)
      return
    }
    currentIndex += results.clients.length

    // Payments
    if (index < currentIndex + results.payments.length) {
      const payment = results.payments[index - currentIndex]
      router.push(`/payments?payment=${payment.id}`)
      onOpenChange(false)
      return
    }
    currentIndex += results.payments.length

    // Services
    if (index < currentIndex + results.services.length) {
      const service = results.services[index - currentIndex]
      router.push(`/settings/services?service=${service.id}`)
      onOpenChange(false)
      return
    }
  }

  const getResultIndex = (category: 'clients' | 'payments' | 'services', idx: number) => {
    let offset = 0
    if (category === 'payments') offset = results.clients.length
    if (category === 'services') offset = results.clients.length + results.payments.length
    return offset + idx
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-gray-900 border-gray-800">
        {/* Search Input */}
        <div className="flex items-center border-b border-gray-800 px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск клиентов, платежей, услуг..."
            className="border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-2" />}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {query && totalResults === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              Ничего не найдено
            </div>
          )}

          {!query && (
            <div className="text-center py-8 text-gray-500">
              Начните вводить для поиска...
            </div>
          )}

          {/* Clients */}
          {results.clients.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Клиенты ({results.clients.length})
              </div>
              {results.clients.map((client, idx) => {
                const resultIndex = getResultIndex('clients', idx)
                return (
                  <button
                    key={client.id}
                    onClick={() => handleSelectResult(resultIndex)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-colors',
                      resultIndex === selectedIndex
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'hover:bg-gray-800'
                    )}
                  >
                    <div className="font-medium text-white">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="text-sm text-gray-400">
                      {client.phone}
                      {client.email && ` • ${client.email}`}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Payments */}
          {results.payments.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Платежи ({results.payments.length})
              </div>
              {results.payments.map((payment, idx) => {
                const resultIndex = getResultIndex('payments', idx)
                return (
                  <button
                    key={payment.id}
                    onClick={() => handleSelectResult(resultIndex)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-colors',
                      resultIndex === selectedIndex
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'hover:bg-gray-800'
                    )}
                  >
                    <div className="font-medium text-white">
                      #{payment.transaction_id || payment.id.substring(0, 8)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {payment.amount} {payment.currency || '₪'} •{' '}
                      {payment.clients.first_name} {payment.clients.last_name}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Services */}
          {results.services.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Услуги ({results.services.length})
              </div>
              {results.services.map((service, idx) => {
                const resultIndex = getResultIndex('services', idx)
                return (
                  <button
                    key={service.id}
                    onClick={() => handleSelectResult(resultIndex)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-colors',
                      resultIndex === selectedIndex
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'hover:bg-gray-800'
                    )}
                  >
                    <div className="font-medium text-white">{service.name}</div>
                    <div className="text-sm text-gray-400">
                      {service.price}₪ • {service.duration} мин
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {totalResults > 0 && (
          <div className="border-t border-gray-800 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
            <div>↑↓ для навигации</div>
            <div>Enter для выбора</div>
            <div>Esc для закрытия</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
