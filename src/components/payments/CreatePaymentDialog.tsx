'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { toast } from 'sonner'
import { Loader2, Copy, ExternalLink } from 'lucide-react'

interface CreatePaymentDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePaymentDialog({ clientId, clientName, open, onOpenChange }: CreatePaymentDialogProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  const createPayment = useCreatePaymentLink()

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('הזן סכום תקין')
      return
    }

    try {
      const result = await createPayment.mutateAsync({
        client_id: clientId,
        amount: amountNum,
        description: description || `תשלום עבור ${clientName}`,
      })
      setPaymentLink(result.payment_link)
    } catch (error) {
      console.error('Failed to create payment:', error)
    }
  }

  const handleClose = () => {
    setAmount('')
    setDescription('')
    setPaymentLink(null)
    onOpenChange(false)
  }

  const copyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink)
      toast.success('הקישור הועתק ללוח')
    }
  }

  const openLink = () => {
    if (paymentLink) window.open(paymentLink, '_blank')
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="צור קישור תשלום"
      subtitle={clientName}
      width="440px"
      footer={
        !paymentLink ? (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={createPayment.isPending}
              className="px-5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
            >
              {createPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createPayment.isPending ? 'יוצר...' : 'צור קישור'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <button onClick={handleClose} className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap">
              סגור
            </button>
            <button onClick={openLink} className="px-5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              פתח קישור
            </button>
          </div>
        )
      }
    >
      {!paymentLink ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">סכום (₪) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור התשלום (אופציונלי)"
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <p className="text-sm text-green-800 font-semibold mb-2">✓ קישור התשלום נוצר בהצלחה!</p>
            <p className="text-xs text-green-700">שלח את הקישור ללקוח כדי שיוכל לשלם באופן מאובטח</p>
          </div>

          <div>
            <Label>קישור לתשלום</Label>
            <div className="flex gap-2 mt-1">
              <Input value={paymentLink} readOnly className="flex-1" />
              <button onClick={copyLink} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
