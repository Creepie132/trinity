'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Settings, Presentation, ChevronLeft } from 'lucide-react'

const settingsSections = [
  {
    title: 'עיצוב דף הנחיתה',
    description: 'ניהול סגנון כפתור כניסה ועיצוב דף הנחיתה הציבורי',
    icon: Presentation,
    href: '/admin/settings/landing',
    color: 'text-purple-600 bg-purple-100'
  },
  // Add more sections here in the future
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">הגדרות מערכת</h1>
        <p className="text-gray-600 mt-1">תצורה כללית של המערכת</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            הגדרות נוספות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            הגדרות נוספות יתווספו בעתיד
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
