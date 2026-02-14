'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Simple client-side redirect to landing page
    // No server-side DB calls = no timeout
    router.replace('/landing')
  }, [router])

  return null
}
