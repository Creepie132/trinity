'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html dir="rtl" lang="he">
      <body>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ 
            maxWidth: '500px', 
            padding: '2rem', 
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              שגיאה קריטית
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              אירעה שגיאה במערכת. אנא רענן את הדף או פנה לתמיכה.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              נסה שוב
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
