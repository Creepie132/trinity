// src/lib/supabase-browser.ts
// Unified: always returns the same singleton instance from supabase.ts
import { supabase } from '@/lib/supabase'

export function createSupabaseBrowserClient() {
  return supabase
}