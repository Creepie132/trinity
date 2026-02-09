'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">הגדרות מערכת</h1>
        <p className="text-gray-600 mt-1">תצורה כללית של המערכת</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            הגדרות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            דף זה בפיתוח
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
