'use client'

import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Оплата прошла успешно!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Спасибо! Ваша карта сохранена для автоматических платежей. 
          Подписка активирована.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Перейти в Trinity CRM
          </Link>
          
          <Link
            href="/"
            className="block w-full py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
