import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[Admin Check] Starting admin check...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Admin Check] Missing Supabase URL or Anon Key')
      return NextResponse.json({ isAdmin: false, error: 'Configuration error' }, { status: 500 })
    }

    // Create server-side Supabase client with cookies
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Not needed for reading
          },
          remove(name: string, options: any) {
            // Not needed for reading
          },
        },
      }
    )

    // Get current user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('[Admin Check] User ID:', user?.id)
    console.log('[Admin Check] User Email:', user?.email)
    console.log('[Admin Check] User Error:', userError?.message)

    if (userError || !user) {
      console.log('[Admin Check] ❌ Not authenticated')
      return NextResponse.json({ isAdmin: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Check admin using service role (bypasses RLS)
    if (supabaseServiceKey) {
      console.log('[Admin Check] Using Service Role Key to check admin')
      
      const adminClient = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: adminUser, error: adminError } = await adminClient
        .from('admin_users')
        .select('id, email')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('[Admin Check] Admin user found:', !!adminUser)
      console.log('[Admin Check] Admin error:', adminError?.message)

      if (adminError && adminError.code !== 'PGRST116') {
        console.error('[Admin Check] Database error:', adminError)
        return NextResponse.json({ isAdmin: false, error: adminError.message }, { status: 500 })
      }

      const isAdmin = !!adminUser
      console.log('[Admin Check] Result:', isAdmin ? '✅ IS ADMIN' : '❌ NOT ADMIN')

      return NextResponse.json({ 
        isAdmin, 
        user: { id: user.id, email: user.email } 
      })
    } else {
      // Fallback: try with anon key (will respect RLS)
      console.warn('[Admin Check] ⚠️ No Service Role Key - using anon key (RLS will apply)')
      
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('[Admin Check] Admin check result:', { found: !!adminUser, error: adminError?.message })

      if (adminError && adminError.code !== 'PGRST116') {
        console.error('[Admin Check] Database error:', adminError)
        return NextResponse.json({ isAdmin: false, error: adminError.message }, { status: 500 })
      }

      const isAdmin = !!adminUser
      console.log('[Admin Check] Result:', isAdmin ? '✅ IS ADMIN' : '❌ NOT ADMIN')

      return NextResponse.json({ 
        isAdmin, 
        user: { id: user.id, email: user.email } 
      })
    }

  } catch (error: any) {
    console.error('[Admin Check] Exception:', error)
    return NextResponse.json({ isAdmin: false, error: error.message }, { status: 500 })
  }
}
