'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Modal from '@/components/ui/Modal'
const KiraOrb = dynamic(() => import('@/components/kira/KiraOrb'), { ssr: false })
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Plus, Trash2, Users, Calendar, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Service {
  name: string
  price: number
  duration: number
}

interface WorkingHours {
  [key: string]: {
    enabled: boolean
    start: string
    end: string
  }
}

const SERVICE_TEMPLATES: Record<string, Service[]> = {
  'салон красоты': [
    { name: 'Стрижка женская', price: 150, duration: 60 },
    { name: 'Укладка', price: 100, duration: 45 },
    { name: 'Окрашивание', price: 300, duration: 120 },
  ],
  'барбершоп': [
    { name: 'Стрижка мужская', price: 80, duration: 30 },
    { name: 'Борода', price: 50, duration: 20 },
    { name: 'Стрижка + борода', price: 120, duration: 45 },
  ],
  'клиника': [
    { name: 'Консультация', price: 200, duration: 30 },
    { name: 'Процедура', price: 500, duration: 60 },
    { name: 'Диагностика', price: 300, duration: 45 },
  ],
  'автомойка': [
    { name: 'Мойка легковая', price: 80, duration: 30 },
    { name: 'Мойка внедорожник', price: 120, duration: 45 },
    { name: 'Детейлинг', price: 500, duration: 180 },
  ],
  'ресторан': [
    { name: 'Столик на 2 персоны', price: 0, duration: 120 },
    { name: 'Столик на 4 персоны', price: 0, duration: 120 },
    { name: 'Банкетный зал', price: 0, duration: 240 },
  ],
  'спортзал': [
    { name: 'Разовое посещение', price: 50, duration: 90 },
    { name: 'Персональная тренировка', price: 150, duration: 60 },
    { name: 'Групповое занятие', price: 80, duration: 60 },
  ],
  'другое': [
    { name: 'Услуга 1', price: 100, duration: 60 },
    { name: 'Услуга 2', price: 150, duration: 90 },
  ],
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  sunday: { enabled: true, start: '09:00', end: '19:00' },
  monday: { enabled: true, start: '09:00', end: '19:00' },
  tuesday: { enabled: true, start: '09:00', end: '19:00' },
  wednesday: { enabled: true, start: '09:00', end: '19:00' },
  thursday: { enabled: true, start: '09:00', end: '19:00' },
  friday: { enabled: true, start: '09:00', end: '14:00' },
  saturday: { enabled: false, start: '09:00', end: '19:00' },
}

const DAY_NAMES: Record<string, string> = {
  sunday: 'Воскресенье',
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
}

interface OnboardingWizardProps {
  open: boolean
  organizationName: string
}

