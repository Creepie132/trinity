'use client'

import { TrinityDataCard } from './TrinityDataCard'

interface Column {
  key: string
  label: string
  compact?: boolean // показать в карточке
  render?: (value: any, row: any) => React.ReactNode
}

interface ResponsiveDataViewProps {
  columns: Column[]
  data: any[]
  titleKey: string // ключ поля для title карточки
  subtitleKey?: string // ключ для subtitle
  badgeKey?: string // ключ для badge
  badgeColorMap?: Record<string, string>
  actions?: (row: any) => { label: string; onClick: () => void; variant?: 'default' | 'destructive' }[]
  locale: 'he' | 'ru'
}

export function ResponsiveDataView({
  columns,
  data,
  titleKey,
  subtitleKey,
  badgeKey,
  badgeColorMap,
  actions,
  locale,
}: ResponsiveDataViewProps) {
  return (
    <>
      {/* Десктоп — таблица */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-start p-3 text-sm font-medium text-muted-foreground"
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/50">
                {columns.map(col => (
                  <td key={col.key} className="p-3 text-sm">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      {actions(row).map((action, idx) => (
                        <button
                          key={idx}
                          onClick={action.onClick}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            action.variant === 'destructive'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобильный — карточки */}
      <div className="md:hidden space-y-1">
        {data.map((row, i) => (
          <TrinityDataCard
            key={i}
            title={row[titleKey] || ''}
            subtitle={subtitleKey ? row[subtitleKey] : undefined}
            badge={
              badgeKey && row[badgeKey]
                ? {
                    text: row[badgeKey],
                    color: (badgeColorMap?.[row[badgeKey]] || 'gray') as any,
                  }
                : undefined
            }
            fields={columns.map(col => ({
              key: col.key,
              label: col.label,
              value: col.render ? col.render(row[col.key], row) : (row[col.key] || '—'),
              compact: col.compact,
            }))}
            actions={actions ? actions(row) : undefined}
          />
        ))}
      </div>
    </>
  )
}
