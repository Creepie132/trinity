'use client'

import { useHeartbeat } from '@/hooks/useHeartbeat'

// Worker layout: sends heartbeat every 30s to track online presence
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  useHeartbeat()
  return <>{children}</>
}
