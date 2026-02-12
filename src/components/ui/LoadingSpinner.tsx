'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: { orbit: 'w-6 h-6', logo: 'w-3 h-3' },
    md: { orbit: 'w-10 h-10', logo: 'w-6 h-6' },
    lg: { orbit: 'w-16 h-16', logo: 'w-10 h-10' },
  }

  const { orbit, logo } = sizes[size]

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Orbit ring */}
        <div className={`${orbit} rounded-full border-2 border-transparent border-t-amber-500 animate-spin`} />
        
        {/* Logo in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className={`${logo} text-amber-500`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="currentColor"
              fillOpacity="0.2"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
