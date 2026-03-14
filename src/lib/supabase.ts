import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// CRITICAL: Use createBrowserClient for Next.js App Router
// lock: false — отключаем Web Locks API для синхронизации токена между вкладками.
// Без этого при перезагрузке страницы lock от старой вкладки иногда не освобождается
// вовремя, новый getUser() ждёт 5+ секунд → AuthProvider таймаутится → orgId = null → пустые списки.
// Для single-tab SaaS это безопасно: race condition между вкладками нам не критичен.
// lock: кастомная реализация без реального locking — решает deadlock при перезагрузке страницы.
// Стандартный Web Locks иногда не освобождается от старой вкладки вовремя, что вешает getUser() на 5+ сек.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
  },
})
