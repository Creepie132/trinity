import { Metadata } from 'next'
import DiaryPageContent from '@/components/diary/DiaryPageContent'

export const metadata: Metadata = {
  title: 'Дневник | Trinity CRM'
}

export default function DiaryPage() {
  return <DiaryPageContent />
}