'use client'

import { useState, useEffect, useMemo } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { useProducts } from '@/hooks/useProducts'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useBranch } from '@/contexts/BranchContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getClientName } from '@/lib/client-utils'
import {
  Search, Plus, Minus, X, Percent, ShoppingCart,
  FileText, Download, MessageCircle, Mail,
  CreditCard, Banknote, Building2, ChevronLeft, Check, LayoutGrid,
  Smartphone, Scissors
} from 'lucide-react'
import type { Product } from '@/types/inventory'
import { useGeneratePDF } from '@/lib/pdf/use-generate-pdf'
import type { ProposalData } from '@/lib/pdf/proposal-types'
import { sendProposalEmail } from '@/app/actions/send-proposal-email'
import ProductCatalogModal from '@/components/sales/ProductCatalogModal'

interface CartItem {
  product: Product
  quantity: number
  price: number
}

interface DiscountState {
  type: 'percent' | 'amount'
  value: number
}

// Preloaded items (e.g. visit services) shown as read-only rows
interface PreloadedItem {
  id: string
  name: string
  price: number
}

type Step = 'cart' | 'checkout' | 'proposal' | 'payment-link'

const paymentMethods = [
  { value: 'credit', label: { he: 'אשראי', ru: 'Карта' }, icon: CreditCard },
  { value: 'cash', label: { he: 'מזומן', ru: 'Наличные' }, icon: Banknote },
  { value: 'bit', label: { he: 'Bit', ru: 'Bit' }, icon: Smartphone },
  { value: 'bank', label: { he: 'העברה בנקאית', ru: 'Перевод' }, icon: Building2 },
]

