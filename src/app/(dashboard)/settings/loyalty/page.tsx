'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export default function LoyaltySettingsPage() {
  const router = useRouter()
  const { dir } = useLanguage()
  const { orgId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [pointsPerIls, setPointsPerIls] = useState('1')
  const [pointsPerVisit, setPointsPerVisit] = useState('10')
  const [redemptionRate, setRedemptionRate] = useState('0.1')

  useEffect(() => {
    const loadSettings = async () => {
      if (!orgId) return

      try {
        const response = await fetch(`/api/loyalty/settings?org_id=${orgId}`)
        if (!response.ok) throw new Error('Failed to load settings')

        const data = await response.json()
        setIsEnabled(data.is_enabled || false)
        setPointsPerIls(String(data.points_per_ils || 1))
        setPointsPerVisit(String(data.points_per_visit || 10))
        setRedemptionRate(String(data.redemption_rate || 0.1))
      } catch (error) {
        console.error('Failed to load settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [orgId])

  const handleSave = async () => {
    if (!orgId) return

    setSaving(true)
    try {
      const response = await fetch('/api/loyalty/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          is_enabled: isEnabled,
          points_per_ils: parseInt(pointsPerIls) || 1,
          points_per_visit: parseInt(pointsPerVisit) || 10,
          redemption_rate: parseFloat(redemptionRate) || 0.1,
        }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast.success('Настройки сохранены!')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Loyalty Program / תכנית נאמנות
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure points rewards and redemption
          </p>
        </div>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Настройки программы лояльности
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="loyalty-enabled" className="text-sm font-medium">
                Включить программу лояльности
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Клиенты будут накапливать баллы за визиты и платежи
              </p>
            </div>
            <Switch
              id="loyalty-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {isEnabled && (
            <>
              {/* Points per Visit */}
              <div className="space-y-2">
                <Label htmlFor="points-per-visit">Баллов за визит</Label>
                <Input
                  id="points-per-visit"
                  type="number"
                  value={pointsPerVisit}
                  onChange={(e) => setPointsPerVisit(e.target.value)}
                  min="0"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Сколько баллов получает клиент за каждый визит
                </p>
              </div>

              {/* Points per ILS */}
              <div className="space-y-2">
                <Label htmlFor="points-per-ils">Баллов за 1₪</Label>
                <Input
                  id="points-per-ils"
                  type="number"
                  value={pointsPerIls}
                  onChange={(e) => setPointsPerIls(e.target.value)}
                  min="0"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Сколько баллов получает клиент за каждый шекель оплаты
                </p>
              </div>

              {/* Redemption Rate */}
              <div className="space-y-2">
                <Label htmlFor="redemption-rate">Курс списания</Label>
                <Input
                  id="redemption-rate"
                  type="number"
                  step="0.01"
                  value={redemptionRate}
                  onChange={(e) => setRedemptionRate(e.target.value)}
                  min="0"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Сколько ₪ равен 1 балл (например: 0.1 = 10 баллов = 1₪)
                </p>
              </div>

              {/* Example */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Пример:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>
                    • Клиент пришел на визит → получит <strong>{pointsPerVisit}</strong> баллов
                  </li>
                  <li>
                    • Клиент заплатил 100₪ → получит <strong>{parseInt(pointsPerIls) * 100}</strong> баллов
                  </li>
                  <li>
                    • При списании 10 баллов → скидка <strong>{(10 * parseFloat(redemptionRate)).toFixed(2)}₪</strong>
                  </li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}
