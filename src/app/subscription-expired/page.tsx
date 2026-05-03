import SubscriptionLock from '@/components/billing/SubscriptionLock'

export const metadata = {
  title: 'Trinity CRM — Subscription Required',
  robots: 'noindex',
}

export default function SubscriptionExpiredPage() {
  return <SubscriptionLock />
}
