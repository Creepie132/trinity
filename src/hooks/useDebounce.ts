// ================================================
// TRINITY CRM — useDebounce
// Единый debounce-хук для поиска по всему проекту.
// Версия: 1.0.0
// ================================================

import { useState, useEffect } from 'react'

/**
 * useDebounce — задерживает обновление значения до тех пор,
 * пока пользователь не перестал вводить текст.
 *
 * @param value   - исходное значение (строка, число, любой тип)
 * @param delay   - задержка в мс (рекомендуется 300–400)
 * @returns       - стабилизированное значение
 *
 * Использование в компоненте:
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebounce(search, 350)
 *   // debouncedSearch передаём в useClients / useProducts / useVisits
 *   // React Query кэширует результат по ключу ['clients', debouncedSearch]
 *   // — при стирании текста старый результат отдаётся мгновенно из памяти.
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Сбрасываем таймер при каждом изменении value
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
