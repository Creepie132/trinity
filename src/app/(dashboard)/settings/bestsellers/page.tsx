'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Star, Package, X, ChevronDown, Loader2, Save, Eye, RotateCcw, Upload, ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const BM_ORG_ID = '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  sell_price: string | null
  image_url: string | null
  category: string | null
}

interface BestsellerSlot {
  position: number
  product_id: string | null
  custom_title: string | null
  custom_subtitle: string | null
  image_url: string | null
  is_active: boolean
  product?: Product | null
}

// ─── ProductPicker ────────────────────────────────────────────────────────────

function ProductPicker({
  products, value, onChange,
}: {
  products: Product[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = products.find((p) => p.id === value)
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
        }}
      >
        {selected ? (
          <>
            {selected.image_url && (
              <img src={selected.image_url} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
            )}
            <span className="flex-1 truncate">{selected.name}</span>
            {selected.sell_price && (
              <span style={{ color: '#c9a84c' }}>₪{Number(selected.sell_price).toFixed(0)}</span>
            )}
          </>
        ) : (
          <span className="flex-1">— Выбрать товар —</span>
        )}
        <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#1e2128', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="p-2">
            <input
              autoFocus
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)',
              }}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); setSearch('') }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <X className="w-4 h-4" />
              Оставить слот пустым
            </button>
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setSearch('') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                style={{ color: value === p.id ? '#c9a84c' : 'rgba(255,255,255,0.85)' }}
              >
                {p.image_url && (
                  <img src={p.image_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  {p.category && (
                    <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.category}</div>
                  )}
                </div>
                {p.sell_price && (
                  <span className="flex-shrink-0 font-medium" style={{ color: '#c9a84c' }}>
                    ₪{Number(p.sell_price).toFixed(0)}
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ничего не найдено
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ImageUploader ────────────────────────────────────────────────────────────

function ImageUploader({
  value,
  onChange,
  slotIndex,
}: {
  value: string | null
  onChange: (url: string | null) => void
  slotIndex: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file) return
    if (!['image/png', 'image/webp'].includes(file.type)) {
      toast.error('Только PNG или WebP (для прозрачного фона)')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 8 МБ)')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/beautymania/admin/bestsellers/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
      toast.success('Фото загружено')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="mt-3">
      <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Фото слота (PNG/WebP с прозрачным фоном)
      </p>

      {value ? (
        // Превью загруженного фото
        <div
          className="relative rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            height: 140,
            background: 'repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <img
            src={value}
            alt={`Слот ${slotIndex + 1}`}
            className="max-h-full max-w-full object-contain"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
          />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:scale-105"
              style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
              title="Заменить фото"
            >
              <Upload className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:scale-105"
              style={{ background: 'rgba(220,38,38,0.7)', border: '1px solid rgba(220,38,38,0.4)' }}
              title="Удалить фото"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        // Зона дропа
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
          style={{
            height: 100,
            border: `2px dashed ${dragOver ? '#c9a84c' : 'rgba(255,255,255,0.12)'}`,
            background: dragOver ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
          }}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#c9a84c' }} />
          ) : (
            <>
              <ImageIcon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span className="text-xs text-center px-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Перетащите PNG/WebP или нажмите для выбора
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

// ─── SlotCard ─────────────────────────────────────────────────────────────────

function SlotCard({
  slot, index, products, onChange,
}: {
  slot: BestsellerSlot
  index: number
  products: Product[]
  onChange: (updated: BestsellerSlot) => void
}) {
  const product = products.find((p) => p.id === slot.product_id) ?? null

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: slot.product_id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${slot.product_id ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: slot.product_id ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)',
            color: slot.product_id ? '#c9a84c' : 'rgba(255,255,255,0.3)',
          }}
        >
          {index + 1}
        </div>
        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Слот {index + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onChange({ ...slot, is_active: !slot.is_active })}
          className="text-xs px-2 py-1 rounded-lg transition-colors"
          style={{
            background: slot.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
            color: slot.is_active ? '#4ade80' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${slot.is_active ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {slot.is_active ? 'Активен' : 'Скрыт'}
        </button>
      </div>

      {/* Product picker */}
      <ProductPicker
        products={products}
        value={slot.product_id}
        onChange={(id) => onChange({ ...slot, product_id: id })}
      />

      {/* Превью товара */}
      {product && (
        <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {product.image_url ? (
            <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Package className="w-5 h-5 opacity-30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {product.name}
            </div>
            {product.category && (
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{product.category}</div>
            )}
          </div>
          {product.sell_price && (
            <div className="font-bold text-sm flex-shrink-0" style={{ color: '#c9a84c' }}>
              ₪{Number(product.sell_price).toFixed(0)}
            </div>
          )}
        </div>
      )}

      {/* Загрузка кастомного фото */}
      {slot.product_id && (
        <ImageUploader
          value={slot.image_url}
          onChange={(url) => onChange({ ...slot, image_url: url })}
          slotIndex={index}
        />
      )}

      {/* Кастомные тексты */}
      {slot.product_id && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder={`Заголовок (по умолч.: ${product?.name ?? '…'})`}
            value={slot.custom_title ?? ''}
            onChange={(e) => onChange({ ...slot, custom_title: e.target.value || null })}
            maxLength={120}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
            }}
          />
          <input
            type="text"
            placeholder={`Подпись (по умолч.: ${product?.category ?? 'категория'})`}
            value={slot.custom_subtitle ?? ''}
            onChange={(e) => onChange({ ...slot, custom_subtitle: e.target.value || null })}
            maxLength={120}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BestsellersSettingsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { user, orgId: activeOrgId } = useAuth()

  const [slots, setSlots] = useState<BestsellerSlot[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Beautymania-only: проверяем и активный org, и org пользователя
  // (при impersonation activeOrgId = org Beautymania, иначе = org текущего юзера)
  const isBeautymania =
    activeOrgId === BM_ORG_ID ||
    (user as { org_id?: string } | null)?.org_id === BM_ORG_ID

  const loadData = useCallback(async () => {
    if (!isBeautymania) { setLoading(false); return }
    setLoading(true)
    try {
      const [slotsRes, productsRes] = await Promise.all([
        fetch('/api/beautymania/admin/bestsellers'),
        fetch('/api/products?all=true'),
      ])

      if (slotsRes.ok) {
        const { slots: rawSlots } = await slotsRes.json() as { slots: BestsellerSlot[] }
        const filled: BestsellerSlot[] = Array.from({ length: 5 }, (_, i) => {
          const found = rawSlots.find((s) => s.position === i + 1)
          return found ?? {
            position: i + 1,
            product_id: null,
            custom_title: null,
            custom_subtitle: null,
            image_url: null,
            is_active: true,
          }
        })
        setSlots(filled)
      }

      if (productsRes.ok) {
        const { products: prods } = await productsRes.json() as { products: Product[] }
        setProducts(prods ?? [])
      }
    } catch (e) {
      console.error(e)
      toast.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [isBeautymania])

  useEffect(() => { loadData() }, [loadData])

  const handleSlotChange = (index: number, updated: BestsellerSlot) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? updated : s)))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/beautymania/admin/bestsellers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Бестселлеры сохранены и опубликованы на сайте')
      setDirty(false)
    } catch {
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setDirty(false)
    await loadData()
  }

  if (!isBeautymania && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Этот раздел доступен только для Beautymania</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push('/settings')}
          className="text-sm hover:opacity-80 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {language === 'he' ? 'הגדרות' : 'Настройки'}
        </button>
        <ArrowRight
          className="w-3.5 h-3.5 opacity-30"
          style={{ transform: language === 'he' ? 'scaleX(-1)' : undefined }}
        />
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Бестселлеры сайта</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <Star className="w-5 h-5" style={{ color: '#c9a84c' }} />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>
            Бестселлеры сайта
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Выберите до 5 товаров для карусели на beautymania.co.il. Загрузите PNG с прозрачным фоном для каждого слота.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c9a84c' }} />
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {slots.map((slot, i) => (
              <SlotCard
                key={slot.position}
                slot={slot}
                index={i}
                products={products}
                onChange={(updated) => handleSlotChange(i, updated)}
              />
            ))}
          </div>

          <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(255,255,255,0.5)' }}>
            💡 Загружайте PNG с прозрачным фоном — именно они красиво накладываются на тёмный фон карусели. Используйте <strong style={{ color: 'rgba(255,255,255,0.7)' }}>remove.bg</strong> для быстрого удаления фона.
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="flex items-center gap-2 font-medium"
              style={{
                background: dirty ? '#c9a84c' : 'rgba(255,255,255,0.08)',
                color: dirty ? '#0a0a0a' : 'rgba(255,255,255,0.3)',
                cursor: dirty ? 'pointer' : 'default',
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Сохранить и опубликовать
            </Button>

            {dirty && (
              <Button
                onClick={handleReset}
                variant="ghost"
                className="flex items-center gap-2 text-sm"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <RotateCcw className="w-4 h-4" />
                Отменить
              </Button>
            )}

            <div className="flex-1" />

            <a
              href="https://beautymania.co.il/#bestsellers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              <Eye className="w-4 h-4" />
              Открыть сайт
            </a>
          </div>
        </>
      )}
    </div>
  )
}
