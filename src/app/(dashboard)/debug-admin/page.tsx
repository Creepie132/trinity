'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function DebugAdminPage() {
  const [checks, setChecks] = useState({
    isLoggedIn: false,
    userId: null as string | null,
    userEmail: null as string | null,
    apiCheckResult: null as any,
    apiCheckError: null as string | null,
    inAdminTable: false,
    adminTableError: null as string | null,
  })

  useEffect(() => {
    runChecks()
  }, [])

  const runChecks = async () => {
    const results = { ...checks }

    // Check 1: Is user logged in?
    const { data: { user } } = await supabase.auth.getUser()
    results.isLoggedIn = !!user
    results.userId = user?.id || null
    results.userEmail = user?.email || null

    // Check 2: API check
    try {
      const response = await fetch('/api/admin/check', { credentials: 'include' })
      const data = await response.json()
      results.apiCheckResult = data
      results.apiCheckError = null
    } catch (error: any) {
      results.apiCheckError = error.message
    }

    // Check 3: Direct admin_users check
    if (user) {
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      results.inAdminTable = !!adminUser
      results.adminTableError = error?.message || null
    }

    setChecks(results)
  }

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Debug Panel</h1>
          <p className="text-gray-600 mt-1">
            Диагностика доступа к админке
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Diagnostic Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Check 1: Login */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">1. User Logged In</p>
                {checks.userId && (
                  <div className="text-sm text-gray-600 mt-1">
                    <p>ID: {checks.userId}</p>
                    <p>Email: {checks.userEmail}</p>
                  </div>
                )}
              </div>
              <StatusIcon status={checks.isLoggedIn} />
            </div>

            {/* Check 2: API */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold">2. API Check (/api/admin/check)</p>
                {checks.apiCheckResult && (
                  <div className="text-sm text-gray-600 mt-1">
                    <pre className="bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(checks.apiCheckResult, null, 2)}
                    </pre>
                  </div>
                )}
                {checks.apiCheckError && (
                  <p className="text-sm text-red-500 mt-1">Error: {checks.apiCheckError}</p>
                )}
              </div>
              <StatusIcon status={checks.apiCheckResult?.isAdmin || false} />
            </div>

            {/* Check 3: Direct DB */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">3. In admin_users Table (Direct Check)</p>
                {checks.adminTableError && (
                  <p className="text-sm text-red-500 mt-1">Error: {checks.adminTableError}</p>
                )}
                {!checks.isLoggedIn && (
                  <p className="text-sm text-gray-500 mt-1">Login required</p>
                )}
              </div>
              <StatusIcon status={checks.inAdminTable} />
            </div>

            {/* Refresh Button */}
            <div className="pt-4 border-t">
              <Button onClick={runChecks} className="w-full">
                Refresh Checks
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Fix Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!checks.isLoggedIn && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-900">❌ Not Logged In</p>
                <p className="text-sm text-red-700 mt-1">
                  Go back to the main app and log in first.
                </p>
              </div>
            )}

            {checks.isLoggedIn && !checks.inAdminTable && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-yellow-900">⚠️ Not in admin_users Table</p>
                <p className="text-sm text-yellow-700 mt-2">
                  Run this in Supabase SQL Editor:
                </p>
                <pre className="bg-white p-3 rounded border mt-2 text-xs overflow-auto">
{`INSERT INTO admin_users (user_id, email) 
VALUES ('${checks.userId}', '${checks.userEmail}');`}
                </pre>
              </div>
            )}

            {checks.isLoggedIn && checks.inAdminTable && !checks.apiCheckResult?.isAdmin && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="font-semibold text-orange-900">⚠️ API Check Failed</p>
                <p className="text-sm text-orange-700 mt-1">
                  You're in admin_users but API returns false. Check:
                </p>
                <ol className="list-decimal list-inside text-sm text-orange-700 mt-2 space-y-1">
                  <li>SUPABASE_SERVICE_ROLE_KEY in .env.local</li>
                  <li>Server restarted after adding env var</li>
                  <li>RLS policies on admin_users table</li>
                </ol>
              </div>
            )}

            {checks.apiCheckResult?.isAdmin && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-semibold text-green-900">✅ All Checks Passed!</p>
                <p className="text-sm text-green-700 mt-1">
                  You should see the "אדמין" button in the sidebar.
                  If not, try hard refresh (Ctrl+Shift+R).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
