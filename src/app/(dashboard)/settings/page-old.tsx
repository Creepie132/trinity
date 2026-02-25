'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsOldPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>הגדרות ישנות</CardTitle>
          <CardDescription>דף זה הועבר</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            עבור אל <Link href="/settings" className="text-blue-600 hover:underline">/settings</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
