'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useClients } from '@/hooks/useClients'
import { useCreateCampaign, useRecipientsCount } from '@/hooks/useSms'
import { calculateSmsParts } from '@/lib/inforu'
import { MessageSquare, Users, User, Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export function NewCampaignForm() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'single' | 'inactive_days'>('all')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [inactiveDays, setInactiveDays] = useState('30')
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: clients } = useClients()
  const createCampaign = useCreateCampaign()
  const { data: recipientsCount } = useRecipientsCount(
    filterType,
    filterType === 'inactive_days' ? inactiveDays : selectedClientId
  )

  const smsParts = useMemo(() => calculateSmsParts(message), [message])
  const charCount = message.length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setShowConfirm(false)

    const filterValue =
      filterType === 'single'
        ? selectedClientId
        : filterType === 'inactive_days'
        ? inactiveDays
        : undefined

    await createCampaign.mutateAsync({
      name,
      message,
      filter_type: filterType,
      filter_value: filterValue,
    })

    // Reset form
    setName('')
    setMessage('')
    setFilterType('all')
    setSelectedClientId('')
    setInactiveDays('30')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('sms.newMessage')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('sms.campaignName')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('sms.campaignNamePlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="message">{t('sms.messageContent')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('sms.messageContentPlaceholder')}
                rows={4}
                required
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>
                  {charCount} {t('sms.charactersCount').replace('0', String(charCount)).replace('0', String(smsParts))}
                </span>
                <span className={charCount > 160 ? 'text-orange-600' : ''}>
                  {charCount <= 160 ? t('sms.singleMessage') : t('sms.multiPartMessage')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t('sms.sendingType')}</Label>

              <div className="space-y-2">
                {/* All */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    filterType === 'all'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFilterType('all')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={filterType === 'all'}
                      onChange={() => setFilterType('all')}
                      className="w-4 h-4"
                    />
                    <Users className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-semibold">{t('sms.sendToAll')}</div>
                      <div className="text-sm text-gray-600">{t('sms.sendToAllDesc')}</div>
                    </div>
                  </div>
                </div>

                {/* Single */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    filterType === 'single'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFilterType('single')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={filterType === 'single'}
                      onChange={() => setFilterType('single')}
                      className="w-4 h-4"
                    />
                    <User className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <div className="font-semibold">{t('sms.sendToOne')}</div>
                      <div className="text-sm text-gray-600">{t('sms.sendToOneDesc')}</div>
                    </div>
                  </div>
                  {filterType === 'single' && (
                    <div className="mt-3 mr-7">
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sms.selectClient')} />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.first_name} {client.last_name} - {client.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Inactive */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    filterType === 'inactive_days'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFilterType('inactive_days')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={filterType === 'inactive_days'}
                      onChange={() => setFilterType('inactive_days')}
                      className="w-4 h-4"
                    />
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div className="flex-1">
                      <div className="font-semibold">{t('sms.sendToInactive')}</div>
                      <div className="text-sm text-gray-600">{t('sms.sendToInactiveDesc')}</div>
                    </div>
                  </div>
                  {filterType === 'inactive_days' && (
                    <div className="mt-3 mr-7 flex items-center gap-2">
                      <Label htmlFor="days">{t('sms.inactiveDays')}</Label>
                      <Input
                        id="days"
                        type="number"
                        value={inactiveDays}
                        onChange={(e) => setInactiveDays(e.target.value)}
                        className="w-20"
                        min="1"
                      />
                      <span>{t('sms.days')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            {recipientsCount !== undefined && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-semibold">
                    {t('sms.willBeSentTo').replace('{count}', String(recipientsCount))}
                  </span>
                </div>
                {smsParts > 1 && (
                  <div className="text-sm text-blue-700 mt-1">
                    {t('sms.costPerMessage').replace(/{parts}/g, String(smsParts))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="submit"
                disabled={
                  createCampaign.isPending ||
                  !recipientsCount ||
                  (filterType === 'single' && !selectedClientId)
                }
              >
                {createCampaign.isPending ? t('sms.sending') : t('sms.send')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sms.confirmSend')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sms.confirmMessage').replace('{count}', String(recipientsCount))}
              {smsParts > 1 && (
                <div className="mt-2 text-orange-600">
                  {t('sms.multiPartWarning').replace('{parts}', String(smsParts))}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{t('sms.sendNow')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
