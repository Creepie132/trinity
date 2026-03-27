'use client'

/**
 * QuickReceiveModal — Быстрый приём товара на склад.
 * Вынесен из inventory/page.tsx в отдельный компонент.
 *
 * Trinity Standard compliance:
 * ✅ Anti-Race  — isSubmittingRef блокирует двойной submit
 * ✅ React Query — queryClient.invalidateQueries() вместо refetch()
 * ✅ Zero Trust  — мутации через PATCH /api/products/[id]
 */

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PackagePlus, Search, TrendingUp, Plus, Minus, X, Check } from 'lucide-react'
import type { Product } from '@/types/inventory'

interface QuickReceiveModalProps {
  products: Product[]
  locale: string
  onClose: () => void
}

export function QuickReceiveModal({ products, locale, onClose }: QuickReceiveModalProps) {
  const l = locale === 'he'
  const queryClient = useQueryClient()

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // ✅ Anti-race condition lock
  const isSubmittingRef = useRef(false)

  const filtered = search.length >= 1
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const setQty = (id: string, delta: number) => {
    setQuantities(prev => {
      const cur = prev[id] || 0
      const next = Math.max(0, cur + delta)
      if (next === 0) { const n = { ...prev }; delete n[id]; return n }
      return { ...prev, [id]: next }
    })
  }

  const totalItems = Object.values(quantities).reduce((s, v) => s + v, 0)
  const totalProducts = Object.keys(quantities).length

  const handleSave = async () => {
    if (isSubmittingRef.current) return
    const items = Object.entries(quantities).map(([id, qty]) => ({ id, qty }))
    if (!items.length) return

    isSubmittingRef.current = true
    setSaving(true)
    try {
      // ✅ Zero Trust: через /api/products/[id] PATCH
      await Promise.all(
        items.map(({ id, qty }) => {
          const product = products.find(p => p.id === id)
          if (!product) return Promise.resolve()
          return fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: product.quantity + qty }),
          })
        })
      )
      // ✅ React Query invalidate — не refetch(), не reload()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(l ? 'הסחורה התקבלה בהצלחה' : 'Товар принят на склад')
      onClose()
    } catch (err: any) {
      toast.error(err.message || (l ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: '#fff' }}>

        {/* Dark header */}
        <div style={{ background: 'linear-gradient(135deg, #1e2533 0%, #283148 100%)', padding: '20px 20px 16px', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(34,197,94,0.35)', flexShrink: 0 }}>
              <PackagePlus size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                {l ? 'קבלת סחורה' : 'Быстрый приход'}
              </h2>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                {l ? 'הוסף כמות לכל מוצר' : 'Добавь количество к товарам'}
              </p>
            </div>
          </div>

          {totalItems > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
              <div style={{ background: 'rgba(34,197,94,0.15)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={13} color="#22c55e" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>+{totalItems} {l ? 'יחידות' : 'ед.'}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 12px' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{totalProducts} {l ? 'מוצרים' : 'товаров'}</span>
              </div>
            </div>
          )}

          <div style={{ position: 'relative', marginTop: totalItems > 0 ? 12 : 0 }}>
            <Search size={14} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder={l ? 'חיפוש מוצר...' : 'Поиск товара...'}
              value={search} onChange={e => setSearch(e.target.value)} autoFocus
              style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Product list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f8fafc' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
              {l ? 'לא נמצאו מוצרים' : 'Товары не найдены'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(p => {
                const qty = quantities[p.id] || 0
                const active = qty > 0
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 16, transition: 'all 0.15s',
                    background: active ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : '#fff',
                    border: `1.5px solid ${active ? '#86efac' : '#e2e8f0'}`,
                    boxShadow: active ? '0 2px 8px rgba(34,197,94,0.12)' : 'none' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #e2e8f0' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <PackagePlus size={18} color="#94a3b8" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#15803d' : '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: active ? '#22c55e' : '#94a3b8', margin: '2px 0 0' }}>
                        {l ? 'במלאי' : 'На складе'}: <strong>{p.quantity}</strong>
                        {active && <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700 }}>→ {p.quantity + qty}</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setQty(p.id, -1)}
                        style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: qty > 0 ? '#fee2e2' : '#f1f5f9', color: qty > 0 ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Minus size={13} />
                      </button>
                      <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 800, color: active ? '#16a34a' : '#cbd5e1' }}>
                        {active ? `+${qty}` : '0'}
                      </span>
                      <button onClick={() => setQty(p.id, 1)}
                        style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
          <button onClick={handleSave} disabled={totalItems === 0 || saving}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 700, cursor: totalItems > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: totalItems > 0 ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#f1f5f9',
              color: totalItems > 0 ? '#fff' : '#94a3b8',
              boxShadow: totalItems > 0 ? '0 4px 14px rgba(34,197,94,0.3)' : 'none' }}>
            {saving
              ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <Check size={16} />}
            {l
              ? (totalItems > 0 ? `קבל +${totalItems} יחידות` : 'בחר מוצרים')
              : (totalItems > 0 ? `Принять +${totalItems} ед.` : 'Выберите товары')}
          </button>
        </div>
      </div>
    </div>
  )
}
