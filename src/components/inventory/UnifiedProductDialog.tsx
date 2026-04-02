'use client'

/**
 * UnifiedProductDialog — Trinity Standard master component для товаров.
 *
 * Mode 'create': создание нового товара.
 * Mode 'edit':   редактирование существующего (product prop обязателен).
 *
 * ✅ Optimistic Updates — использует useCreateProduct / useUpdateProduct
 *    которые содержат onMutate → мгновенное обновление UI за 0ms,
 *    без ожидания ответа сервера.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { toast } from 'sonner'
import { PackagePlus, Package, Camera, Upload, X, Loader2, Save, Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { BarcodeScanner } from './BarcodeScannerLazy'
import type { Product, CreateProductDTO, UpdateProductDTO } from '@/types/inventory'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductDialogMode = 'create' | 'edit'

interface ProductCategory {
  id: string
  value: string
  label_ru: string
  label_he: string
  is_default: boolean
}

export interface UnifiedProductDialogProps {
  open: boolean
  onClose: () => void
  mode: ProductDialogMode
  product?: Product | null
}

interface ProductForm {
  name: string; description: string; barcode: string; sku: string; category: string
  purchase_price: number | undefined; sell_price: number; quantity: number
  min_quantity: number; unit: string; image_url: string | undefined
}

const EMPTY_FORM: ProductForm = {
  name: '', description: '', barcode: '', sku: '', category: '',
  purchase_price: undefined, sell_price: 0, quantity: 0, min_quantity: 0,
  unit: 'יחידה', image_url: undefined,
}

function productToForm(p: Product): ProductForm {
  return {
    name: p.name || '', description: p.description || '',
    barcode: p.barcode || '', sku: p.sku || '', category: p.category || '',
    purchase_price: p.purchase_price, sell_price: p.sell_price || 0,
    quantity: p.quantity || 0, min_quantity: p.min_quantity || 0,
    unit: p.unit || 'יחידה', image_url: p.image_url,
  }
}

// ── i18n ──────────────────────────────────────────────────────────────────────

const I18N = {
  he: {
    createTitle: 'מוצר חדש', editTitle: 'עריכת מוצר',
    name: 'שם מוצר', barcode: 'ברקוד', sku: 'SKU',
    category: 'קטגוריה', unit: 'יחידת מידה', description: 'תיאור',
    purchasePrice: 'מחיר קנייה', sellPrice: 'מחיר מכירה',
    quantity: 'כמות', minQuantity: 'מינימום',
    photo: 'תמונה', uploadPhoto: 'העלה תמונה', uploading: 'מעלה...',
    photoHint: 'עד 5MB, JPG, PNG, GIF, WebP',
    saving: 'שומר...', create: 'צור מוצר', save: 'שמור שינויים', cancel: 'ביטול',
    fillRequired: 'יש למלא שדות חובה', success: 'הושלם בהצלחה', error: 'שגיאה',
    catBeauty: 'יופי', catHair: 'שיער', catNails: 'ציפורניים',
    catEquipment: 'ציוד', catOther: 'אחר',
    addCategory: '+ חדש', addCategoryPlaceholder: 'שם קטגוריה חדשה', addCategoryBtn: 'הוסף',
    unitPiece: 'יחידה', unitKg: 'ק"ג', unitLiter: 'ליטר', unitPkg: 'אריזה',
    sellPriceLabel: 'מחיר מכירה',
  },
  ru: {
    createTitle: 'Новый товар', editTitle: 'Редактировать товар',
    name: 'Название', barcode: 'Штрихкод', sku: 'Артикул',
    category: 'Категория', unit: 'Единица', description: 'Описание',
    purchasePrice: 'Цена закупки', sellPrice: 'Цена продажи',
    quantity: 'Количество', minQuantity: 'Минимум',
    photo: 'Фотография', uploadPhoto: 'Загрузить фото', uploading: 'Загрузка...',
    photoHint: 'До 5MB, JPG, PNG, GIF, WebP',
    saving: 'Сохранение...', create: 'Создать товар', save: 'Сохранить', cancel: 'Отмена',
    fillRequired: 'Заполните обязательные поля', success: 'Готово', error: 'Ошибка',
    catBeauty: 'Красота', catHair: 'Волосы', catNails: 'Ногти',
    catEquipment: 'Оборудование', catOther: 'Прочее',
    addCategory: '+ Новый', addCategoryPlaceholder: 'Название категории', addCategoryBtn: 'Добавить',
    unitPiece: 'Штука', unitKg: 'Кг', unitLiter: 'Литр', unitPkg: 'Упаковка',
    sellPriceLabel: 'Цена продажи',
  },
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const fieldBox = (color = '#e2e8f0', bg = '#f8fafc'): React.CSSProperties => ({
  background: bg, border: `1.5px solid ${color}`, borderRadius: 14, padding: '12px 14px',
})
const labelSt = (color = '#64748b'): React.CSSProperties => ({
  fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase',
  letterSpacing: '0.08em', display: 'block', marginBottom: 6,
})
const inputSt = (color = '#1e293b', size = 14): React.CSSProperties => ({
  width: '100%', border: 'none', background: 'transparent', padding: 0,
  fontSize: size, fontWeight: 600, color, outline: 'none', boxShadow: 'none',
})

// ── Main Component ────────────────────────────────────────────────────────────
export function UnifiedProductDialog({ open, onClose, mode, product }: UnifiedProductDialogProps) {
  const { language } = useLanguage()
  const s = I18N[language === 'he' ? 'he' : 'ru']
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  // ✅ Optimistic hooks — onMutate обновляет кэш за 0ms без ожидания сервера
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  // ── Dynamic categories ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [addCatMode, setAddCatMode] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/products/categories')
      if (!res.ok) return
      const { categories: cats } = await res.json()
      setCategories(cats ?? [])
    } catch { /* silent */ }
  }, [])

  const handleAddCategory = async () => {
    const label = newCatLabel.trim()
    if (!label || addingCat) return
    setAddingCat(true)
    try {
      const res = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_ru: label }),
      })
      if (!res.ok) throw new Error()
      const { category } = await res.json()
      setCategories(prev => [...prev, category])
      setFormState(prev => ({ ...prev, category: category.value }))
      setNewCatLabel('')
      setAddCatMode(false)
    } catch {
      toast.error(isHe ? 'שגיאה בהוספת קטגוריה' : 'Ошибка создания категории')
    } finally {
      setAddingCat(false)
    }
  }

  const [form, setFormState] = useState<ProductForm>(EMPTY_FORM)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  // ✅ Anti-race condition lock
  const isSubmittingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPending = createProduct.isPending || updateProduct.isPending

  const set = useCallback((patch: Partial<ProductForm>) => {
    setFormState(prev => ({ ...prev, ...patch }))
  }, [])

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && product) setFormState(productToForm(product))
    else setFormState(EMPTY_FORM)
    setImagePreview(null)
    setAddCatMode(false)
    setNewCatLabel('')
    isSubmittingRef.current = false
    loadCategories()
  }, [open, mode, product, loadCategories])

  // ✅ Secure image upload — через сервер, не supabase-browser
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ALLOWED = new Set(['image/jpeg','image/jpg','image/png','image/gif','image/webp'])
    if (!ALLOWED.has(file.type)) { toast.error(isHe ? 'יש להעלות קובץ תמונה' : 'Загрузите файл изображения'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error(isHe ? 'גודל התמונה חורג מ-5MB' : 'Размер превышает 5MB'); return }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/products/upload-image', { method: 'POST', body: fd })
      if (!res.ok) {
        let errMsg = 'Upload failed'
        try {
          const err = await res.json()
          errMsg = err.error || errMsg
        } catch {
          errMsg = res.status === 413 ? (isHe ? 'קובץ גדול מדי (מקסימום 5MB)' : 'Файл слишком большой (макс. 5MB)') : `Upload failed (${res.status})`
        }
        throw new Error(errMsg)
      }
      const { url } = await res.json()
      set({ image_url: url })
      setImagePreview(URL.createObjectURL(file))
      toast.success(isHe ? 'התמונה הועלתה בהצלחה' : 'Изображение загружено')
    } catch (err: any) {
      toast.error(err.message || (isHe ? 'שגיאה בהעלאת התמונה' : 'Ошибка загрузки'))
    } finally {
      setUploading(false) }
  }

  const handleRemoveImage = () => {
    set({ image_url: undefined }); setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ✅ handleSubmit — использует optimistic hooks
  // onMutate внутри хука обновляет кэш МГНОВЕННО (0ms), до ответа сервера
  // onSettled делает фоновый рефетч для синхронизации с БД (реальный id, created_at)
  const handleSubmit = async () => {
    if (isSubmittingRef.current || isPending) return
    if (!form.name.trim() || !form.sell_price) { toast.error(s.fillRequired); return }
    isSubmittingRef.current = true

    try {
      if (mode === 'create') {
        const body: CreateProductDTO = {
          name: form.name.trim(),
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          sku: form.sku || undefined,
          category: form.category || undefined,
          purchase_price: form.purchase_price,
          sell_price: form.sell_price,
          quantity: form.quantity || 0,
          min_quantity: form.min_quantity || 0,
          unit: form.unit || 'יחידה',
          image_url: form.image_url,
        }
        // ✅ onMutate внутри хука добавляет товар в кэш ДО отправки на сервер
        // Пользователь видит товар МГНОВЕННО — модалка закрывается сразу
        await createProduct.mutateAsync(body)
      } else {
        if (!product?.id) throw new Error('No product id for edit')
        const body: UpdateProductDTO = {
          name: form.name.trim(),
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          sku: form.sku || undefined,
          category: form.category || undefined,
          purchase_price: form.purchase_price,
          sell_price: form.sell_price,
          quantity: form.quantity,
          min_quantity: form.min_quantity,
          unit: form.unit,
          image_url: form.image_url,
        }
        // ✅ onMutate внутри хука обновляет товар в кэше мгновенно
        await updateProduct.mutateAsync({ id: product.id, data: body })
      }
      toast.success(s.success)
      // Закрываем сразу — optimistic update уже обновил список
      onClose()
    } catch (err: any) {
      // onError в хуке уже сделал rollback кэша
      toast.error(err.message || s.error)
    } finally {
      isSubmittingRef.current = false
    }
  }

  const categoryOptions = categories.length > 0
    ? categories.map(c => ({ value: c.value, label: isHe ? c.label_he : c.label_ru }))
    : [
        { value: 'beauty',    label: s.catBeauty },
        { value: 'hair',      label: s.catHair },
        { value: 'body',      label: isHe ? 'גוף' : 'Тело' },
        { value: 'nails',     label: s.catNails },
        { value: 'equipment', label: s.catEquipment },
        { value: 'other',     label: s.catOther },
      ]
  const units = [
    { value: 'יחידה', label: s.unitPiece }, { value: 'קילוגרם', label: s.unitKg },
    { value: 'ליטר', label: s.unitLiter }, { value: 'אריזה', label: s.unitPkg },
  ]

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(imagePreview || form.image_url) && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img src={imagePreview || form.image_url || ''} alt=""
            style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
        </div>
      )}
      {form.sell_price > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.12)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>₪{form.sell_price.toFixed(2)}</div>
          <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.sellPriceLabel}</div>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
      <button onClick={handleSubmit} disabled={isPending || uploading}
        style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%',
          background: (isPending || uploading) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : mode === 'create' ? <PackagePlus size={14} /> : <Save size={14} />}
        {isPending ? s.saving : mode === 'create' ? s.create : s.save}
      </button>
      <button onClick={onClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
        {s.cancel}
      </button>
    </div>
  )

  const mobileFooter = (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      <button onClick={onClose}
        style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        {s.cancel}
      </button>
      <button onClick={handleSubmit} disabled={isPending || uploading}
        style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', cursor: (isPending || uploading) ? 'not-allowed' : 'pointer',
          background: (isPending || uploading) ? '#e2e8f0' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          color: (isPending || uploading) ? '#94a3b8' : '#fff', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : mode === 'create' ? <PackagePlus size={15} /> : <Save size={15} />}
        {isPending ? s.saving : mode === 'create' ? s.create : s.save}
      </button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal open={open} onClose={onClose} darkHeader showCloseButton={false}
        width="780px" dir={dir} contentClassName="!p-0" size="xl">
        <TrinityModalShell
          open={open} onClose={onClose}
          icon={mode === 'create' ? <PackagePlus /> : <Package />}
          title={mode === 'create' ? s.createTitle : s.editTitle}
          subtitle={form.name || (mode === 'create' ? (isHe ? 'מוצר חדש' : 'Новый товар') : (product?.name || ''))}
          dir={dir} sidebarExtra={sidebar} footerContent={mobileFooter}>
          <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

            {/* Name */}
            <div style={fieldBox()}>
              <label style={labelSt()}>{s.name} <span style={{ color: '#ef4444' }}>*</span></label>
              <Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder={s.name} style={inputSt('#1e293b', 15)} />
            </div>

            {/* Image upload */}
            <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: '12px 14px' }}>
              <label style={labelSt()}>{s.photo}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {(imagePreview || form.image_url) ? (
                  <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', flexShrink: 0 }}>
                    <img src={imagePreview || form.image_url || ''} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={handleRemoveImage}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 12, border: '2px dashed #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Upload size={20} color="#94a3b8" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ width: '100%', padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Upload size={13} />{uploading ? s.uploading : s.uploadPhoto}
                  </button>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0' }}>{s.photoHint}</p>
                </div>
              </div>
            </div>

            {/* Barcode + SKU */}
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldBox()}>
                <label style={labelSt()}>{s.barcode}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Input value={form.barcode} onChange={e => set({ barcode: e.target.value })} placeholder={s.barcode} style={{ ...inputSt('#334155', 13), flex: 1 }} />
                  <button type="button" onClick={() => setScannerOpen(true)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <Camera size={13} color="#64748b" />
                  </button>
                </div>
              </div>
              <div style={fieldBox()}>
                <label style={labelSt()}>{s.sku}</label>
                <Input value={form.sku} onChange={e => set({ sku: e.target.value })} placeholder={s.sku} style={inputSt('#334155', 13)} />
              </div>
            </div>

            {/* Category + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldBox('#ddd6fe', 'linear-gradient(135deg,#f5f3ff,#ede9fe)')}>
                <label style={labelSt('#6d28d9')}>{s.category}</label>
                {addCatMode ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={newCatLabel}
                      onChange={e => setNewCatLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setAddCatMode(false); setNewCatLabel('') } }}
                      placeholder={s.addCategoryPlaceholder}
                      style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#6d28d9', outline: 'none' }}
                    />
                    <button type="button" onClick={handleAddCategory} disabled={addingCat || !newCatLabel.trim()}
                      style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: (!newCatLabel.trim() || addingCat) ? 0.5 : 1 }}>
                      {addingCat ? '...' : s.addCategoryBtn}
                    </button>
                    <button type="button" onClick={() => { setAddCatMode(false); setNewCatLabel('') }}
                      style={{ padding: '3px 6px', borderRadius: 6, border: 'none', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Select value={form.category} onValueChange={v => set({ category: v })}>
                        <SelectTrigger className="w-full border-0 bg-transparent shadow-none focus:ring-0 px-0 text-[13px] font-semibold text-purple-700 h-auto"><SelectValue placeholder={s.category} /></SelectTrigger>
                        <SelectContent>{categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <button type="button" onClick={() => setAddCatMode(true)}
                      title={s.addCategory}
                      style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #c4b5fd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Plus size={13} color="#7c3aed" />
                    </button>
                  </div>
                )}
              </div>
              <div style={fieldBox('#bbf7d0', 'linear-gradient(135deg,#f0fdf4,#dcfce7)')}>
                <label style={labelSt('#15803d')}>{s.unit}</label>
                <Select value={form.unit} onValueChange={v => set({ unit: v })}>
                  <SelectTrigger className="w-full border-0 bg-transparent shadow-none focus:ring-0 px-0 text-[13px] font-semibold text-green-700 h-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div style={fieldBox('#fde68a', '#fffbeb')}>
              <label style={labelSt('#92400e')}>{s.description}</label>
              <Textarea value={form.description} onChange={e => set({ description: e.target.value })} placeholder={s.description} rows={2}
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 13, color: '#78350f', resize: 'none', outline: 'none', boxShadow: 'none', width: '100%' }} />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldBox()}>
                <label style={labelSt()}>{s.purchasePrice}</label>
                <Input type="number" step="0.01" value={form.purchase_price ?? ''}
                  onChange={e => set({ purchase_price: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="0.00" style={inputSt('#475569', 15)} />
              </div>
              <div style={fieldBox('#bbf7d0', 'linear-gradient(135deg,#f0fdf4,#dcfce7)')}>
                <label style={labelSt('#15803d')}>{s.sellPrice} <span style={{ color: '#ef4444' }}>*</span></label>
                <Input type="number" step="0.01" value={form.sell_price || ''}
                  onChange={e => set({ sell_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" style={inputSt('#16a34a', 15)} />
              </div>
            </div>

            {/* Quantity + Min */}
            <div className="grid grid-cols-2 gap-3">
              <div style={fieldBox('#bfdbfe', 'linear-gradient(135deg,#eff6ff,#dbeafe)')}>
                <label style={labelSt('#1d4ed8')}>{s.quantity} <span style={{ color: '#ef4444' }}>*</span></label>
                <Input type="number" value={form.quantity || ''}
                  onChange={e => set({ quantity: parseInt(e.target.value) || 0 })} placeholder="0" style={inputSt('#1d4ed8', 15)} />
              </div>
              <div style={fieldBox('#fde68a', 'linear-gradient(135deg,#fefce8,#fef9c3)')}>
                <label style={labelSt('#92400e')}>{s.minQuantity}</label>
                <Input type="number" value={form.min_quantity || ''}
                  onChange={e => set({ min_quantity: parseInt(e.target.value) || 0 })} placeholder="0" style={inputSt('#d97706', 15)} />
              </div>
            </div>
          </div>
        </TrinityModalShell>
      </Modal>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)}
        onScan={barcode => { set({ barcode }); setScannerOpen(false) }} />
    </>
  )
}
