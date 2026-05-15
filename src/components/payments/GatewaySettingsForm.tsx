'use client'

import { useState, useTransition } from 'react'
import { saveBillingProfile, type SaveBillingResult, type SaveBillingResultErr, type BillingProfileData } from '@/app/payments/settings/actions'
import { Shield, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'

interface Props {
  currentProfile: BillingProfileData | null
}

export function GatewaySettingsForm({ currentProfile }: Props) {
  const [gateway,      setGateway]      = useState(currentProfile?.gateway ?? 'tranzila')
  const [terminal,     setTerminal]     = useState(currentProfile?.terminal_name ?? '')
  const [apiKey,       setApiKey]       = useState('')
  const [showKey,      setShowKey]      = useState(false)
  const [result,       setResult]       = useState<SaveBillingResult | null>(null)
  const [isPending,    startTransition] = useTransition()
  const resultError = (result && !result.ok) ? (result as SaveBillingResultErr).error : ''

  const isUpdate = !!currentProfile

  function handleSubmit() {
    if (!terminal.trim() || !apiKey.trim()) {
      setResult({ ok: false, error: 'Terminal name and API key are required' })
      return
    }

    const fd = new FormData()
    fd.set('gateway',       gateway)
    fd.set('terminal_name', terminal.trim())
    fd.set('api_key',       apiKey.trim())

    startTransition(async () => {
      const res = await saveBillingProfile(fd)
      setResult(res)
      if (res.ok) setApiKey('')  // очищаем поле ключа после сохранения
    })
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors font-mono'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-zinc-100">
          {isUpdate ? 'Update gateway' : 'Connect payment gateway'}
        </h2>
      </div>

      {/* Gateway selector */}
      <div>
        <label className={labelCls}>Gateway</label>
        <div className="flex gap-2">
          {(['tranzila', 'cardcom'] as const).map(gw => (
            <button
              key={gw}
              type="button"
              onClick={() => setGateway(gw)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                gateway === gw
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {gw === 'tranzila' ? 'Tranzila' : 'Cardcom'}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal name */}
      <div>
        <label className={labelCls}>Terminal name (supplier)</label>
        <input
          type="text"
          placeholder="e.g. mysalon"
          value={terminal}
          onChange={e => setTerminal(e.target.value)}
          className={inputCls}
          autoComplete="off"
        />
      </div>

      {/* API key */}
      <div>
        <label className={labelCls}>
          Terminal password (API key)
          {isUpdate && <span className="text-zinc-600 ml-2 font-normal">— leave blank to keep current</span>}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder={isUpdate ? '••••••••' : 'Enter your terminal password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className={`${inputCls} pr-12`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1.5 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Encrypted with AES-256 before storage. Never visible after saving.
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
          result.ok
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {result.ok && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>
            {result.ok
              ? `Gateway saved. Terminal: ${result.terminal_name}`
              : resultError}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !terminal.trim() || (!isUpdate && !apiKey.trim())}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors"
      >
        {isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : <><Shield className="w-4 h-4" /> {isUpdate ? 'Update gateway' : 'Connect gateway'}</>
        }
      </button>
    </div>
  )
}
