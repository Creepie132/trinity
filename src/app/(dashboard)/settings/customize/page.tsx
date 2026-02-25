'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CustomizePage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Link href="/settings" className="hover:text-gray-900">
              הגדרות
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span>התאמה מתקדמת</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">התאמה מתקדמת</h1>
          <p className="text-gray-600 mt-1">בקרוב...</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>התאמה אישית</CardTitle>
          <CardDescription>פונקציונליות זו בפיתוח</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            דף ההתאמה האישית יהיה זמין בגרסה הבאה
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
