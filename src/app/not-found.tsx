import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <div className="text-gray-400 text-8xl font-bold">404</div>
        <h2 className="text-2xl font-bold text-gray-900">הדף לא נמצא</h2>
        <p className="text-gray-600">הדף שחיפשת אינו קיים</p>
        <Link href="/landing">
          <Button>חזור לדף הבית</Button>
        </Link>
      </div>
    </div>
  )
}
