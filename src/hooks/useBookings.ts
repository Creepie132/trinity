import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'

export interface Booking {
  id: string
  org_id: string
  client_name: string
  client_phone: string
  client_email?: string
  service_id?: string
  service_name: string
  scheduled_at: string
  duration_minutes: number
  notes?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  updated_at: string
}

export function useBookings(orgId: string | null) {
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  // Fetch bookings
  const bookingsQuery = useQuery({
    queryKey: ['bookings', orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('org_id', orgId)
        .order('scheduled_at', { ascending: false })

      if (error) throw error
      return data as Booking[]
    },
    enabled: !!orgId,
  })

  // Count pending bookings
  const pendingCountQuery = useQuery({
    queryKey: ['bookings-pending-count', orgId],
    queryFn: async () => {
      if (!orgId) return 0

      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending')

      if (error) throw error
      return count || 0
    },
    enabled: !!orgId,
  })

  // Confirm booking (update status + create visit)
  const confirmMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (bookingError) throw bookingError
      if (!booking) throw new Error('Booking not found')

      // Find or create client
      let clientId: string

      // Try to find existing client by phone
      const { data: existingClient, error: clientSearchError } = await supabase
        .from('clients')
        .select('id')
        .eq('org_id', booking.org_id)
        .eq('phone', booking.client_phone)
        .single()

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Create new client
        const nameParts = booking.client_name.split(' ')
        const firstName = nameParts[0] || booking.client_name
        const lastName = nameParts.slice(1).join(' ') || ''

        const { data: newClient, error: clientCreateError } = await supabase
          .from('clients')
          .insert({
            org_id: booking.org_id,
            first_name: firstName,
            last_name: lastName,
            phone: booking.client_phone,
            email: booking.client_email,
          })
          .select()
          .single()

        if (clientCreateError) throw clientCreateError
        clientId = newClient.id
      }

      // Create visit
      const { error: visitError } = await supabase
        .from('visits')
        .insert({
          org_id: booking.org_id,
          client_id: clientId,
          service_id: booking.service_id,
          service_type: booking.service_name,
          scheduled_at: booking.scheduled_at,
          duration_minutes: booking.duration_minutes,
          notes: booking.notes,
          status: 'scheduled',
        })

      if (visitError) throw visitError

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookings-pending-count'] })
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('ההזמנה אושרה וביקור נוצר!')
    },
    onError: (error) => {
      console.error('Error confirming booking:', error)
      toast.error('Failed to confirm booking')
    },
  })

  // Cancel booking
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookings-pending-count'] })
      toast.success('ההזמנה בוטלה')
    },
    onError: (error) => {
      console.error('Error cancelling booking:', error)
      toast.error('Failed to cancel booking')
    },
  })

  return {
    bookings: bookingsQuery.data || [],
    isLoading: bookingsQuery.isLoading,
    pendingCount: pendingCountQuery.data || 0,
    confirmBooking: confirmMutation.mutate,
    cancelBooking: cancelMutation.mutate,
    isConfirming: confirmMutation.isPending,
    isCancelling: cancelMutation.isPending,
  }
}
