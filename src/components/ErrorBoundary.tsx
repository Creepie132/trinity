'use client'

import { Component, ReactNode } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || 'Unknown error'
      const isTableMissing = errorMessage.includes('relation') || 
                             errorMessage.includes('does not exist') ||
                             errorMessage.includes('PGRST204')

      return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-6 h-6" />
                שגיאה באפליקציה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-900 font-mono text-sm">{errorMessage}</p>
              </div>

              {isTableMissing && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-semibold text-yellow-900 mb-2">🔧 פתרון:</p>
                  <p className="text-sm text-yellow-800">
                    נראה שחסרות טבלאות במסד הנתונים. אנא הרץ את הקובץ:
                  </p>
                  <code className="block mt-2 p-2 bg-white rounded text-xs">
                    supabase/schema-v2.sql
                  </code>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()}>
                  טען מחדש
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  חזור
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
