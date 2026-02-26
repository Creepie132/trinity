'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Building2, Save, X } from 'lucide-react'
import { ClientSearchInput } from '@/components/ui/ClientSearchInput'
import ModalWrapper from '@/components/ModalWrapper'

interface EditOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  organization: {
    id: string
    name: string
    display_name: string
    owner_name: string
    phone: string
    features?: any
  } | null
  onSaved?: () => void
}

const translations = {
  he: {
    title: 'עריכת ארגון',
    orgName: 'שם הארגון',
    owner: 'בעלים',
    phone: 'טלפון',
    address: 'כתובת',
    city: 'עיר',
    save: 'שמור',
    cancel: 'ביטול',
    saving: 'שומר...',
    saved: 'הארגון עודכן בהצלחה',
    error: 'שגיאה בעדכון הארגון',
  },
  ru: {
    title: 'Редактирование организации',
    orgName: 'Название организации',
    owner: 'Владелец',
    phone: 'Телефон',
    address: 'Адрес',
    city: 'Город',
    save: 'Сохранить',
    cancel: 'Отмена',
    saving: 'Сохранение...',
    saved: 'Организация успешно обновлена',
    error: 'Ошибка обновления организации',
  },
  en: {
    title: 'Edit Organization',
    orgName: 'Organization Name',
    owner: 'Owner',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    saved: 'Organization updated successfully',
    error: 'Error updating organization',
  },
}

export function EditOrganizationModal({ isOpen, onClose, organization, onSaved }: EditOrganizationModalProps) {
  const { language } = useLanguage()
  const t = translations[language]

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    display_name: '',
    owner_name: '',
    mobile: '',
    address: '',
    city: '',
  })

  // Инициализация формы при открытии модалки
  useEffect(() => {
    if (organization && isOpen) {
      const businessInfo = organization.features?.business_info || {}
      
      // Функция для очистки значений "—"
      const cleanValue = (value: any) => {
        if (!value || value === '—') return ''
        return value
      }
      
      setFormData({
        display_name: cleanValue(businessInfo.display_name || organization.display_name || organization.name),
        owner_name: cleanValue(businessInfo.owner_name || organization.owner_name),
        mobile: cleanValue(businessInfo.mobile || organization.phone),
        address: cleanValue(businessInfo.address),
        city: cleanValue(businessInfo.city),
      })
    }
  }, [organization, isOpen])

  const handleSave = async () => {
    if (!organization) return

    setLoading(true)
    try {
      // Обновляем business_info в features
      const currentFeatures = organization.features || {}
      const updatedFeatures = {
        ...currentFeatures,
        business_info: {
          ...(currentFeatures.business_info || {}),
          ...formData,
        },
      }

      const response = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: organization.id,
          features: updatedFeatures,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ ERROR updating organization:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          orgId: organization.id,
          features: updatedFeatures,
        })
        throw new Error(errorData.error || 'Failed to update organization')
      }

      toast.success(t.saved)
      onClose()
      if (onSaved) onSaved()
    } catch (error: any) {
      console.error('❌ EXCEPTION updating organization:', {
        message: error?.message,
        stack: error?.stack,
        orgId: organization?.id,
      })
      toast.error(`${t.error}: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {t.title}
          </h2>
        </div>

        <div className="space-y-4 mt-4">
          {/* Название организации */}
          <div>
            <Label htmlFor="display_name">{t.orgName}</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder={t.orgName}
              className="mt-1"
            />
          </div>

          {/* Владелец - поиск по клиентам */}
          <div>
            <Label htmlFor="owner_name">{t.owner}</Label>
            <ClientSearchInput
              value={formData.owner_name}
              onSelect={(name, phone) => {
                setFormData({
                  ...formData,
                  owner_name: name,
                  mobile: phone,
                })
              }}
              placeholder={t.owner}
              locale={language}
              orgId={organization?.id}
              className="mt-1"
            />
          </div>

          {/* Телефон - автозаполняется при выборе клиента */}
          <div>
            <Label htmlFor="mobile">{t.phone}</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder={t.phone}
              type="tel"
              className="mt-1"
            />
          </div>

          {/* Адрес */}
          <div>
            <Label htmlFor="address">{t.address}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t.address}
              className="mt-1"
            />
          </div>

          {/* Город */}
          <div>
            <Label htmlFor="city">{t.city}</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder={t.city}
              className="mt-1"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  )
}
