'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { X } from 'lucide-react'
import {
  PAYMENT_METHODS_FOR_MODAL,
  type TrinityPaymentMethodId,
} from '@/lib/payment-methods'

interface PaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectMethod: (method: TrinityPaymentMethodId) => void
}

export function PaymentMethodModal({ open, onOpenChange, onSelectMethod }: PaymentMethodModalProps) {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const isHe = language === 'he'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onOpenChange])

  if (!open || !mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={() => onOpenChange(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 9000 }}
      />
      {/* Modal */}
      <div
        dir={isHe ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 9001, width: '90%', maxWidth: 420,
          background: '#fff', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden', animation: 'pmFadeIn 0.2s ease both',
        }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e2533 0%, #2d3748 100%)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {isHe ? 'בחר אמצעי תשלום' : 'Выберите способ оплаты'}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
              {isHe ? 'תשלום חדש' : 'Новый платёж'}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', transition: 'background 0.15s' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Methods */}
        <div style={{ padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PAYMENT_METHODS_FOR_MODAL.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { onSelectMethod(m.id); onOpenChange(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: m.bg, border: `1.5px solid ${m.border}`,
                borderRadius: 14, cursor: 'pointer', textAlign: isHe ? 'right' : 'left',
                transition: 'transform 0.15s, box-shadow 0.15s',
                animation: `pmSlideIn 0.25s ${i * 0.06}s ease both`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${m.glow}`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = ''
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = ''
              }}
            >
              {/* Icon bubble */}
              <div style={{ width: 46, height: 46, borderRadius: 13, background: m.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 4px 14px ${m.glow}`, flexShrink: 0 }}>
                {m.icon}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: m.color, margin: '0 0 2px' }}>
                  {isHe ? m.labelHe : m.labelRu}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                  {isHe ? m.descHe : m.descRu}
                </p>
              </div>
              {/* Arrow */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: m.color, opacity: 0.5, flexShrink: 0, transform: isHe ? 'rotate(180deg)' : 'none' }}>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pmFadeIn { from { opacity: 0; transform: translate(-50%, -52%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes pmSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>,
    document.body
  )
}
