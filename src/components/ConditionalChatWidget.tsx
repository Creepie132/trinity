'use client'

import { usePathname } from 'next/navigation'
import AiChatWidget from './AiChatWidget'

export default function ConditionalChatWidget() {
  const pathname = usePathname()
  const showChatBot = pathname === '/landing' || pathname === '/'

  if (!showChatBot) return null

  return <AiChatWidget />
}
