'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Simple client-side redirect to login
    // No server-side DB calls = no timeout
    router.replace('/login')
  }, [router])

  return null
}
