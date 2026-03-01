import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/care-instructions/storage-check
 * Diagnostic endpoint to check storage configuration
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, email: user.email } : null,
      userError: userError?.message || null,
    }

    // Check buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    diagnostics.buckets = {
      data: buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })),
      error: bucketsError?.message || null,
    }

    // Check if care-instructions bucket exists
    const careInstructionsBucket = buckets?.find(b => b.id === 'care-instructions')
    diagnostics.careInstructionsBucket = {
      exists: !!careInstructionsBucket,
      details: careInstructionsBucket || null,
    }

    // Try to list files (if bucket exists)
    if (careInstructionsBucket) {
      const { data: files, error: filesError } = await supabase.storage
        .from('care-instructions')
        .list()
      
      diagnostics.files = {
        count: files?.length || 0,
        error: filesError?.message || null,
      }
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    console.error('[API] Storage check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