export function OnboardingWizard({ open, organizationName }: OnboardingWizardProps) {
  const router = useRouter()
  const { orgId } = useAuth()
  const { data: organization } = useOrganization()
  const supabase = createSupabaseBrowserClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  // Guard: double-check flag on mount before showing wizard
  const [verified, setVerified] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!open || !orgId) return
    supabase
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        const completed = data?.features?.onboarding_completed === true
        setShouldShow(!completed)
        setVerified(true)
      })
  }, [open, orgId])

  // Locale state - 'ru' by default, detect Hebrew after mount (avoids hydration mismatch)
  const [locale, setLocale] = useState<'he' | 'ru'>('ru')
  
  useEffect(() => {
    if (window.navigator.language.includes('he')) {
      setLocale('he')
    }
  }, [])

  // Step 1 data
  const [businessName, setBusinessName] = useState(organizationName)
  const [companyNumber, setCompanyNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')

  // Prefill from business_info (from registration)
  useEffect(() => {
    const businessInfo = (organization?.features as any)?.business_info
    if (businessInfo) {
      if (businessInfo.display_name) setBusinessName(businessInfo.display_name)
      if (businessInfo.company_number) setCompanyNumber(businessInfo.company_number)
      if (businessInfo.owner_name) setOwnerName(businessInfo.owner_name)
      if (businessInfo.mobile) setPhone(businessInfo.mobile)
      if (businessInfo.email) setEmail(businessInfo.email)
      if (businessInfo.address) setAddress(businessInfo.address)
      if (businessInfo.city) setCity(businessInfo.city)
    }

    // Get user email from auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization])

  // Step 2 data
  const [services, setServices] = useState<Service[]>([])

  // Step 3 data
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS)

  const progress = (step / 4) * 100

  // Load templates when category changes
  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    if (services.length === 0 && SERVICE_TEMPLATES[newCategory]) {
      setServices([...SERVICE_TEMPLATES[newCategory]])
    }
  }

  const addService = () => {
    setServices([...services, { name: '', price: 0, duration: 60 }])
  }

  const updateService = (index: number, field: keyof Service, value: string | number) => {
    const updated = [...services]
    updated[index] = { ...updated[index], [field]: value }
    setServices(updated)
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const toggleDay = (day: string) => {
    setWorkingHours({
      ...workingHours,
      [day]: { ...workingHours[day], enabled: !workingHours[day].enabled },
    })
  }

  const updateWorkingHours = (day: string, field: 'start' | 'end', value: string) => {
    setWorkingHours({
      ...workingHours,
      [day]: { ...workingHours[day], [field]: value },
    })
  }

  const handleNext = () => {
    if (step === 1) {
      if (!businessName || !category || !phone) {
        toast.error('Заполните все поля')
        return
      }
      // Validate phone number (only digits, +, -, spaces, parentheses, 7-20 chars)
      const phoneRegex = /^[0-9+\-() ]{7,20}$/
      if (!phoneRegex.test(phone)) {
        toast.error('Телефон должен содержать только цифры, +, -, (), пробелы (7-20 символов)')
        return
      }
    }
    if (step === 2) {
      if (services.length === 0) {
        toast.error('Добавьте хотя бы одну услугу')
        return
      }
      const invalid = services.some((s) => !s.name || s.price < 0 || s.duration <= 0)
      if (invalid) {
        toast.error('Проверьте данные услуг')
        return
      }
    }
    setStep(step + 1)
  }

  const handleComplete = async () => {
    if (!orgId) {
      toast.error('Organization ID not found')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('[Onboarding] Starting completion flow...')

      // Check if onboarding is already completed
      const { data: org } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', orgId)
        .single()

      const isAlreadyCompleted = org?.features?.onboarding_completed === true

      if (isAlreadyCompleted) {
        console.log('[Onboarding] Already completed, redirecting to dashboard...')
        toast.success('Настройки уже сохранены. Переход на главную...')
        
        // Use window.location.href for full page reload
        window.location.href = '/dashboard'
        return
      }

      // 1. Check existing services and delete if any (for existing users)
      console.log('[Onboarding] Checking existing services...')
      const { data: existingServices } = await supabase
        .from('services')
        .select('id')
        .eq('org_id', orgId)

      if (existingServices && existingServices.length > 0) {
        console.log('[Onboarding] Deleting existing services:', existingServices.length)
        // Delete old services before inserting new
        const { error: deleteError } = await supabase
          .from('services')
          .delete()
          .eq('org_id', orgId)

        if (deleteError) {
          console.error('[Onboarding] Error deleting old services:', deleteError)
        }
      }

      // 2. Save new services
      const serviceRecords = services.map((s) => ({
        org_id: orgId,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration,
        is_active: true,
      }))

      console.log('[Onboarding] Inserting services:', serviceRecords.length)
      const { error: servicesError } = await supabase.from('services').insert(serviceRecords)

      if (servicesError) {
        console.error('[Onboarding] Services error:', servicesError)
        throw servicesError
      }

      // 3. Save working hours (UPSERT for existing users)
      console.log('[Onboarding] Saving working hours...')
      const { error: workingHoursError } = await supabase
        .from('booking_settings')
        .upsert({
          org_id: orgId,
          working_hours: workingHours,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'org_id'
        })

      if (workingHoursError) {
        console.error('[Onboarding] Working hours error:', workingHoursError)
        throw workingHoursError
      }

      // 4. Update organization features and business info
      console.log('[Onboarding] Updating organization features and business info...')
      const updatedFeatures = {
        ...(org?.features || {}),
        business_info: {
          ...(org?.features?.business_info || {}),
          display_name: businessName,
          company_number: companyNumber,
          owner_name: ownerName,
          mobile: phone,
          email: email,
          address: address,
          city: city,
        },
        onboarding_completed: true,
      }

      const { error: orgError } = await supabase
        .from('organizations')
        .update({ 
          name: businessName,  // Update org name with display_name
          features: updatedFeatures 
        })
        .eq('id', orgId)

      if (orgError) {
        console.error('[Onboarding] Org update error:', orgError)
        throw orgError
      }

      // 5. Create default message templates (check if exist first)
      console.log('[Onboarding] Creating message templates...')
      const { data: existingTemplates } = await supabase
        .from('message_templates')
        .select('id')
        .eq('org_id', orgId)
        .limit(1)

      if (!existingTemplates || existingTemplates.length === 0) {
        const defaultTemplates = [
          {
            org_id: orgId,
            name: 'תזכורת תור',
            content: 'שלום {first_name}! תזכורת: יש לך תור מחר ב-{time}. {org_name}',
            category: 'reminder',
            variables: ['{first_name}', '{time}', '{org_name}'],
            is_active: true,
          },
          {
            org_id: orgId,
            name: 'יום הולדת',
            content: '🎂 יום הולדת שמח, {first_name}! {org_name} מאחלת לך הכל טוב!',
            category: 'birthday',
            variables: ['{first_name}', '{org_name}'],
            is_active: true,
          },
          {
            org_id: orgId,
            name: 'חזרת לקוח',
            content: 'שלום {first_name}, עברו {days} ימים מהביקור האחרון שלך ב-{org_name}. נשמח לראותך!',
            category: 'followup',
            variables: ['{first_name}', '{days}', '{org_name}'],
            is_active: true,
          },
          {
            org_id: orgId,
            name: 'מבצע',
            content: '🔥 מבצע ב-{org_name}! {message}',
            category: 'promotion',
            variables: ['{org_name}', '{message}'],
            is_active: true,
          },
        ]

        const { error: templatesError } = await supabase
          .from('message_templates')
          .insert(defaultTemplates)

        if (templatesError) {
          console.warn('[Onboarding] Failed to create templates:', templatesError)
          // Don't fail onboarding if templates fail
        }
      } else {
        console.log('[Onboarding] Templates already exist, skipping')
      }

      console.log('[Onboarding] Completed successfully!')
      toast.success('Настройка завершена! 🎉')

      // Use window.location.href for full page reload
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch (error: any) {
      console.error('[Onboarding] Error:', error)
      
      const msg = error?.message || ''
      
      // Simplified error handling - if onboarding data already exists, just redirect
      if (msg.includes('violates') || msg.includes('duplicate') || msg.includes('unique')) {
        console.log('[Onboarding] Data already exists, marking as complete and redirecting...')
        
        // Try to mark as completed even if data exists
        try {
          const { data: org } = await supabase
            .from('organizations')
            .select('features')
            .eq('id', orgId)
            .single()

          const updatedFeatures = {
            ...(org?.features || {}),
            onboarding_completed: true,
          }

          await supabase
            .from('organizations')
            .update({ features: updatedFeatures })
            .eq('id', orgId)
        } catch (updateError) {
          console.error('[Onboarding] Failed to mark as completed:', updateError)
        }

        toast.success('Переход на главную...')
        
        // Use window.location.href for guaranteed redirect
        window.location.href = '/dashboard'
        return
      }
      
      if (msg.includes('permission') || msg.includes('denied')) {
        const errorMsg = locale === 'he'
          ? 'אין הרשאות לשמירה. פנה למנהל.'
          : 'Нет прав для сохранения. Обратитесь к администратору.'
        
        setError(errorMsg)
        toast.error(errorMsg)
      } else {
        const errorMsg = locale === 'he' 
          ? 'שגיאה בשמירה. נסו שוב.' 
          : 'Ошибка сохранения. Попробуйте снова.'
        
        setError(errorMsg)
        toast.error(msg || errorMsg)
      }
      
      setLoading(false)
    }
  }

  // Don't render until DB check is done, and only if flag is not set
  if (!verified || !shouldShow) return null

  return (
    <Modal
      open={open}
      onClose={() => {}}
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      width="900px"
      className="bg-gray-900 text-gray-100 border-gray-800"
    >
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Шаг {step} из 4</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-gray-800" />
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <div className="shrink-0">
                <KiraOrb size={72} isThinking={false} />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Привет! Я Кира 👋</h2>
                <p className="text-sm text-gray-400">Помогу настроить систему под ваш бизнес. Это займёт пару минут.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label htmlFor="business-name">Название бизнеса</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                  placeholder="Моя компания"
                />
              </div>

              <div>
                <Label htmlFor="company-number">
                  {locale === 'he' ? 'ח.פ / ע.מ' : 'Номер компании (ח.פ)'}
                </Label>
                <Input
                  id="company-number"
                  value={companyNumber}
                  onChange={(e) => setCompanyNumber(e.target.value)}
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                  placeholder={locale === 'he' ? 'מספר חברה או עוסק' : 'Номер регистрации'}
                />
              </div>

              <div>
                <Label htmlFor="owner-name">
                  {locale === 'he' ? 'שם בעל העסק' : 'Имя владельца'}
                </Label>
                <Input
                  id="owner-name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                  placeholder={locale === 'he' ? 'שם מלא' : 'Полное имя'}
                />
              </div>

              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  pattern="[0-9+\-() ]*"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-1234567"
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="email">
                  {locale === 'he' ? 'דוא"ל' : 'Электронная почта'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="mt-2 bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed opacity-70"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">
                    {locale === 'he' ? 'כתובת' : 'Адрес'}
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-700 text-white"
                    placeholder={locale === 'he' ? 'רחוב ומספר' : 'Улица и номер'}
                  />
                </div>

                <div>
                  <Label htmlFor="city">
                    {locale === 'he' ? 'עיר' : 'Город'}
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-700 text-white"
                    placeholder={locale === 'he' ? 'עיר' : 'Город'}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Категория</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="mt-1 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="салон красоты">Салон красоты</SelectItem>
                    <SelectItem value="барбершоп">Барбершоп</SelectItem>
                    <SelectItem value="клиника">Клиника</SelectItem>
                    <SelectItem value="автомойка">Автомойка</SelectItem>
                    <SelectItem value="ресторан">Ресторан</SelectItem>
                    <SelectItem value="спортзал">Спортзал</SelectItem>
                    <SelectItem value="другое">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Далее →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Добавьте ваши услуги</h2>
              <p className="text-gray-400">
                Мы подготовили шаблоны для "{category}". Вы можете их отредактировать или добавить
                свои.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {services.map((service, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      placeholder="Название услуги"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={service.price}
                        onChange={(e) => updateService(index, 'price', Number(e.target.value))}
                        placeholder="Цена ₪"
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                      <Input
                        type="number"
                        value={service.duration}
                        onChange={(e) => updateService(index, 'duration', Number(e.target.value))}
                        placeholder="Длительность (мин)"
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(index)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={addService}
              className="w-full border-gray-700 text-purple-400 hover:bg-purple-900/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить услугу
            </Button>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-gray-700 text-gray-300"
              >
                ← Назад
              </Button>
              <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Далее →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Working Hours */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Рабочие часы</h2>
              <p className="text-gray-400">Укажите время работы вашего бизнеса</p>
            </div>

            <div className="space-y-3">
              {Object.keys(workingHours).map((day) => (
                <div key={day} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={workingHours[day].enabled}
                    onChange={() => toggleDay(day)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="w-32 text-sm font-medium">{DAY_NAMES[day]}</div>
                  {workingHours[day].enabled && (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="time"
                        value={workingHours[day].start}
                        onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                        className="w-28 bg-gray-900 border-gray-700 text-white text-sm"
                      />
                      <span className="text-gray-500">—</span>
                      <Input
                        type="time"
                        value={workingHours[day].end}
                        onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                        className="w-28 bg-gray-900 border-gray-700 text-white text-sm"
                      />
                    </div>
                  )}
                  {!workingHours[day].enabled && (
                    <span className="text-gray-500 text-sm">Выходной</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-gray-700 text-gray-300"
              >
                ← Назад
              </Button>
              <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Далее →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <KiraOrb size={120} isThinking={loading} />
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">
                {loading ? 'Сохраняю настройки...' : 'Готово! 🎉'}
              </h2>
              <p className="text-gray-400">
                {loading ? 'Подождите немного...' : 'Ваша система настроена. Вот что можно сделать:'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 my-8">
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold">Добавить клиента</div>
                <div className="text-sm text-gray-400 mt-1">Начните с первого клиента</div>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
                <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold">Создать визит</div>
                <div className="text-sm text-gray-400 mt-1">Запланируйте первый визит</div>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
                <ExternalLink className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold">Онлайн-запись</div>
                <div className="text-sm text-gray-400 mt-1">Поделитесь ссылкой на запись</div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium">
                {error}
              </div>
            )}

            <Button
              onClick={handleComplete}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-lg py-6 px-8"
            >
              {loading ? 'Сохранение...' : 'Перейти к работе'}
            </Button>
          </div>
        )}
    </Modal>
  )
}
