'use client'

import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface Props {
  orgName: string
  userId: string
}

export function PaymentsHeader({ orgName, userId }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          Payments Terminal
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
    </header>
  )
}
