'use client'

interface PrismButtonProps {
  href: string
  children: React.ReactNode
  mobile?: boolean
}

export function PrismButton({ href, children, mobile = false }: PrismButtonProps) {
  return (
    <a
      href={href}
      className={`prism-btn-wrap ${mobile ? 'w-full' : 'inline-block'}`}
    >
      <span className="prism-btn-shell">
        <span className="prism-btn-border"></span>
        <span className="prism-btn-face prism-btn-face--primary">
          <span className="prism-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" 
                fill="url(#prism-gradient)" 
                stroke="rgba(0,0,0,0.1)" 
                strokeWidth="0.5"
              />
              <defs>
                <linearGradient id="prism-gradient" x1="3" y1="2" x2="21" y2="22">
                  <stop offset="0%" stopColor="#4285f4"/>
                  <stop offset="50%" stopColor="#9b72cb"/>
                  <stop offset="100%" stopColor="#d96570"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="prism-btn-text">{children}</span>
        </span>
      </span>
    </a>
  )
}
