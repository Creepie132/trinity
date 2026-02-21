'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { Plus, Trash2, Check, Users, Calendar, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
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
  const supabase = createSupabaseBrowserClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 data
  const [businessName, setBusinessName] = useState(organizationName)
  const [category, setCategory] = useState<string>('')
  const [phone, setPhone] = useState('')

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
      if (!businessName || !category) {
        toast.error('Заполните все поля')
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
    try {
      // 1. Save services
      const serviceRecords = services.map((s) => ({
        org_id: orgId,
        name: s.name,
        price: s.price,
        duration: s.duration,
        is_active: true,
      }))

      const { error: servicesError } = await supabase.from('services').insert(serviceRecords)

      if (servicesError) throw servicesError

      // 2. Save working hours
      const { error: workingHoursError } = await supabase
        .from('booking_settings')
        .upsert({
          org_id: orgId,
          working_hours: workingHours,
          updated_at: new Date().toISOString(),
        })

      if (workingHoursError) throw workingHoursError

      // 3. Update organization features
      const { data: org } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', orgId)
        .single()

      const updatedFeatures = {
        ...(org?.features || {}),
        onboarding_completed: true,
      }

      const { error: orgError } = await supabase
        .from('organizations')
        .update({ features: updatedFeatures })
        .eq('id', orgId)

      if (orgError) throw orgError

      toast.success('Настройка завершена! 🎉')
      router.refresh()
    } catch (error: any) {
      console.error('Onboarding error:', error)
      toast.error('Ошибка сохранения: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 text-gray-100 border-gray-800">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Шаг {step} из 4</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-gray-800" />
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Расскажите о вашем бизнесе</h2>
              <p className="text-gray-400">Это поможет настроить систему под ваши нужды</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="business-name">Название бизнеса</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                  placeholder="Моя компания"
                />
              </div>

              <div>
                <Label htmlFor="category">Категория</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="mt-2 bg-gray-800 border-gray-700 text-white">
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

              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                  placeholder="+972 50 123 4567"
                />
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
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">Готово! 🎉</h2>
              <p className="text-gray-400">Ваша система настроена. Вот что можно сделать:</p>
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
                <div className="text-sm text-gray-400 mt-1">Запланируйте первую встречу</div>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
                <ExternalLink className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-semibold">Онлайн-запись</div>
                <div className="text-sm text-gray-400 mt-1">Поделитесь ссылкой на запись</div>
              </div>
            </div>

            <Button
              onClick={handleComplete}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-lg py-6 px-8"
            >
              {loading ? 'Сохранение...' : 'Перейти к работе'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
