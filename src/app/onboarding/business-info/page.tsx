'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
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
import { toast } from 'sonner'

const translations = {
  he: {
    title: 'ספר לנו על העסק שלך',
    subtitle: 'מלא את הפרטים כדי להתחיל',
    businessName: 'שם העסק',
    businessNamePlaceholder: 'לדוגמה: מספרת שרה',
    ownerName: 'שם בעל העסק',
    mobile: 'טלפון נייד',
    mobilePlaceholder: '+972-5X-XXX-XXXX',
    landline: 'טלפון קווי (אם יש)',
    email: 'דוא"ל',
    address: 'כתובת',
    addressPlaceholder: 'רחוב ומספר',
    city: 'עיר',
    website: 'אתר אינטרנט (אם יש)',
    websitePlaceholder: 'https://',
    businessType: 'סוג העסק',
    businessTypePatur: 'עוסק פטור',
    businessTypeMurshe: 'עוסק מורשה',
    businessTypeBaam: 'חברה בע"מ',
    description: 'ספר בקצרה על העסק שלך',
    descriptionPlaceholder: 'מה העסק שלך עושה? מי הלקוחות שלך?',
    submit: 'שלח בקשה',
    submitting: 'שולח...',
    success: 'הבקשה נשלחה בהצלחה!',
    error: 'שגיאה בשליחה',
  },
  ru: {
    title: 'Расскажите о вашем бизнесе',
    subtitle: 'Заполните данные чтобы начать',
    businessName: 'Название бизнеса',
    businessNamePlaceholder: 'Например: Салон красоты Сара',
    ownerName: 'Имя владельца',
    mobile: 'Мобильный телефон',
    mobilePlaceholder: '+972-5X-XXX-XXXX',
    landline: 'Стационарный телефон (если есть)',
    email: 'Электронная почта',
    address: 'Адрес',
    addressPlaceholder: 'Улица и номер дома',
    city: 'Город',
    website: 'Веб-сайт (если есть)',
    websitePlaceholder: 'https://',
    businessType: 'Тип бизнеса',
    businessTypePatur: 'Осек Патур (освобождённый)',
    businessTypeMurshe: 'Осек Мурше (лицензированный)',
    businessTypeBaam: 'Компания (בע"מ)',
    description: 'Расскажите в двух словах о вашем бизнесе',
    descriptionPlaceholder: 'Чем занимается ваш бизнес? Кто ваши клиенты?',
    submit: 'Отправить заявку',
    submitting: 'Отправка...',
    success: 'Заявка успешно отправлена!',
    error: 'Ошибка отправки',
  },
}

export default function BusinessInfoPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<'he' | 'ru'>('he')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    mobile: '',
    landline: '',
    address: '',
    city: '',
    website: '',
    businessType: '',
    description: '',
  })

  useEffect(() => {
    // Detect locale from localStorage or browser
    const savedLang = localStorage.getItem('language')
    if (savedLang === 'ru' || savedLang === 'he') {
      setLocale(savedLang)
    } else if (navigator.language.startsWith('ru')) {
      setLocale('ru')
    }

    // Get user email
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '')
      } else {
        router.push('/login')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const t = translations[locale]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/onboarding/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: userEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t.error)
      }

      toast.success(t.success)
      router.push('/access-pending')
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="w-full max-w-2xl">
        {/* DEMO Badge */}
        <div className="text-center mb-6">
          <span className="inline-block bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
            DEMO
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name + Owner Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessName" className="text-start block mb-2">
                  {t.businessName} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  required
                  placeholder={t.businessNamePlaceholder}
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  className="text-start"
                />
              </div>

              <div>
                <Label htmlFor="ownerName" className="text-start block mb-2">
                  {t.ownerName} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ownerName"
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerName: e.target.value })
                  }
                  className="text-start"
                />
              </div>
            </div>

            {/* Mobile + Landline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mobile" className="text-start block mb-2">
                  {t.mobile} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  required
                  placeholder={t.mobilePlaceholder}
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  className="text-start"
                />
              </div>

              <div>
                <Label htmlFor="landline" className="text-start block mb-2">
                  {t.landline}
                </Label>
                <Input
                  id="landline"
                  type="tel"
                  placeholder={t.mobilePlaceholder}
                  value={formData.landline}
                  onChange={(e) =>
                    setFormData({ ...formData, landline: e.target.value })
                  }
                  className="text-start"
                />
              </div>
            </div>

            {/* Email + Website */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-start block mb-2">
                  {t.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-muted cursor-not-allowed text-start"
                />
              </div>

              <div>
                <Label htmlFor="website" className="text-start block mb-2">
                  {t.website}
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder={t.websitePlaceholder}
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="text-start"
                />
              </div>
            </div>

            {/* Address + City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address" className="text-start block mb-2">
                  {t.address} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  type="text"
                  required
                  placeholder={t.addressPlaceholder}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="text-start"
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-start block mb-2">
                  {t.city} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="text-start"
                />
              </div>
            </div>

            {/* Business Type */}
            <div>
              <Label htmlFor="businessType" className="text-start block mb-2">
                {t.businessType} <span className="text-red-500">*</span>
              </Label>
              <Select
                required
                value={formData.businessType}
                onValueChange={(value) =>
                  setFormData({ ...formData, businessType: value })
                }
              >
                <SelectTrigger className="text-start">
                  <SelectValue placeholder={t.businessType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patur">{t.businessTypePatur}</SelectItem>
                  <SelectItem value="murshe">{t.businessTypeMurshe}</SelectItem>
                  <SelectItem value="baam">{t.businessTypeBaam}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-start block mb-2">
                {t.description} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                required
                rows={4}
                placeholder={t.descriptionPlaceholder}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="text-start resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? t.submitting : t.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
