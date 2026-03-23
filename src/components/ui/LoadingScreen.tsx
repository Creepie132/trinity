'use client'

import Image from 'next/image'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Spinning orbit around logo */}
        <div className="relative">
          {/* Spinning blue border ring */}
          <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-400 animate-spin" />

          {/* Logo in center inside blue frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] flex items-center justify-center shadow-lg border-2 border-blue-300/40">
              <Image
                src="/trinity-logo.png"
                alt="Trinity"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Text with fade-in animation */}
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-fade-in">
          Trinity CRM
        </div>
      </div>
    </div>
  )
}
