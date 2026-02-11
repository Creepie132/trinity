'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useTheme, CustomizationSettings } from '@/contexts/ThemeContext'
import { 
  ArrowRight, 
  LayoutDashboard, 
  Type, 
  Table2, 
  Zap,
  RotateCcw,
  Sidebar as SidebarIcon
} from 'lucide-react'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export default function CustomizePage() {
  const { customization, updateCustomization, resetCustomization } = useTheme()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-2">
            <ArrowRight className="w-4 h-4 rotate-180" />
            חזרה להגדרות
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">התאמה מתקדמת</h1>
          <p className="text-gray-600 mt-1">התאם כל פרט בממשק לפי העדפתך האישית</p>
        </div>
        <Button variant="outline" onClick={resetCustomization}>
          <RotateCcw className="w-4 h-4 ml-2" />
          איפוס להגדרות ברירת מחדל
        </Button>
      </div>

      {/* Sidebar Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SidebarIcon className="w-5 h-5" />
            תפריט צד (Sidebar)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Position */}
            <div className="space-y-2">
              <Label>מיקום תפריט</Label>
              <Select 
                value={customization.sidebarPosition} 
                onValueChange={(value: 'right' | 'left') => updateCustomization({ sidebarPosition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">ימין (RTL)</SelectItem>
                  <SelectItem value="left">שמאל (LTR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Width */}
            <div className="space-y-2">
              <Label>רוחב תפריט</Label>
              <Select 
                value={customization.sidebarWidth} 
                onValueChange={(value: 'narrow' | 'normal' | 'wide') => updateCustomization({ sidebarWidth: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">צר (240px)</SelectItem>
                  <SelectItem value="normal">רגיל (288px)</SelectItem>
                  <SelectItem value="wide">רחב (320px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible */}
          <div className="flex items-center justify-between">
            <div>
              <Label>תפריט מתקפל</Label>
              <p className="text-sm text-gray-500">אפשר כפתור כיווץ/הרחבה</p>
            </div>
            <Switch 
              checked={customization.sidebarCollapsible}
              onCheckedChange={(checked) => updateCustomization({ sidebarCollapsible: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            כרטיסים (Cards)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Style */}
            <div className="space-y-2">
              <Label>סגנון כרטיס</Label>
              <Select 
                value={customization.cardStyle} 
                onValueChange={(value: any) => updateCustomization({ cardStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">שטוח</SelectItem>
                  <SelectItem value="shadow">צל</SelectItem>
                  <SelectItem value="border">גבול</SelectItem>
                  <SelectItem value="glassmorphic">זכוכית</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Roundness */}
            <div className="space-y-2">
              <Label>עיגול פינות</Label>
              <Select 
                value={customization.cardRoundness} 
                onValueChange={(value: any) => updateCustomization({ cardRoundness: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא (0px)</SelectItem>
                  <SelectItem value="small">קטן (4px)</SelectItem>
                  <SelectItem value="medium">בינוני (8px)</SelectItem>
                  <SelectItem value="large">גדול (16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Spacing */}
            <div className="space-y-2">
              <Label>ריווח</Label>
              <Select 
                value={customization.cardSpacing} 
                onValueChange={(value: any) => updateCustomization({ cardSpacing: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tight">צפוף (0.5rem)</SelectItem>
                  <SelectItem value="normal">רגיל (1rem)</SelectItem>
                  <SelectItem value="spacious">מרווח (1.5rem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-3">תצוגה מקדימה:</p>
            <div className="custom-card p-4">
              <h3 className="font-semibold text-gray-900">כרטיס לדוגמה</h3>
              <p className="text-sm text-gray-600 mt-1">כך ייראו הכרטיסים עם ההגדרות שבחרת</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            טקסט (Typography)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Font Size */}
            <div className="space-y-2">
              <Label>גודל גופן</Label>
              <Select 
                value={customization.fontSize} 
                onValueChange={(value: any) => updateCustomization({ fontSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">קטן (14px בסיס)</SelectItem>
                  <SelectItem value="normal">רגיל (16px בסיס)</SelectItem>
                  <SelectItem value="large">גדול (18px בסיס)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
              <Label>משקל גופן</Label>
              <Select 
                value={customization.fontWeight} 
                onValueChange={(value: any) => updateCustomization({ fontWeight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">דק (300)</SelectItem>
                  <SelectItem value="normal">רגיל (400)</SelectItem>
                  <SelectItem value="bold">מודגש (600)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5" />
            טבלאות (Tables)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Style */}
            <div className="space-y-2">
              <Label>סגנון טבלה</Label>
              <Select 
                value={customization.tableStyle} 
                onValueChange={(value: any) => updateCustomization({ tableStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">מינימלי</SelectItem>
                  <SelectItem value="striped">פסים</SelectItem>
                  <SelectItem value="bordered">גבולות</SelectItem>
                  <SelectItem value="cards">כרטיסים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Density */}
            <div className="space-y-2">
              <Label>צפיפות שורות</Label>
              <Select 
                value={customization.tableDensity} 
                onValueChange={(value: any) => updateCustomization({ tableDensity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">צפוף (py-2)</SelectItem>
                  <SelectItem value="normal">רגיל (py-3)</SelectItem>
                  <SelectItem value="comfortable">נוח (py-4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            אנימציות (Animations)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>הפעל אנימציות</Label>
              <p className="text-sm text-gray-500">מעברים חלקים בין מצבים</p>
            </div>
            <Switch 
              checked={customization.animations}
              onCheckedChange={(checked) => updateCustomization({ animations: checked })}
            />
          </div>

          {customization.animations && (
            <div className="space-y-2">
              <Label>מהירות מעבר</Label>
              <Select 
                value={customization.transitionSpeed} 
                onValueChange={(value: any) => updateCustomization({ transitionSpeed: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">מהיר (150ms)</SelectItem>
                  <SelectItem value="normal">רגיל (300ms)</SelectItem>
                  <SelectItem value="slow">איטי (500ms)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>טיפ:</strong> כל ההגדרות נשמרות אוטומטית ויישמרו בין הפעלות. 
            תוכל תמיד לאפס להגדרות ברירת המחדל בלחיצה על כפתור "איפוס".
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
