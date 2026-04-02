import { Suspense } from 'react'
import { loadWebsiteSettings } from '@/app/actions/website-settings'
import { WebsiteSettingsForm } from './WebsiteSettingsForm'

export const dynamic = 'force-dynamic'

export default async function WebsiteSettingsPage() {
  const initial = await loadWebsiteSettings()
  return (
    <div className="min-h-screen bg-gray-50/80 p-3 md:p-6">
      <Suspense fallback={<div className="h-64 rounded-2xl bg-white animate-pulse shadow-sm" />}>
        <WebsiteSettingsForm initial={initial} />
      </Suspense>
    </div>
  )
}
