'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">שגיאה</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            משהו השתבש. אנא נסה שוב או פנה לתמיכה.
          </p>
          
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="p-3 bg-gray-100 rounded-md">
              <p className="text-xs text-gray-600 font-mono">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              נסה שוב
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              חזור לדף הבית
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
