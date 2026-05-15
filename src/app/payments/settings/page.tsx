import { getBillingProfile } from './actions'
import { GatewaySettingsForm } from '@/components/payments/GatewaySettingsForm'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default async function PaymentsSettingsPage() {
  const profile = await getBillingProfile()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Payment gateway configuration</p>
      </div>

      {/* Статус подключения */}
      {profile ? (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm text-emerald-400 font-medium">Gateway connected</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {profile.gateway === 'tranzila' ? 'Tranzila' : 'Cardcom'} · terminal: <span className="font-mono">{profile.terminal_name}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm text-amber-400 font-medium">Gateway not configured</p>
            <p className="text-xs text-zinc-400 mt-0.5">Connect your Tranzila terminal to start accepting payments</p>
          </div>
        </div>
      )}

      <GatewaySettingsForm currentProfile={profile} />

      {/* Инструкция */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">How to find your credentials</p>
        <ol className="space-y-2 text-xs text-zinc-400 list-decimal list-inside leading-relaxed">
          <li>Log in to your <span className="text-zinc-200">Tranzila dashboard</span> at tranzila.com</li>
          <li>Go to <span className="text-zinc-200">Settings → Terminals</span></li>
          <li>Copy the <span className="text-zinc-200">Terminal Name</span> (supplier)</li>
          <li>Copy the <span className="text-zinc-200">Terminal Password</span> (API key)</li>
        </ol>
        <p className="text-[11px] text-zinc-600 pt-1">
          Your API key is encrypted and stored securely. It cannot be retrieved after saving.
        </p>
      </div>
    </div>
  )
}
