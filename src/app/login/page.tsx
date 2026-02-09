'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient()

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: '${process.env.NEXT_PUBLIC_APP_URL}/auth/callback',
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'grid', gap: 6, justifyItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.4 }}>Trinity</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Amber Solutions</div>
        </div>

        <button
          onClick={signIn}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          כניסה עם Google
        </button>
      </div>
    </div>
  )
}

