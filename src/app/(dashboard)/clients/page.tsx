import { Metadata } from 'next'
import ClientsPageContent from '@/components/clients/ClientsPageContent'

export const metadata: Metadata = {
  title: 'Клиенты | Trinity CRM'
}

export default function ClientsPage() {
  return <ClientsPageContent />
}