'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface AdminDeletePaymentButtonProps {
  paymentId: string
  onDeleted?: () => void
  variant?: 'icon' | 'sidebar'
}

export function AdminDeletePaymentButton({ paymentId, onDeleted, variant = 'icon' }: AdminDeletePaymentButtonProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (!password) { toast.error('Введите пароль'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Ошибка удаления'); return }
      toast.success('Платёж удалён')
      setOpen(false)
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      onDeleted?.()
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const close = () => { setOpen(false); setPassword('') }

  return (
    <>
      {/* Trigger button */}
      {variant === 'sidebar' ? (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          style={{
            padding: '9px 10px', borderRadius: 9,
            border: '0.5px solid rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.85)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, width: '100%',
          }}
        >
          <Trash2 size={13} />
          Удалить платёж
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          style={{
            padding: '6px 8px', borderRadius: 7, border: 'none',
            background: 'transparent', color: '#ef4444',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
          title="Удалить платёж"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Inline confirm overlay — renders above everything via fixed + high z-index */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 99998,
            }}
          />
          {/* Dialog card */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 99999,
              width: 380, maxWidth: 'calc(100vw - 32px)',
              background: '#1a1f2e',
              borderRadius: 16,
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  Удалить платёж
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  Действие необратимо
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px 20px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                Платёж будет удалён без возможности восстановления. Введите пароль администратора.
              </p>

              {/* Password input */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Пароль администратора"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    paddingRight: 40,
                  }}
                  className="placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                    display: 'flex', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={close}
                  disabled={loading}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading || !password}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: 'none',
                    background: loading || !password
                      ? 'rgba(239,68,68,0.3)'
                      : 'linear-gradient(135deg,#ef4444,#dc2626)',
                    color: loading || !password ? 'rgba(255,255,255,0.4)' : '#fff',
                    cursor: loading || !password ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {loading ? 'Удаляю…' : 'Удалить навсегда'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
