'use client'

import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Оплата не прошла
        </h1>
        
        <p className="text-gray-600 mb-6">
          К сожалению, не удалось обработать платёж. 
          Пожалуйста, проверьте данные карты и попробуйте снова.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Попробовать снова
          </button>
          
          <Link
            href="/"
            className="block w-full py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            На главную
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Если проблема повторяется, свяжитесь с нами: support@ambersol.co.il
        </p>
      </div>
    </div>
  )
}
