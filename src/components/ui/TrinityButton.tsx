'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'

// ============================================
// УНИВЕРСАЛЬНЫЕ КНОПКИ TRINITY CRM
// Единая стилистика для всех форм, карточек, drawer
// ============================================

// ----- Варианты кнопок -----
type TrinityButtonVariant =
  | 'primary' // основное действие (сохранить, подтвердить)
  | 'secondary' // второстепенное (отмена, назад)
  | 'outline' // контурная (начать визит, завершить)
  | 'ghost' // прозрачная (для тулбаров)
  | 'danger' // удаление, отмена
  | 'call' // звонок (синяя)
  | 'whatsapp' // WhatsApp (зелёная)
  | 'edit' // редактирование (серая)
  | 'icon' // круглая кнопка-иконка (как quick actions в TrinityCard)

type TrinityButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface TrinityButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TrinityButtonVariant
  size?: TrinityButtonSize
  icon?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  locale?: 'he' | 'ru'
}

const VARIANT_CLASSES: Record<TrinityButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-muted text-foreground hover:bg-muted/80',
  outline: 'border-2 border-primary/30 text-primary bg-transparent hover:bg-primary/5',
  ghost: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  call: 'bg-blue-600 text-white hover:bg-blue-700',
  whatsapp: 'bg-emerald-600 text-white hover:bg-emerald-700',
  edit: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
  icon: 'rounded-full hover:opacity-80',
}

const SIZE_CLASSES: Record<TrinityButtonSize, string> = {
  sm: 'text-xs px-3 py-2 rounded-lg',
  md: 'text-sm px-4 py-3 rounded-xl',
  lg: 'text-base px-6 py-3.5 rounded-xl',
  icon: 'w-9 h-9 rounded-full p-0',
}

export function TrinityButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  locale,
  ...props
}: TrinityButtonProps) {
  const isIconOnly = variant === 'icon' || size === 'icon'

  return (
    <button
      disabled={disabled || loading}
      className={[
        'font-medium transition flex items-center justify-center gap-2',
        VARIANT_CLASSES[variant],
        isIconOnly ? SIZE_CLASSES.icon : SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  )
}

// ============================================
// ГОТОВЫЕ ПРЕСЕТЫ — для быстрого использования
// ============================================

interface PresetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  locale?: 'he' | 'ru'
  loading?: boolean
  fullWidth?: boolean
}

// Кнопка сохранения
export function TrinitySaveButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="primary"
      fullWidth
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
          <path d="M17 21v-8H7v8M7 3v5h8"/>
        </svg>
      }
      {...props}>
      {locale === 'he' ? 'שמור' : 'Сохранить'}
    </TrinityButton>
  )
}

// Кнопка отмены
export function TrinityCancelButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="secondary"
      fullWidth
      {...props}
    >
      {locale === 'he' ? 'ביטול' : 'Отмена'}
    </TrinityButton>
  )
}

// Кнопка удаления
export function TrinityDeleteButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="danger"
      fullWidth
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      }
      {...props}
    >
      {locale === 'he' ? 'מחק' : 'Удалить'}
    </TrinityButton>
  )
}

// Кнопка звонка
export function TrinityCallButton({ phone, locale = 'ru', ...props }: PresetButtonProps & { phone: string }) {
  return (
    <TrinityButton
      variant="call"
      fullWidth
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
      }
      onClick={() => window.location.href = `tel:${phone}`}
      {...props}
    >
      {locale === 'he' ? 'התקשר' : 'Позвонить'}
    </TrinityButton>
  )
}

// Кнопка WhatsApp
export function TrinityWhatsAppButton({ phone, locale = 'ru', ...props }: PresetButtonProps & { phone: string }) {
  return (
    <TrinityButton
      variant="whatsapp"
      fullWidth
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
        </svg>
      }
      onClick={() => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank')}
      {...props}
    >
      WhatsApp
    </TrinityButton>
  )
}

// Круглая иконка-кнопка (для quick actions)
export function TrinityIconButton({ 
  icon, 
  color = 'bg-muted', 
  textColor = 'text-muted-foreground', 
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement> & { 
  icon: ReactNode
  color?: string
  textColor?: string
}) {
  return (
    <button
      className={`flex items-center justify-center w-9 h-9 rounded-full ${color} ${textColor} hover:opacity-80 transition active:scale-95`}
      {...props}
    >
      {icon}
    </button>
  )
}
