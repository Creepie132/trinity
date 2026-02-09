'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { toast } from 'sonner'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
    if (paymentLink) {
      window.open(paymentLink, '_blank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>צור קישור תשלום</DialogTitle>
        </DialogHeader>

        {!paymentLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>לקוח</Label>
              <Input value={clientName} disabled />
            </div>

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

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                ביטול
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? 'יוצר...' : 'צור קישור'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-semibold mb-2">
                ✓ קישור התשלום נוצר בהצלחה!
              </p>
              <p className="text-xs text-green-700">
                שלח את הקישור ללקוח כדי שיוכל לשלם באופן מאובטח
              </p>
            </div>

            <div>
              <Label>קישור לתשלום</Label>
              <div className="flex gap-2 mt-1">
                <Input value={paymentLink} readOnly className="flex-1" />
                <Button type="button" onClick={copyLink} variant="outline">
                  העתק
                </Button>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                סגור
              </Button>
              <Button type="button" onClick={openLink}>
                פתח קישור
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
