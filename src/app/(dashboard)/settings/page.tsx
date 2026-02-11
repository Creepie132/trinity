'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useTheme, themes, Theme } from '@/contexts/ThemeContext'
import { Check } from 'lucide-react'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  const themeOptions: { id: Theme; name: string; colors: string }[] = [
    { id: 'default', name: 'כחול (ברירת מחדל)', colors: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { id: 'purple', name: 'סגול', colors: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { id: 'green', name: 'ירוק', colors: 'bg-gradient-to-r from-green-500 to-green-600' },
    { id: 'orange', name: 'כתום', colors: 'bg-gradient-to-r from-orange-500 to-orange-600' },
    { id: 'pink', name: 'ורוד', colors: 'bg-gradient-to-r from-pink-500 to-pink-600' },
    { id: 'dark', name: 'כהה (אינדיגו)', colors: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
        <p className="text-gray-600 mt-1">נהל את העדפות המערכת שלך</p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎨 ערכת נושא חזותית
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">בחר את צבע הממשק המועדף עליך</Label>
            <p className="text-sm text-gray-500 mt-1">
              צבע הנושא ישפיע על כפתורים, תפריטים וכרטיסים במערכת
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${theme === option.id 
                    ? 'border-gray-900 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                {/* Color Preview */}
                <div className={`h-24 rounded-md mb-3 ${option.colors}`} />
                
                {/* Theme Name */}
                <div className="text-center font-semibold text-gray-900">
                  {option.name}
                </div>

                {/* Selected Check */}
                {theme === option.id && (
                  <div className="absolute top-2 right-2 bg-gray-900 text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Preview Card */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">תצוגה מקדימה:</p>
            <div className="space-y-3">
              {/* Primary Button Preview */}
              <button 
                className="w-full py-2 px-4 rounded-md text-white font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                כפתור ראשי
              </button>

              {/* Card Preview */}
              <div 
                className="p-3 rounded-md text-white"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                <p className="font-medium">כרטיס מידע</p>
                <p className="text-sm opacity-90">זוהי תצוגה מקדימה של הנושא הנבחר</p>
              </div>

              {/* Accent Badge Preview */}
              <div className="flex gap-2">
                <span 
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  תגית דגש
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-white text-sm"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  תגית רגילה
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Settings Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ הגדרות נוספות</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            הגדרות נוספות יתווספו בעתיד (שפה, התראות, וכו')
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
