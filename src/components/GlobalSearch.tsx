'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Search, User, CreditCard, Package, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SearchResults {
  clients: Array<{ id: string; first_name: string; last_name: string; phone: string; email: string | null }>
  payments: Array<{ id: string; transaction_id: string; amount: number; currency: string; clients: { first_name: string; last_name: string } }>
  services: Array<{ id: string; name: string; price: number; duration: number }>
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { orgId } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ clients: [], payments: [], services: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalResults = results.clients.length + results.payments.length + results.services.length

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !orgId) {
      setResults({ clients: [], payments: [], services: [] })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&org_id=${orgId}`)
      const data = await response.json()
      if (response.ok) setResults(data)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => performSearch(query), 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [query, performSearch])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ clients: [], payments: [], services: [] })
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => Math.max(prev - 1, 0)) }
      else if (e.key === 'Enter') { e.preventDefault(); handleSelectResult(selectedIndex) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, totalResults])

  const handleSelectResult = (index: number) => {
    let currentIndex = 0
    if (index < results.clients.length) {
      router.push(`/clients?client=${results.clients[index].id}`)
      onOpenChange(false)
      return
    }
    currentIndex += results.clients.length
    if (index < currentIndex + results.payments.length) {
      router.push(`/payments?payment=${results.payments[index - currentIndex].id}`)
      onOpenChange(false)
      return
    }
    currentIndex += results.payments.length
    if (index < currentIndex + results.services.length) {
      router.push(`/settings/services?service=${results.services[index - currentIndex].id}`)
      onOpenChange(false)
    }
  }

  const getResultIndex = (category: 'clients' | 'payments' | 'services', idx: number) => {
    let offset = 0
    if (category === 'payments') offset = results.clients.length
    if (category === 'services') offset = results.clients.length + results.payments.length
    return offset + idx
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      showCloseButton={false}
      width="600px"
      className="bg-gray-900 border-gray-800"
      contentClassName="p-0"
    >
      <div className="flex flex-col max-h-[70vh]">
        {/* Search Input */}
        <div className="flex items-center border-b border-gray-800 px-4 py-3 bg-gray-900">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск клиентов, платежей, услуг..."
            className="border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0"
            autoFocus
          />
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-2" />}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {query && totalResults === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">Ничего не найдено</div>
          )}
          {!query && <div className="text-center py-8 text-gray-500">Начните вводить для поиска...</div>}

          {results.clients.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                <User className="w-4 h-4" /> Клиенты ({results.clients.length})
              </div>
              {results.clients.map((client, idx) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectResult(getResultIndex('clients', idx))}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md transition-colors',
                    getResultIndex('clients', idx) === selectedIndex ? 'bg-purple-600/20 border border-purple-500' : 'hover:bg-gray-800'
                  )}
                >
                  <div className="font-medium text-white">{client.first_name} {client.last_name}</div>
                  <div className="text-sm text-gray-400">{client.phone}{client.email && ` • ${client.email}`}</div>
                </button>
              ))}
            </div>
          )}

          {results.payments.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Платежи ({results.payments.length})
              </div>
              {results.payments.map((payment, idx) => (
                <button
                  key={payment.id}
                  onClick={() => handleSelectResult(getResultIndex('payments', idx))}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md transition-colors',
                    getResultIndex('payments', idx) === selectedIndex ? 'bg-purple-600/20 border border-purple-500' : 'hover:bg-gray-800'
                  )}
                >
                  <div className="font-medium text-white">#{payment.transaction_id || payment.id.substring(0, 8)}</div>
                  <div className="text-sm text-gray-400">{payment.amount} {payment.currency || '₪'} • {payment.clients.first_name} {payment.clients.last_name}</div>
                </button>
              ))}
            </div>
          )}

          {results.services.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2">
                <Package className="w-4 h-4" /> Услуги ({results.services.length})
              </div>
              {results.services.map((service, idx) => (
                <button
                  key={service.id}
                  onClick={() => handleSelectResult(getResultIndex('services', idx))}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md transition-colors',
                    getResultIndex('services', idx) === selectedIndex ? 'bg-purple-600/20 border border-purple-500' : 'hover:bg-gray-800'
                  )}
                >
                  <div className="font-medium text-white">{service.name}</div>
                  <div className="text-sm text-gray-400">{service.price}₪ • {service.duration} мин</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalResults > 0 && (
          <div className="border-t border-gray-800 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
            <div>↑↓ навигация</div>
            <div>Enter выбор</div>
            <div>Esc закрыть</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
