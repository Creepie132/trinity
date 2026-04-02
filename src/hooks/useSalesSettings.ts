'use client'

import { useQuery } from '@tanstack/react-query'

interface SalesSettings {
  sale_always_paid: boolean
}

async function fetchSalesSettings(): Promise<SalesSettings> {
  const res = await fetch('/api/settings/sales')
  if (!res.ok) return { sale_always_paid: false }
  return res.json()
}

export function useSalesSettings() {
  return useQuery({
    queryKey: ['sales-settings'],
    queryFn: fetchSalesSettings,
    staleTime: 5 * 60 * 1000,
  })
}
