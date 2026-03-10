import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: existingUser } = await supabase
    .from('users')
    .select()
    .eq('email', 'demo@trinity.test')
    .single()

  if (!existingUser) {
    const { data, error } = await supabase.auth.signUp({
      email: 'demo@trinity.test',
      password: 'demo123456',
      options: {
        data: {
          org_id: 'demo-org',
          name: 'Demo User'
        }
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Demo user created', user: data.user })
  }

  return NextResponse.json({ message: 'Demo user already exists' })
}