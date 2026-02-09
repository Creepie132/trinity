'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { toast } from 'sonner'
import { MessageSquare, Copy, ExternalLink } from 'lucide-react'

interface CreatePaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePaymentLinkDialog({ open, onOpenChange }: CreatePaymentLinkDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  const { data: clients } = useClients()
  const createPayment = useCreatePaymentLink()

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clients) return []
    if (!searchQuery) return clients

    const query = searchQuery.toLowerCase()
    return clients.filter(
      (client) =>
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.phone.includes(query)
    )
  }, [clients, searchQuery])

  const selectedClient = clients?.find((c) => c.id === selectedClientId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClientId) {
      toast.error('בחר לקוח')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('הזן סכום תקין')
      return
    }

    try {
      const result = await createPayment.mutateAsync({
        client_id: selectedClientId,
        amount: amountNum,
        description: description || 'תשלום',
      })

      setPaymentLink(result.payment_link)
    } catch (error) {
      console.error('Failed to create payment:', error)
    }
  }

  const handleClose = () => {
    setSelectedClientId('')
    setAmount('')
    setDescription('')
    setSearchQuery('')
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

  const sendSMS = () => {
    if (paymentLink && selectedClient) {
      // TODO: Implement SMS sending
      toast.info('שליחת SMS - בפיתוח')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>צור קישור לתשלום</DialogTitle>
        </DialogHeader>

        {!paymentLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="client">לקוח *</Label>
              <div className="space-y-2">
                <Input
                  placeholder="חפש לקוח..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            {selectedClient && (
              <div className="text-sm text-gray-600">
                <strong>לקוח:</strong> {selectedClient.first_name} {selectedClient.last_name}
                <br />
                <strong>סכום:</strong> ₪{amount}
              </div>
            )}

            <div>
              <Label>קישור לתשלום</Label>
              <div className="flex gap-2 mt-1">
                <Input value={paymentLink} readOnly className="flex-1 text-sm" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={copyLink} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 ml-2" />
                העתק קישור
              </Button>
              <Button type="button" onClick={sendSMS} variant="outline" className="flex-1">
                <MessageSquare className="w-4 h-4 ml-2" />
                שלח ב-SMS
              </Button>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                סגור
              </Button>
              <Button type="button" onClick={openLink}>
                <ExternalLink className="w-4 h-4 ml-2" />
                פתח קישור
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