export function SaleModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { orgId } = useAuth()
  const { activeOrgId } = useBranch()
  const { data: org } = useOrganization()
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()
  const { data: products } = useProducts()

  const isOpen = isModalOpen('client-sale')
  const data = getModalData('client-sale')

  // Preloaded items from visit services (read-only)
  const preloadedItems: PreloadedItem[] = data?.preloadedItems || []
  // Visit ID — when provided, mark visit completed on payment
  const visitId: string | undefined = data?.visitId
  // Product for inventory sell — pre-populate cart
  const preloadedProduct: Product | undefined = data?.preloadedProduct

  // For inventory: localClient when no client passed
  const [localClient, setLocalClient] = useState<any>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])
  const [clientSearching, setClientSearching] = useState(false)

  const initialStep: Step = preloadedItems.length > 0 ? 'checkout' : 'cart'

  const [step, setStep] = useState<Step>(initialStep)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [discount, setDiscount] = useState<DiscountState>({ type: 'percent', value: 0 })
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showProposalPanel, setShowProposalPanel] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string>('')
  const [catalogOpen, setCatalogOpen] = useState(false)

  const { download, uploadAndGetLink, loading: pdfLoading } = useGeneratePDF()

  const client = data?.client || localClient
  const locale = data?.locale || 'he'

  // Load draft on open / pre-populate cart from preloaded product
  useEffect(() => {
    if (!isOpen) return
    // Pre-populate cart with inventory product
    if (preloadedProduct) {
      setCart([{ product: preloadedProduct, quantity: 1, price: preloadedProduct.sell_price }])
      setStep('cart')
      return
    }
    // Load draft for client sale
    if (client?.id) {
      const draftKey = `draft_sale_${client.id}`
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          setCart(parsed.cart || [])
          setDiscount(parsed.discount || { type: 'percent', value: 0 })
        } catch (e) {
          console.error('Failed to load draft:', e)
        }
      }
    }
    // Set initial step based on context
    setStep(preloadedItems.length > 0 ? 'checkout' : 'cart')
  }, [isOpen])

  // Client search for inventory mode (no pre-selected client)
  useEffect(() => {
    if (!isOpen || data?.client || clientSearch.length < 2) {
      setClientResults([])
      return
    }
    setClientSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        const json = await res.json()
        setClientResults((json.clients || json || []).slice(0, 8))
      } catch {
        setClientResults([])
      } finally {
        setClientSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, isOpen, data?.client])

  // Reset on close
  const handleClose = () => {
    setStep('cart')
    setCart([])
    setSearchQuery('')
    setShowDiscount(false)
    setDiscount({ type: 'percent', value: 0 })
    setPaymentMethod('cash')
    setShowProposalPanel(false)
    setPaymentUrl('')
    setLocalClient(null)
    setClientSearch('')
    setClientResults([])
    closeModal('client-sale')
  }

  const clientName = client ? getClientName(client) : ''

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!products) return []
    const active = products.filter(p => p.is_active && p.quantity > 0)
    if (!searchQuery) return active.slice(0, 10)
    const q = searchQuery.toLowerCase()
    return active.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.barcode?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  // Cart calculations (include preloaded items in subtotal)
  const preloadedSubtotal = preloadedItems.reduce((sum, i) => sum + i.price, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = preloadedSubtotal + cartSubtotal
  const discountAmount = discount.type === 'percent'
    ? subtotal * (discount.value / 100)
    : discount.value
  const total = Math.max(0, subtotal - discountAmount)
  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0

  // Add product to cart
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1, price: product.sell_price }])
    }
    setSearchQuery('')
  }

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id !== productId) return item
      const newQty = Math.max(1, Math.min(item.quantity + delta, item.product.quantity))
      return { ...item, quantity: newQty }
    }))
  }

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  // Save draft
  const handleSaveDraft = () => {
    if (!client?.id) return
    const draftKey = `draft_sale_${client.id}`
    localStorage.setItem(draftKey, JSON.stringify({ cart, discount }))
    toast.success(locale === 'he' ? 'העסקה נשמרה' : 'Сделка сохранена')
    handleClose()
  }

  // Check if org has terminal configured (password never exposed to client)
  const orgTerminal = (org as any)?.tranzila_terminal || ''

  // Complete sale
  const handleCompleteSale = async () => {
    if (!orgId || !client?.id || total <= 0) return

    setIsProcessing(true)
    try {
      const saleItems = [
        ...preloadedItems.map(i => ({
          product_name: i.name,
          quantity: 1,
          price: i.price,
          total: i.price,
        })),
        ...cart.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          price: i.price,
          total: i.price * i.quantity,
        })),
      ]

      const description = saleItems.map(i => `${i.product_name} x${i.quantity}`).join(', ')

      // Credit card payment — create pending payment via server (password never sent to client)
      if (paymentMethod === 'credit') {
        if (!orgTerminal) {
          toast.error(locale === 'he'
            ? 'טרמינל Tranzila לא מוגדר. פנה למנהל המערכת.'
            : 'Платёжный терминал не настроен. Обратитесь к администратору.')
          setIsProcessing(false)
          return
        }

        const res = await fetch('/api/payments/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: client.id,
            amount: total,
            description,
            ...(visitId ? { visit_id: visitId } : {}),
          }),
        })

        const result = await res.json()

        if (!res.ok || !result.payment_link) {
          toast.error(result.error || (locale === 'he' ? 'שגיאה ביצירת קישור תשלום' : 'Ошибка создания платёжной ссылки'))
          setIsProcessing(false)
          return
        }

        setPaymentUrl(result.payment_link)
        setStep('payment-link')
        setIsProcessing(false)
        return
      }

      // Cash / Bit / bank transfer — create completed payment immediately
      const methodMap: Record<string, string> = {
        cash: 'cash',
        bit: 'bit',
        bank: 'bank_transfer',
        credit: 'credit_card',
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          client_id: client.id,
          org_id: orgId,
          amount: total,
          payment_method: methodMap[paymentMethod] || paymentMethod,
          status: 'completed',
          type: 'client',
          description,
          ...(visitId ? { visit_id: visitId } : {}),
          paid_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Inventory transactions only for cart products (not preloaded services)
      // Use /api/inventory (service role) to support branch isolation
      for (const item of cart) {
        const inventoryHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (activeOrgId) inventoryHeaders['X-Branch-Org-Id'] = activeOrgId

        await fetch('/api/inventory', {
          method: 'POST',
          headers: inventoryHeaders,
          body: JSON.stringify({
            product_id: item.product.id,
            type: 'sale',
            quantity: item.quantity,
            price_per_unit: item.price,
            total_price: item.price * item.quantity,
            related_payment_id: payment.id,
          }),
        })
      }

      // Mark visit as completed if visitId provided
      if (visitId) {
        await fetch(`/api/visits/${visitId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
        queryClient.invalidateQueries({ queryKey: ['visits'] })
      }

      // Clear draft
      localStorage.removeItem(`draft_sale_${client.id}`)

      toast.success(locale === 'he' ? 'התשלום התקבל ✓' : 'Оплата принята ✓')
      handleClose()
    } catch (error: any) {
      console.error('Sale error:', error)
      toast.error(error.message || 'Error completing sale')
    } finally {
      setIsProcessing(false)
    }
  }

  // Copy payment URL to clipboard
  const copyPaymentUrl = () => {
    navigator.clipboard.writeText(paymentUrl)
    toast.success(locale === 'he' ? 'הקישור הועתק' : 'Ссылка скопирована')
  }

  // Send payment link via WhatsApp
  const sendPaymentWhatsApp = () => {
    if (!client?.phone) return
    const cleanPhone = client.phone.replace(/\D/g, '')
    const whatsappPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone
    const text = `שלום ${clientName},\n\nלהלן קישור לתשלום בסך ₪${total.toFixed(2)}:\n${paymentUrl}`
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Send payment link via SMS
  const sendPaymentSMS = () => {
    if (!client?.phone) return
    const text = `קישור לתשלום ₪${total.toFixed(2)}: ${paymentUrl}`
    window.location.href = `sms:${client.phone}?body=${encodeURIComponent(text)}`
  }

  // Build ProposalData object
  const buildProposalData = (): ProposalData => ({
    docNumber: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    issueDate: new Date().toLocaleDateString('he-IL').replace(/\./g, '/'),
    validDays: 30,
    seller: {
      name: org?.name || 'Amber Solutions',
      email: org?.email || '',
      phone: org?.phone || '',
      website: (org as any)?.website || '',
      address: (org as any)?.address || '',
      logo: (org as any)?.logo_url || '/logo-amber.png',
    },
    buyer: {
      name: clientName,
      phone: client?.phone || '',
      email: client?.email || '',
      address: client?.address || '',
    },
    items: [
      ...preloadedItems.map(i => ({ name: i.name, volume: '', desc: '', qty: 1, price: i.price })),
      ...cart.map(item => ({
        name: item.product.name,
        volume: item.product.unit || '',
        desc: item.product.description || '',
        qty: item.quantity,
        price: item.price,
      })),
    ],
    discount: discount.value > 0 ? discount : undefined,
    vat: 0,
    notes: 'הצעת מחיר זו בתוקף למשך 30 יום ממועד הוצאתה.\nתנאי תשלום: 100% בעת מסירה.',
  })

  // Download PDF locally
  const generatePDF = async () => {
    const proposalData = buildProposalData()
    await download(proposalData)
    toast.success(locale === 'he' ? 'PDF הורד בהצלחה' : 'PDF скачан')
  }

  // Send via WhatsApp with PDF link
  const sendWhatsApp = async () => {
    if (!client?.phone) {
      toast.error(locale === 'he' ? 'אין טלפון ללקוח' : 'Нет телефона клиента')
      return
    }
    
    const cleanPhone = client.phone.replace(/\D/g, '')
    const whatsappPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone
    
    // Upload PDF to Storage and get signed URL
    let pdfLink = ''
    try {
      const proposalData = buildProposalData()
      pdfLink = await uploadAndGetLink(proposalData)
    } catch {
      toast.error(locale === 'he' ? 'שגיאה ביצירת קישור ל-PDF' : 'Ошибка создания PDF')
      return
    }
    
    const lines = cart.map(item => 
      `• ${item.product.name} ×${item.quantity} — ₪${(item.quantity * item.price).toFixed(2)}`
    ).join('\n')
    
    const discountLine = discountAmount > 0 ? `🏷️ הנחה: −₪${discountAmount.toFixed(2)}\n` : ''
    
    const msg = [
      `*הצעת מחיר #${buildProposalData().docNumber}*`,
      `מאת: *${org?.name || 'Amber Solutions'}*`,
      `ללקוח: ${clientName}`,
      `תאריך: ${new Date().toLocaleDateString('he-IL')}`,
      ``,
      `*פירוט הזמנה:*`,
      lines,
      ``,
      discountLine + `*💰 לתשלום: ₪${total.toFixed(2)}*`,
      ``,
      `📄 להורדת הצעת המחיר (PDF):`,
      pdfLink,
      `⏳ _הקישור בתוקף ל-3 ימים בלבד_`,
      ``,
      `_מופק ע"י Trinity CRM_`,
    ].filter(Boolean).join('\n')
    
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    setShowProposalPanel(false)
  }

  // Send via Email with PDF link
  const sendEmail = async () => {
    if (!client?.email) {
      toast.error(locale === 'he' ? 'אין אימייל ללקוח' : 'Нет email клиента')
      return
    }
    
    // Upload PDF to Storage (optional - email works without it)
    let pdfLink = ''
    try {
      const proposalData = buildProposalData()
      pdfLink = await uploadAndGetLink(proposalData)
    } catch {
      // PDF link not critical, continue without it
    }
    
    const itemsList = cart.map(item => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:8px 10px;color:#333">${item.product.name}</td>
        <td style="padding:8px 10px;text-align:center;color:#333">${item.quantity}</td>
        <td style="padding:8px 10px;color:#1B2A4A;font-weight:600">₪${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('')
    
    try {
      await sendProposalEmail({
        toEmail: client.email,
        toName: clientName,
        orgName: org?.name || 'Amber Solutions',
        proposalNumber: buildProposalData().docNumber,
        totalAmount: `₪${total.toFixed(2)}`,
        itemsList,
        pdfLink,
        notes: 'הצעת מחיר זו בתוקף למשך 30 יום.',
      })
      toast.success(locale === 'he' ? 'הצעת המחיר נשלחה בהצלחה ✓' : 'Предложение отправлено ✓')
      setShowProposalPanel(false)
    } catch {
      toast.error(locale === 'he' ? 'שגיאה בשליחת האימייל' : 'Ошибка отправки email')
    }
  }

  // Add product from catalog
  const addProductFromCatalog = (product: Product) => {
    addToCart(product)
    setCatalogOpen(false)
  }

  const t = {
    he: {
      title: 'עסקה חדשה',
      searchProducts: 'חיפוש מוצרים...',
      cart: 'עגלת קניות',
      emptyCart: 'העגלה ריקה',
      subtotal: 'סכום ביניים',
      discount: 'הנחה',
      total: 'סה"כ לתשלום',
      checkout: 'לתשלום',
      save: 'שמור',
      proposal: 'הצעת מחיר',
      cancel: 'ביטול',
      pay: 'שלם',
      back: 'חזרה',
      paymentMethod: 'אמצעי תשלום',
      clientInfo: 'פרטי לקוח',
      orderSummary: 'סיכום הזמנה',
      percent: 'אחוז',
      amount: 'סכום',
      whatsapp: 'WhatsApp',
      email: 'Email',
      downloadPdf: 'הורד PDF',
      processing: 'מעבד...',
    },
    ru: {
      title: 'Новая сделка',
      searchProducts: 'Поиск товаров...',
      cart: 'Корзина',
      emptyCart: 'Корзина пуста',
      subtotal: 'Подитог',
      discount: 'Скидка',
      total: 'К оплате',
      checkout: 'Оформить',
      save: 'Сохранить',
      proposal: 'Предложение',
      cancel: 'Отмена',
      pay: 'Оплатить',
      back: 'Назад',
      paymentMethod: 'Способ оплаты',
      clientInfo: 'Данные клиента',
      orderSummary: 'Состав заказа',
      percent: 'Процент',
      amount: 'Сумма',
      whatsapp: 'WhatsApp',
      email: 'Email',
      downloadPdf: 'Скачать PDF',
      processing: 'Обработка...',
    }
  }
  const text = t[locale as keyof typeof t] || t.he

  if (!isOpen) return null

  // Step 3: Payment Link (for credit card)
  if (step === 'payment-link') {
    return (
      <Modal
        open={isOpen}
        onClose={handleClose}
        title={locale === 'he' ? 'קישור לתשלום' : 'Ссылка на оплату'}
        subtitle={clientName}
        width="500px"
        className="max-w-[95vw]"
      >
        <div className="space-y-6">
          {/* Amount */}
          <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">{locale === 'he' ? 'סכום לתשלום' : 'Сумма к оплате'}</p>
            <p className="text-3xl font-bold text-green-600">₪{total.toFixed(2)}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={copyPaymentUrl}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
            >
              📋 {locale === 'he' ? 'העתק קישור' : 'Скопировать ссылку'}
            </button>

            <button
              onClick={() => window.open(paymentUrl, '_blank')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition"
            >
              🔗 {locale === 'he' ? 'פתח קישור' : 'Перейти по ссылке'}
            </button>
            
            {client?.phone && (
              <>
                <button
                  onClick={sendPaymentWhatsApp}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition"
                >
                  💬 {locale === 'he' ? 'שלח ב-WhatsApp' : 'Отправить WhatsApp'}
                </button>
                
                <button
                  onClick={sendPaymentSMS}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition"
                >
                  ✉️ SMS
                </button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="text-center text-sm text-gray-500">
            <p>{locale === 'he' ? 'התשלום יעודכן אוטומטית לאחר השלמת העסקה' : 'Платёж обновится автоматически после оплаты'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition"
          >
            {locale === 'he' ? 'סגור' : 'Закрыть'}
          </button>
        </div>
      </Modal>
    )
  }

  // Step 2: Checkout
  if (step === 'checkout') {
    return (
      <Modal
        open={isOpen}
        onClose={handleClose}
        title={text.title}
        subtitle={clientName}
        width="600px"
        className="max-w-[95vw]"
      >
        <div className="space-y-6">
          {/* Client Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">{text.clientInfo}</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
              <p className="font-medium">{clientName}</p>
              {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
              {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
              {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">{text.orderSummary}</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
              {/* Preloaded services (read-only) */}
              {preloadedItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    {item.name}
                  </span>
                  <span>₪{item.price.toFixed(2)}</span>
                </div>
              ))}
              {/* Cart products */}
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>{item.product.name} x{item.quantity}</span>
                  <span>₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{text.discount}</span>
                    <span>-₪{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-1">
                  <span>{text.total}</span>
                  <span>₪{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">{text.paymentMethod}</h3>
            {!orgTerminal && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                {locale === 'he'
                  ? 'טרמינל Tranzila לא מוגדר — תשלום באשראי אינו זמין. פנה למנהל המערכת.'
                  : 'Терминал Tranzila не настроен — оплата картой недоступна. Обратитесь к администратору.'}
              </p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map(method => {
                const isDisabled = method.value === 'credit' && !orgTerminal
                return (
                  <button
                    key={method.value}
                    onClick={() => !isDisabled && setPaymentMethod(method.value)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                      isDisabled
                        ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                        : paymentMethod === method.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <method.icon className={`w-6 h-6 ${paymentMethod === method.value && !isDisabled ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <span className="text-sm font-medium">{method.label[locale as 'he' | 'ru']}</span>
                    {paymentMethod === method.value && !isDisabled && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          {/* Back: if preloaded items, just close; otherwise back to cart */}
          {preloadedItems.length > 0 ? (
            <button
              onClick={() => setShowProposalPanel(!showProposalPanel)}
              className="flex-1 py-3 rounded-xl border-2 border-amber-400 text-amber-600 font-medium hover:bg-amber-50 transition text-sm"
            >
              📋 {text.proposal}
            </button>
          ) : (
            <button
              onClick={() => setStep('cart')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              {text.back}
            </button>
          )}
          <button
            onClick={handleCompleteSale}
            disabled={isProcessing || total <= 0 || !client?.id}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50 font-semibold"
          >
            {isProcessing ? text.processing : `✓ ${text.pay}`}
          </button>
        </div>

        {/* Proposal panel in checkout */}
        {showProposalPanel && (
          <div className="mt-3 p-4 border border-gray-200 rounded-xl space-y-2">
            <button onClick={sendWhatsApp} disabled={!client?.phone}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">
              <MessageCircle className="w-4 h-4" /> {text.whatsapp}
            </button>
            <button onClick={sendEmail} disabled={!client?.email}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
              <Mail className="w-4 h-4" /> {text.email}
            </button>
            <button onClick={generatePDF}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700">
              <Download className="w-4 h-4" /> {text.downloadPdf}
            </button>
          </div>
        )}
      </Modal>
    )
  }

  // Step 1: Cart
  return (
    <>
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={text.title}
      subtitle={client ? clientName : (locale === 'he' ? 'בחר לקוח' : 'Выберите клиента')}
      width="800px"
      className="max-w-[95vw]"
    >
      {/* Client search (for inventory mode — no pre-selected client) */}
      {!data?.client && (
        <div className="mb-4 relative">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
            <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
            {localClient ? (
              <div className="flex-1 flex items-center justify-between">
                <span className="font-medium text-sm">
                  {getClientName(localClient)} · {localClient.phone}
                </span>
                <button onClick={() => { setLocalClient(null); setClientSearch('') }}
                  className="text-gray-400 hover:text-red-500 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder={locale === 'he' ? 'חיפוש לקוח...' : 'Поиск клиента...'}
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
              />
            )}
          </div>
          {clientResults.length > 0 && !localClient && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
              {clientResults.map((c: any) => (
                <button key={c.id} onClick={() => { setLocalClient(c); setClientSearch(''); setClientResults([]) }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b last:border-b-0">
                  <div>
                    <p className="font-medium text-sm">{getClientName(c)}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Product Search & Cart */}
        <div className="space-y-4">
          {/* Search + Catalog Button */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={text.searchProducts}
                className="w-full pr-10 pl-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setCatalogOpen(true)}
              className="w-12 h-12 flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-400 transition-colors"
              title={locale === 'he' ? 'כל המוצרים' : 'Каталог'}
            >
              <LayoutGrid className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Product suggestions */}
          {searchQuery && filteredProducts.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0 text-left"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">₪{product.sell_price.toFixed(2)} · {product.quantity} {product.unit}</p>
                  </div>
                  <Plus className="w-5 h-5 text-indigo-600" />
                </button>
              ))}
            </div>
          )}

          {/* Cart Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              {text.cart}
            </h3>
            {cart.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-xl">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">{text.emptyCart}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        ₪{item.price.toFixed(2)} × {item.quantity} = ₪{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-4">
          {/* Items Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h3 className="font-semibold mb-3">{text.orderSummary}</h3>
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm py-1">
                <span>{item.product.name} × {item.quantity}</span>
                <span>₪{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Discount */}
          <div>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Percent className="w-4 h-4" />
              {text.discount}
            </button>
            
            {showDiscount && (
              <div className="mt-3 p-4 border border-indigo-200 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setDiscount({ ...discount, type: 'percent' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      discount.type === 'percent' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white dark:bg-gray-800 border'
                    }`}
                  >
                    {text.percent} %
                  </button>
                  <button
                    onClick={() => setDiscount({ ...discount, type: 'amount' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      discount.type === 'amount' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white dark:bg-gray-800 border'
                    }`}
                  >
                    {text.amount} ₪
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max={discount.type === 'percent' ? 100 : subtotal}
                  value={discount.value || ''}
                  onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800"
                  placeholder={discount.type === 'percent' ? '10' : '50'}
                />
                {discountAmount > 0 && (
                  <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">
                    {text.discount}: ₪{discountAmount.toFixed(2)} ({discountPercent.toFixed(1)}%)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
            <div className="flex justify-between text-sm mb-1">
              <span>{text.subtotal}</span>
              <span>₪{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600 mb-1">
                <span>{text.discount}</span>
                <span>-₪{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-green-700 dark:text-green-300 pt-2 border-t border-green-200">
              <span>{text.total}</span>
              <span>₪{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Proposal Panel */}
          {showProposalPanel && (
            <div className="p-4 border border-gray-200 rounded-xl space-y-2">
              <button
                onClick={sendWhatsApp}
                disabled={!client?.phone}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" />
                {text.whatsapp}
              </button>
              <button
                onClick={sendEmail}
                disabled={!client?.email}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                {text.email}
              </button>
              <button
                onClick={generatePDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                {text.downloadPdf}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 pt-4 border-t">
        <button
          onClick={() => setStep('checkout')}
          disabled={cart.length === 0 || !client?.id}
          className="py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
        >
          {text.checkout}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={cart.length === 0}
          className="py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 disabled:opacity-50 transition text-sm"
        >
          {text.save}
        </button>
        <button
          onClick={() => setShowProposalPanel(!showProposalPanel)}
          disabled={cart.length === 0}
          className="py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 transition text-sm"
        >
          {text.proposal}
        </button>
        <button
          onClick={handleClose}
          className="py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition text-sm"
        >
          {text.cancel}
        </button>
      </div>
    </Modal>

    {/* Product Catalog Modal */}
    <ProductCatalogModal
      isOpen={catalogOpen}
      onClose={() => setCatalogOpen(false)}
      products={products || []}
      onAddProduct={addProductFromCatalog}
    />
    </>
  )
}

export default SaleModal
