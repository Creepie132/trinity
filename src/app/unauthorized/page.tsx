'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function UnauthorizedPage() {
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#0f0f0f',
        color: 'white',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 24,
          borderRadius: 12,
          background: '#1a1a1a',
          textAlign: 'center',
          display: 'grid',
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
          אין לך הרשאה לגשת למערכת
        </h1>

        <p style={{ opacity: 0.75 }}>
          פנה למנהל המערכת
        </p>

        <button
          onClick={signOut}
          style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: '#e53935',
            color: 'white',
            fontWeight: 600,
          }}
        >
          התנתק
        </button>
      </div>
    </div>
  )
}