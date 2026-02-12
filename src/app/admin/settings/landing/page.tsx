'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

type LoginButtonStyle = 'orbit' | 'pulse'

export default function LandingSettingsPage() {
  const [selectedStyle, setSelectedStyle] = useState<LoginButtonStyle>('orbit')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/landing/settings')
        if (response.ok) {
          const data = await response.json()
          setSelectedStyle(data.login_button_style || 'orbit')
        }
      } catch (error) {
        console.error('Error loading landing settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings
  const handleSave = async (style: LoginButtonStyle) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/landing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_button_style: style })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSelectedStyle(style)
      toast({
        title: 'הגדרות נשמרו',
        description: 'סגנון כפתור הכניסה עודכן בהצלחה'
      })
    } catch (error) {
      console.error('Error saving landing settings:', error)
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את ההגדרות',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">עיצוב דף הנחיתה</h1>
        <p className="text-gray-600 mt-1">בחר סגנון כפתור כניסה למערכת בדף הנחיתה</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סגנון כפתור כניסה</CardTitle>
          <CardDescription>
            בחר אחד משני הסגנונות. השינוי יופיע מיד בדף הנחיתה הציבורי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Orbit Style Preview */}
          <div 
            className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
              selectedStyle === 'orbit' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !isSaving && handleSave('orbit')}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Orbit
                  {selectedStyle === 'orbit' && <Check className="w-5 h-5 text-blue-500" />}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  מסגרת גרדיאנט מסתובבת עם זוהר פועם
                </p>
              </div>
            </div>
            
            {/* Preview Button */}
            <div className="flex justify-center">
              <div className="relative group">
                <div 
                  className="absolute inset-0 rounded-xl p-[2px]"
                  style={{
                    background: 'conic-gradient(from 0deg, #fbbf24, #3b82f6, #a855f7, #fbbf24)',
                  }}
                >
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-900 to-gray-800" />
                </div>
                <div className="relative px-8 py-4 flex items-center gap-2 text-white font-medium">
                  כניסה למערכת ✨
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Pulse Style Preview */}
          <div 
            className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
              selectedStyle === 'pulse' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !isSaving && handleSave('pulse')}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Pulse
                  {selectedStyle === 'pulse' && <Check className="w-5 h-5 text-purple-500" />}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  אפקט שיממר עם זוהר פועם
                </p>
              </div>
            </div>
            
            {/* Preview Button */}
            <div className="flex justify-center">
              <div 
                className="relative px-8 py-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white font-medium flex items-center gap-2"
                style={{
                  boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)'
                }}
              >
                כניסה למערכת ✨
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              💡 <strong>טיפ:</strong> לחץ על הכרטיסייה כדי לבחור ולשמור את הסגנון. השינוי יתבצע מיידית.
            </p>
          </div>

          {/* Loading State */}
          {isSaving && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">שומר...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
