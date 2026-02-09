import { XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BlockedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 p-4 rounded-full">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            הגישה שלך הושעתה
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            חשבון הארגון שלך הושעה על ידי המנהל.
          </p>
          <p className="text-gray-600">
            לקבלת פרטים נוספים, אנא פנה למנהל המערכת.
          </p>
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">
              Trinity CRM System
            </p>
            <p className="text-sm text-gray-500">
              Amber Solutions Systems © 2026
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
