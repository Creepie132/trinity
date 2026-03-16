'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function CallbackContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)

  const regId = params.get('reg')
  const status = params.get('status')
  const token  = params.get('TranzilaTK') || params.get('token') || ''
  const txId   = params.get('index') || params.get('transaction_id') || ''

  useEffect(() => {
    if (status === 'fail') {
      setState('error')
      setMessage('התשלום נכשל. אנא נסו שוב.')
      return
    }
    if (!regId) {
      setState('error')
      setMessage('קישור לא תקין.')
      return
    }
    activate()
  }, [])

  const activate = async () => {
    try {
      const res = await fetch('/api/demo/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: regId,
          tranzila_token: token,
          transaction_id: txId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Activation failed')

      setState('success')
      // If we got magic link — redirect to it
      if (data.magic_link) {
        let count = 5
        const t = setInterval(() => {
          count--
          setCountdown(count)
          if (count <= 0) {
            clearInterval(t)
            window.location.href = data.magic_link
          }
        }, 1000)
      } else {
        // Redirect to login
        setTimeout(() => router.push('/login'), 5000)
      }
    } catch (err: any) {
      setState('error')
      setMessage(err.message || 'שגיאה בהפעלת החשבון')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        {state === 'loading' && (
          <>
            <Loader2 size={56} className="text-amber-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">מפעיל את החשבון שלך...</h2>
            <p className="text-gray-500">רק רגע אחד</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">החשבון מוכן! 🎉</h2>
            <p className="text-gray-500 mb-4">מועבר אוטומטית בעוד {countdown} שניות...</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }} />
            </div>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle size={56} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">משהו השתבש</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
              className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
              פנה לתמיכה
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function DemoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
        <Loader2 size={48} className="text-amber-500 animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
