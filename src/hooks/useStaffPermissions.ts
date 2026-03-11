import { useQuery } from '@tanstack/react-query'

export interface StaffPermissions {
  view_all_visits: boolean
  create_visits: boolean
  manage_clients: boolean
  view_payments: boolean
  transfer_products: boolean
  [key: string]: boolean
}

const DEFAULT_PERMISSIONS: StaffPermissions = {
  view_all_visits: false,
  create_visits: false,
  manage_clients: false,
  view_payments: false,
  transfer_products: false,
}

export function useStaffPermissions(userId: string | null | undefined) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff-permissions', userId],
    queryFn: async (): Promise<StaffPermissions> => {
      if (!userId) return DEFAULT_PERMISSIONS
      const res = await fetch(`/api/staff-permissions?userId=${userId}`)
      if (!res.ok) return DEFAULT_PERMISSIONS
      const raw = await res.json()
      return { ...DEFAULT_PERMISSIONS, ...raw }
    },
    enabled: !!userId,
    staleTime: 60_000,
  })

  return {
    permissions: data ?? DEFAULT_PERMISSIONS,
    isLoading,
    refetch,
    // Destructured shortcuts
    ...(data ?? DEFAULT_PERMISSIONS),
  }
}
