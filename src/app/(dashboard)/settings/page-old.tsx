'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useTheme, themes, Theme, Layout } from '@/contexts/ThemeContext'
import { Check, LayoutGrid, Layers, AlignJustify, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { theme, setTheme, layout, setLayout } = useTheme()

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

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📐 סגנון תצוגה (Layout)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">בחר את סגנון הממשק</Label>
            <p className="text-sm text-gray-500 mt-1">
              שנה את אופן התצוגה של הנתונים והכרטיסים במערכת
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Classic Layout */}
            <button
              onClick={() => setLayout('classic')}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-right
                ${layout === 'classic' 
                  ? 'border-gray-900 shadow-lg bg-gray-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <AlignJustify className="w-8 h-8 text-gray-700" />
                <div>
                  <div className="font-semibold text-gray-900">קלאסי</div>
                  <div className="text-xs text-gray-500">טבלאות ומינימליזם</div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="space-y-2 bg-white p-2 rounded border border-gray-200">
                <div className="h-2 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-5/6" />
              </div>

              {layout === 'classic' && (
                <div className="absolute top-2 left-2 bg-gray-900 text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Modern Layout */}
            <button
              onClick={() => setLayout('modern')}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-right
                ${layout === 'modern' 
                  ? 'border-gray-900 shadow-lg bg-gray-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <LayoutGrid className="w-8 h-8 text-gray-700" />
                <div>
                  <div className="font-semibold text-gray-900">מודרני</div>
                  <div className="text-xs text-gray-500">כרטיסים גדולים וצללים</div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg shadow-md" />
                <div className="h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg shadow-md" />
                <div className="col-span-2 h-8 bg-gradient-to-br from-green-100 to-green-50 rounded-lg shadow-md" />
              </div>

              {layout === 'modern' && (
                <div className="absolute top-2 left-2 bg-gray-900 text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Compact Layout */}
            <button
              onClick={() => setLayout('compact')}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-right
                ${layout === 'compact' 
                  ? 'border-gray-900 shadow-lg bg-gray-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <Layers className="w-8 h-8 text-gray-700" />
                <div>
                  <div className="font-semibold text-gray-900">צפוף</div>
                  <div className="text-xs text-gray-500">יותר מידע במסך</div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="space-y-1 bg-white p-2 rounded border border-gray-200">
                <div className="h-1.5 bg-gray-300 rounded w-full" />
                <div className="h-1.5 bg-gray-300 rounded w-4/5" />
                <div className="h-1.5 bg-gray-300 rounded w-full" />
                <div className="h-1.5 bg-gray-300 rounded w-3/4" />
                <div className="h-1.5 bg-gray-300 rounded w-full" />
              </div>

              {layout === 'compact' && (
                <div className="absolute top-2 left-2 bg-gray-900 text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
            💡 <strong>טיפ:</strong> סגנון התצוגה ישפיע על דשבורד, רשימת לקוחות, וכל העמודים במערכת
          </div>
        </CardContent>
      </Card>

      {/* Advanced Customization */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 התאמה מתקדמת</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm">
            רוצה שליטה מלאה על כל פרט בממשק? השתמש בהתאמה המתקדמת לשנות:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mr-4">
            <li>• מיקום ורוחב תפריט הצד</li>
            <li>• סגנון וצורת כרטיסים</li>
            <li>• גודל ומשקל טקסט</li>
            <li>• מראה וצפיפות טבלאות</li>
            <li>• אנימציות ומעברים</li>
          </ul>
          <Link href="/settings/customize">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              פתח התאמה מתקדמת
            </Button>
          </Link>
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
