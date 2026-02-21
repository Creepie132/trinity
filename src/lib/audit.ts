import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AuditEntry {
  org_id: string
  user_id?: string
  user_email?: string
  action: "create" | "update" | "delete" | "login" | "export" | "send_sms"
  entity_type: string
  entity_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  ip_address?: string
}

export async function logAudit(entry: AuditEntry) {
  try {
    await supabaseAdmin.from("audit_log").insert(entry)
  } catch (error) {
    console.error("Audit log failed:", error)
    // Не бросаем ошибку — audit log не должен ломать основной функционал
  }
}
