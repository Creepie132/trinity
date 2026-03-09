'use client'

import { useState, useEffect, useMemo } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { useProducts } from '@/hooks/useProducts'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { getClientName } from '@/lib/client-utils'
import { 
  Search, Plus, Minus, X, Percent, ShoppingCart, 
  FileText, Download, Send, MessageCircle, Mail,
  CreditCard, Banknote, Building2, ChevronLeft, Check
} from 'lucide-react'
import type { Product } from '@/types/inventory'
import { useGeneratePDF } from '@/lib/pdf/use-generate-pdf'
import type { ProposalData } from '@/lib/pdf/proposal-types'

interface CartItem {
  product: Product
  quantity: number
  price: number
}

interface DiscountState {
  type: 'percent' | 'amount'
  value: number
}

type Step = 'cart' | 'checkout' | 'proposal' | 'payment-link'

const paymentMethods = [
  { value: 'credit', label: { he: 'אשראי', ru: 'Карта' }, icon: CreditCard },
  { value: 'cash', label: { he: 'מזומן', ru: 'Наличные' }, icon: Banknote },
  { value: 'bank', label: { he: 'העברה בנקאית', ru: 'Перевод' }, icon: Building2 },
]

export function SaleModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const { data: products } = useProducts()

  const isOpen = isModalOpen('client-sale')
  const data = getModalData('client-sale')

  const [step, setStep] = useState<Step>('cart')
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [discount, setDiscount] = useState<DiscountState>({ type: 'percent', value: 0 })
  const [paymentMethod, setPaymentMethod] = useState('credit')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showProposalPanel, setShowProposalPanel] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string>('')
  
  const { generate: generateProposalPDF, loading: pdfLoading } = useGeneratePDF()

  const client = data?.client
  const locale = data?.locale || 'he'

  // Load draft on open
  useEffect(() => {
    if (isOpen && client?.id) {
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
  }, [isOpen, client?.id])

  // Reset on close
  const handleClose = () => {
    setStep('cart')
    setCart([])
    setSearchQuery('')
    setShowDiscount(false)
    setDiscount({ type: 'percent', value: 0 })
    setPaymentMethod('credit')
    setShowProposalPanel(false)
    setPaymentUrl('')
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

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
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

  // Generate Tranzila payment URL
  const generateTranzilaUrl = () => {
    const cleanPhone = client?.phone?.replace(/\D/g, '') || ''
    const params = new URLSearchParams({
      sum: total.toFixed(2),
      currency: '1',
      TranzilaPW: 'ckDffDS',
      cred_type: '1',
      tranmode: 'A',
      success_url: 'https://www.ambersol.co.il/payment-success',
      fail_url: 'https://www.ambersol.co.il/payment-failed',
      notify_url: 'https://www.ambersol.co.il/api/webhooks/tranzila',
      u71: '1',
      ppnumber: cleanPhone,
      contact: clientName,
    })
    return `https://secure.tranzila.com/ambersolttok/iframenew.php?${params.toString()}`
  }

  // Complete sale
  const handleCompleteSale = async () => {
    if (!orgId || !client?.id || cart.length === 0) return

    setIsProcessing(true)
    try {
      const saleItems = cart.map(i => ({
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        price: i.price,
        total: i.price * i.quantity,
      }))

      // Credit card payment — create pending payment + show link
      if (paymentMethod === 'credit') {
        const url = generateTranzilaUrl()
        
        // Create pending payment
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            client_id: client.id,
            org_id: orgId,
            amount: total,
            payment_method: 'credit_card',
            status: 'pending',
            type: 'client',
            description: cart.map(i => `${i.product.name} x${i.quantity}`).join(', '),
            metadata: {
              sale_items: saleItems,
              payment_url: url,
              discount: discount.value > 0 ? discount : null,
            },
          })

        if (paymentError) throw paymentError

        // Show payment link step
        setPaymentUrl(url)
        setStep('payment-link')
        setIsProcessing(false)
        return
      }

      // Cash or bank transfer — create completed payment immediately
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          client_id: client.id,
          org_id: orgId,
          amount: total,
          payment_method: paymentMethod === 'bank' ? 'bank_transfer' : 'cash',
          status: 'completed',
          type: 'client',
          description: cart.map(i => `${i.product.name} x${i.quantity}`).join(', '),
          paid_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Create inventory transactions
      for (const item of cart) {
        await supabase.from('inventory_transactions').insert({
          org_id: orgId,
          product_id: item.product.id,
          type: 'sale',
          quantity: item.quantity,
          price_per_unit: item.price,
          total_price: item.price * item.quantity,
          related_payment_id: payment.id,
        })

        // Update product quantity
        await supabase
          .from('products')
          .update({ quantity: item.product.quantity - item.quantity })
          .eq('id', item.product.id)
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

  // Generate PDF proposal using html2canvas
  const generatePDF = async () => {
    const proposalData: ProposalData = {
      docNumber: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      issueDate: new Date().toLocaleDateString('he-IL').replace(/\./g, '/'),
      validDays: 30,
      seller: {
        name: 'Amber Solutions',
        email: 'ambersolutions.systems@gmail.com',
        phone: '+972-54-485-8586',
        website: 'ambersol.co.il',
        logo: '/logo-amber.png',
      },
      buyer: {
        name: clientName,
        phone: client?.phone || '',
        email: client?.email || '',
        address: client?.address || '',
      },
      items: cart.map(item => ({
        name: item.product.name,
        volume: item.product.unit || '',
        desc: item.product.description || '',
        qty: item.quantity,
        price: item.price,
      })),
      discount: discount.value > 0 ? discount : undefined,
      vat: 0,
      notes: 'הצעת מחיר זו בתוקף למשך 30 יום ממועד הוצאתה.\nתנאי תשלום: 100% בעת מסירה.',
    }

    await generateProposalPDF(proposalData)
    toast.success(locale === 'he' ? 'PDF הורד בהצלחה' : 'PDF скачан')
  }

  // Send via WhatsApp
  const sendWhatsApp = () => {
    if (!client?.phone) return
    const cleanPhone = client.phone.replace(/\D/g, '')
    const whatsappPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone
    
    const items = cart.map(i => `• ${i.product.name} x${i.quantity} = ₪${(i.price * i.quantity).toFixed(2)}`).join('\n')
    const text = `הצעת מחיר / Коммерческое предложение\n\n${items}\n\n${discountAmount > 0 ? `הנחה: -₪${discountAmount.toFixed(2)}\n` : ''}סה"כ: ₪${total.toFixed(2)}`
    
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`, '_blank')
    setShowProposalPanel(false)
  }

  // Send via Email
  const sendEmail = async () => {
    if (!client?.email) {
      toast.error(locale === 'he' ? 'אין אימייל ללקוח' : 'Нет email клиента')
      return
    }
    
    try {
      await fetch('/api/emails/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          clientName,
          items: cart.map(i => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.price,
            total: i.price * i.quantity
          })),
          discount: discountAmount,
          total,
        })
      })
      toast.success(locale === 'he' ? 'הצעת המחיר נשלחה' : 'Предложение отправлено')
      setShowProposalPanel(false)
    } catch (e) {
      toast.error('Error sending email')
    }
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

  if (!isOpen || !client) return null

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

          {/* Payment URL */}
          <div>
            <p className="text-sm text-gray-500 mb-2">{locale === 'he' ? 'קישור לתשלום:' : 'Ссылка на оплату:'}</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl break-all text-sm font-mono text-gray-600">
              {paymentUrl}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={copyPaymentUrl}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
            >
              📋 {locale === 'he' ? 'העתק קישור' : 'Скопировать ссылку'}
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
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map(method => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    paymentMethod === method.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <method.icon className={`w-6 h-6 ${paymentMethod === method.value ? 'text-indigo-600' : 'text-gray-500'}`} />
                  <span className="text-sm font-medium">{method.label[locale as 'he' | 'ru']}</span>
                  {paymentMethod === method.value && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={() => setStep('cart')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            {text.back}
          </button>
          <button
            onClick={handleCompleteSale}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
          >
            {isProcessing ? text.processing : text.pay}
          </button>
        </div>
      </Modal>
    )
  }

  // Step 1: Cart
  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={text.title}
      subtitle={clientName}
      width="800px"
      className="max-w-[95vw]"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Product Search & Cart */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={text.searchProducts}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
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
          disabled={cart.length === 0}
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
  )
}

export default SaleModal
