import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Supabase Client
 * DANGER: Bypasses RLS - use only in server-side code!
 * 
 * Use cases:
 * - Auto-linking org_users.user_id after first login
 * - Admin operations that need elevated permissions
 * - Database migrations/cleanup scripts
 */
export function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
