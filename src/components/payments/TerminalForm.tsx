'use client'

import { useState } from 'react'
import { Link2, Loader2, Copy, Check } from 'lucide-react'

interface FormState {
  amount: string
  description: string
  client_name: string
  client_phone: string
}

const INITIAL: FormState = { amount: '', description: '', client_name: '', client_phone: '' }

export function TerminalForm() {
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [link, setLink]       = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit() {
    setError(null)
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/gateway/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:       Number(form.amount),
          description:  form.description,
          client_name:  form.client_name,
          client_phone: form.client_phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create link')
      setLink(data.link_url)
      setForm(INITIAL)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount (₪) *</label>
        <input
          type="number"
          min="1"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={set('amount')}
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
        <input
          type="text"
          placeholder="Payment for services..."
          value={form.description}
          onChange={set('description')}
          className={inputCls}
        />
      </div>

      {/* Client */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Client name</label>
          <input type="text" placeholder="Name" value={form.client_name} onChange={set('client_name')} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone</label>
          <input type="tel" placeholder="+972..." value={form.client_phone} onChange={set('client_phone')} className={inputCls} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {loading ? 'Generating...' : 'Generate payment link'}
      </button>

      {/* Result */}
      {link && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-xs text-emerald-400 font-medium mb-2">✓ Payment link created</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-xs text-zinc-300 break-all font-mono">{link}</p>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
