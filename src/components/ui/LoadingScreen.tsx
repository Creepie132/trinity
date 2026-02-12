'use client'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Spinning orbit around logo */}
        <div className="relative">
          {/* Orbit ring */}
          <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-amber-500 animate-spin" />
          
          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/logoload.png" 
              alt="Trinity" 
              className="w-12 h-12 rounded-xl" 
            />
          </div>
        </div>

        {/* Text with fade-in animation */}
        <div className="text-2xl font-bold text-amber-500 animate-fade-in">
          Trinity
        </div>
      </div>
    </div>
  )
}
