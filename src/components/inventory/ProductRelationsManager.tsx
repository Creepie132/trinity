'use client'
/**
 * ProductRelationsManager
 * Секция управления cross-sell связями в ProductDetailSheet.
 * Логика: загружаем текущие связи + все товары орга.
 * Сохранение: DELETE старых + INSERT новых (транзакция на сервере).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link2, X, Plus, Loader2, Search, Save, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface RelatedProduct {
  id: string
  name: string
  sell_price: number | null
  image_url: string | null
  category: string | null
}

interface ProductRelationsManagerProps {
  productId: string
}

export function ProductRelationsManager({ productId }: ProductRelationsManagerProps) {
  const { language } = useLanguage()
  const isHe = language === 'he'

  // ── State ─────────────────────────────────────────────────────────────────
  const [allProducts, setAllProducts]       = useState<RelatedProduct[]>([])
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [originalIds, setOriginalIds]       = useState<Set<string>>(new Set())
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [search, setSearch]                 = useState('')
  const [showPicker, setShowPicker]         = useState(false)

  const isDirty = useMemo(() => {
    if (selectedIds.size !== originalIds.size) return true
    return Array.from(selectedIds).some(id => !originalIds.has(id))
  }, [selectedIds, originalIds])

  // ── Load данные ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [relRes, prodRes] = await Promise.all([
        apiFetch<{ related: RelatedProduct[] }>(`/api/products/${productId}/relations`),
        apiFetch<{ products: RelatedProduct[] }>('/api/products'),
      ])
      const relIds = new Set(relRes.related.map(r => r.id))
      setSelectedIds(new Set(relIds))
      setOriginalIds(new Set(relIds))
      setAllProducts(prodRes.products.filter(p => p.id !== productId))
    } catch {
      toast.error(isHe ? 'שגיאה בטעינה' : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [productId, isHe])

  useEffect(() => { load() }, [load])

  // ── Сохранение ─────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true)
    // Оптимистичное обновление originalIds
    const newOriginal = new Set(selectedIds)
    setOriginalIds(newOriginal)
    try {
      await apiFetch(`/api/products/${productId}/relations`, {
        method: 'PUT',
        json: { related_ids: Array.from(selectedIds) },
      })
      toast.success(isHe ? 'נשמר!' : 'Сохранено!')
    } catch {
      // Откат при ошибке
      setOriginalIds(new Set(originalIds))
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const remove = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  // Товары выбранные (для чипов)
  const selectedProducts = allProducts.filter(p => selectedIds.has(p.id))

  // Товары для picker (не выбранные + фильтр поиска)
  const pickerProducts = allProducts.filter(p =>
    !selectedIds.has(p.id) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) ||
     (p.category || '').toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 0', color: '#94a3b8', fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" />
        {isHe ? 'טוען...' : 'Загрузка...'}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Link2 size={12} />
          {isHe ? 'מוצרים קשורים (קרוס-סל)' : 'Сопутствующие товары'}
        </p>
        <button
          onClick={() => setShowPicker(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={11} />
          {isHe ? 'הוסף' : 'Добавить'}
        </button>
      </div>

      {/* Picker dropdown */}
      {showPicker && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isHe ? 'חפש מוצר...' : 'Поиск товара...'}
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pickerProducts.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                {isHe ? 'לא נמצאו מוצרים' : 'Товары не найдены'}
              </p>
            ) : pickerProducts.map(p => (
              <button key={p.id} onClick={() => toggle(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 16 }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  {p.category && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{p.category}</p>}
                </div>
                {p.sell_price != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>₪{p.sell_price}</span>
                )}
                <Plus size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              </button>
            ))}
          </div>

          <button onClick={() => { setShowPicker(false); setSearch('') }}
            style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
            {isHe ? 'סגור' : 'Закрыть'}
          </button>
        </div>
      )}

      {/* Selected chips */}
      {selectedProducts.length === 0 && !showPicker ? (
        <p style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', margin: '4px 0 8px' }}>
          {isHe ? 'אין מוצרים קשורים' : 'Нет связанных товаров'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {selectedProducts.map(p => (
            <div key={p.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
              {p.image_url && (
                <img src={p.image_url} alt={p.name} style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
              )}
              {p.name}
              {p.sell_price != null && <span style={{ color: '#60a5fa', fontWeight: 400 }}>₪{p.sell_price}</span>}
              <button onClick={() => remove(p.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#93c5fd', lineHeight: 1 }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save button — показывается только если есть изменения */}
      {isDirty && (
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {saving
            ? <><Loader2 size={13} className="animate-spin" />{isHe ? 'שומר...' : 'Сохраняю...'}</>
            : <><Save size={13} />{isHe ? 'שמור שינויים' : 'Сохранить изменения'}</>}
        </button>
      )}
    </div>
  )
}
