import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// CRITICAL: Use createBrowserClient for Next.js App Router
// This properly handles cookies and session storage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
