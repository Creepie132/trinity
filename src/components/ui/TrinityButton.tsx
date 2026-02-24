'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'
import { Save, Phone, MessageCircle, Pencil } from 'lucide-react'

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
  call: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50',
  whatsapp: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50',
  edit: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
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
      icon={<Save size={16} />}
      locale={locale}
      {...props}
    >
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
      locale={locale}
      {...props}
    >
      {locale === 'he' ? 'ביטול' : 'Отмена'}
    </TrinityButton>
  )
}

// Кнопка звонка
export function TrinityCallButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="call"
      icon={<Phone size={16} />}
      locale={locale}
      {...props}
    >
      {locale === 'he' ? 'התקשר' : 'Позвонить'}
    </TrinityButton>
  )
}

// Кнопка WhatsApp
export function TrinityWhatsAppButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="whatsapp"
      icon={<MessageCircle size={16} />}
      locale={locale}
      {...props}
    >
      WhatsApp
    </TrinityButton>
  )
}

// Кнопка редактирования
export function TrinityEditButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="edit"
      icon={<Pencil size={16} />}
      locale={locale}
      {...props}
    >
      {locale === 'he' ? 'עריכה' : 'Изменить'}
    </TrinityButton>
  )
}

// Кнопка удаления
export function TrinityDeleteButton({ locale = 'ru', ...props }: PresetButtonProps) {
  return (
    <TrinityButton
      variant="danger"
      fullWidth
      locale={locale}
      {...props}
    >
      {locale === 'he' ? 'מחק' : 'Удалить'}
    </TrinityButton>
  )
}

// Круглая иконка-кнопка (для quick actions)
interface TrinityIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: Extract<TrinityButtonVariant, 'call' | 'whatsapp' | 'edit'>
  label?: string
}

export function TrinityIconButton({ 
  icon, 
  variant = 'edit',
  label,
  ...props 
}: TrinityIconButtonProps) {
  return (
    <TrinityButton
      variant={variant}
      size="icon"
      title={label}
      {...props}
    >
      {icon}
    </TrinityButton>
  )
}
