'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage } from '@/contexts/LanguageContext'
import { Shield, MessageCircle, Loader2, ExternalLink, RefreshCw, LogOut } from 'lucide-react'

interface PaywallData {
  plan: string
  amount: number
}

const PLAN_LABELS: Record<string, { he: string; ru: string }> = {
  basic: { he: 'Base', ru: 'Base' },
  pro: { he: 'Pro', ru: 'Pro' },
  enterprise: { he: 'Enterprise', ru: 'Enterprise' },
}

const I18N = {
  he: {
    title: 'הגישה למערכת הושהתה',
    subtitle: 'המנוי שלך אינו פעיל',
    desc: 'כדי להמשיך להשתמש ב-Trinity CRM, יש לחדש את המנוי. לאחר התשלום, הגישה תיפתח אוטומטית.',
    planLabel: 'תוכנית נוכחית',
    amountLabel: 'לתשלום',
    monthly: '/ חודש',
    payBtn: 'חידוש גישה — שלם עכשיו',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    paying: 'מעביר לדף התשלום...',
    waitTitle: 'ממתין לאישור תשלום...',
    waitDesc: 'לאחר השלמת התשלום, הגישה תיפתח באופן אוטומטי',
    unlocked: 'הגישה הושבה! מפנה...',
    logout: 'התנתק',
    retry: 'בדוק שוב',
    supportTitle: 'זקוק לעזרה?',
  },
  ru: {
    title: 'Доступ к системе приостановлен',
    subtitle: 'Ваша подписка неактивна',
    desc: 'Для продолжения работы с Trinity CRM необходимо возобновить подписку. После оплаты доступ откроется автоматически.',
    planLabel: 'Текущий план',
    amountLabel: 'К оплате',
    monthly: '/ мес',
    payBtn: 'Возобновить доступ — оплатить',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    paying: 'Переход на страницу оплаты...',
    waitTitle: 'Ожидание подтверждения оплаты...',
    waitDesc: 'После завершения оплаты доступ откроется автоматически',
    unlocked: 'Доступ восстановлен! Перенаправляем...',
    logout: 'Выйти',
    retry: 'Проверить снова',
    supportTitle: 'Нужна помощь?',
  },
}

export default function SubscriptionLock() {
  const { language } = useLanguage()
  const router = useRouter()
  const t = I18N[language as 'he' | 'ru'] ?? I18N.ru
  const supabase = createSupabaseBrowserClient()

  const [paywallData, setPaywallData] = useState<PaywallData>({ plan: 'basic', amount: 199 })
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('trinity_paywall_data='))
        ?.split('=').slice(1).join('=')
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw))
        if (parsed.plan && parsed.amount) setPaywallData(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const oid = data.session?.user?.app_metadata?.org_id
      if (oid) setOrgId(oid)
    })
  }, [])

  useEffect(() => {
    if (!orgId) return
    const channel = supabase
      .channel(`billing:${orgId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'organizations',
        filter: `id=eq.${orgId}`,
      }, async (payload) => {
        const s = payload.new?.subscription_status
        if (s === 'active' || s === 'manual') {
          setUnlocked(true)
          await fetch('/api/billing/invalidate', { method: 'POST' })
          setTimeout(() => router.push('/dashboard'), 1800)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orgId, router])

  const handlePay = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/paywall-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: paywallData.plan }),
      })
      const data = await res.json()
      if (data.url) {
        setWaiting(true)
        window.open(data.url, '_blank', 'noopener,noreferrer')
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [paywallData.plan])

  const handleRetry = useCallback(async () => {
    setLoading(true)
    await fetch('/api/billing/invalidate', { method: 'POST' })
    router.refresh()
    setLoading(false)
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router, supabase])

  const planLabel = PLAN_LABELS[paywallData.plan]?.[language as 'he' | 'ru'] ?? paywallData.plan
  const isRtl = language === 'he'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg,#0a0a14 0%,#0f1629 40%,#0a0e1f 70%,#0d0a1f 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Rubik',sans-serif", padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position:'absolute',top:'-20%',right:'-10%',width:'600px',height:'600px',borderRadius:'50%',
        background:'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)',pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:'-20%',left:'-10%',width:'500px',height:'500px',borderRadius:'50%',
        background:'radial-gradient(circle,rgba(245,158,11,0.08) 0%,transparent 70%)',pointerEvents:'none' }} />

      <div style={{
        width:'100%', maxWidth:'480px',
        background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(255,255,255,0.08)', borderRadius:'24px',
        padding:'40px 36px',
        boxShadow:'0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(99,102,241,0.15) inset',
        position:'relative', zIndex:1,
      }}>
        {/* Icon + title */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{
            width:'72px',height:'72px',margin:'0 auto 18px',
            background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(99,102,241,0.15))',
            border:`1px solid ${unlocked ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Shield size={34} color={unlocked ? '#10b981' : '#f59e0b'} />
          </div>
          <h1 style={{ fontSize:'21px',fontWeight:700,color:unlocked?'#10b981':'#f1f5f9',margin:'0 0 6px',lineHeight:1.3 }}>
            {unlocked ? t.unlocked : t.title}
          </h1>
          {!unlocked && <p style={{ fontSize:'13px',color:'rgba(248,250,252,0.45)',margin:0 }}>{t.subtitle}</p>}
        </div>

        {unlocked && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <Loader2 size={22} color='rgba(16,185,129,0.6)' style={{ animation:'spin 1s linear infinite' }} />
          </div>
        )}

        {!unlocked && <>
          <p style={{ fontSize:'14px',color:'rgba(248,250,252,0.6)',lineHeight:1.7,textAlign:'center',margin:'0 0 24px' }}>
            {t.desc}
          </p>

          {/* Plan card */}
          <div style={{
            background:'rgba(99,102,241,0.07)',border:'1px solid rgba(99,102,241,0.18)',
            borderRadius:'16px',padding:'18px 22px',marginBottom:'20px',
            display:'flex',justifyContent:'space-between',alignItems:'center',
          }}>
            <div>
              <div style={{ fontSize:'10px',color:'rgba(248,250,252,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.1em' }}>
                {t.planLabel}
              </div>
              <div style={{ fontSize:'17px',fontWeight:700,color:'#e2e8f0' }}>Trinity {planLabel}</div>
            </div>
            <div style={{ textAlign:isRtl?'left':'right' }}>
              <div style={{ fontSize:'10px',color:'rgba(248,250,252,0.35)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.1em' }}>
                {t.amountLabel}
              </div>
              <div style={{ fontSize:'26px',fontWeight:800,color:'#f59e0b',lineHeight:1 }}>
                ₪{paywallData.amount}
                <span style={{ fontSize:'12px',fontWeight:400,color:'rgba(248,250,252,0.35)',marginInlineStart:'4px' }}>
                  {t.monthly}
                </span>
              </div>
            </div>
          </div>

          {/* Waiting indicator */}
          {waiting && (
            <div style={{
              background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.18)',
              borderRadius:'12px',padding:'14px 18px',marginBottom:'16px',textAlign:'center',
            }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'4px' }}>
                <Loader2 size={14} color='#10b981' style={{ animation:'spin 1s linear infinite' }} />
                <span style={{ fontSize:'13px',fontWeight:600,color:'#10b981' }}>{t.waitTitle}</span>
              </div>
              <p style={{ fontSize:'11px',color:'rgba(248,250,252,0.4)',margin:0 }}>{t.waitDesc}</p>
            </div>
          )}

          {/* Pay button */}
          <button onClick={handlePay} disabled={loading} style={{
            width:'100%', padding:'15px 24px',
            background:loading?'rgba(245,158,11,0.25)':'linear-gradient(135deg,#f59e0b,#d97706)',
            border:'none', borderRadius:'14px', color:'#fff', fontSize:'15px', fontWeight:700,
            cursor:loading?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
            marginBottom:'10px', transition:'all 0.2s',
            boxShadow:loading?'none':'0 8px 24px rgba(245,158,11,0.28)',
            fontFamily:"'Rubik',sans-serif",
          }}>
            {loading
              ? <><Loader2 size={17} style={{ animation:'spin 1s linear infinite' }} />{t.paying}</>
              : <><ExternalLink size={17} />{t.payBtn}</>
            }
          </button>

          {/* Retry */}
          <button onClick={handleRetry} style={{
            width:'100%', padding:'11px 24px', background:'transparent',
            border:'1px solid rgba(255,255,255,0.09)', borderRadius:'12px',
            color:'rgba(248,250,252,0.4)', fontSize:'13px', cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',
            marginBottom:'24px', fontFamily:"'Rubik',sans-serif",
          }}>
            <RefreshCw size={13} />{t.retry}
          </button>

          {/* Support */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'22px' }}>
            <p style={{ fontSize:'11px',color:'rgba(248,250,252,0.3)',textAlign:'center',marginBottom:'12px' }}>
              {t.supportTitle}
            </p>
            <div style={{ display:'flex',gap:'10px' }}>
              <a href='https://wa.me/972544858586' target='_blank' rel='noopener noreferrer' style={{
                flex:1, padding:'11px 14px',
                background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.18)',
                borderRadius:'12px', color:'#25d366', fontSize:'13px', fontWeight:600,
                textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
              }}>
                <MessageCircle size={14} />{t.whatsapp}
              </a>
              <a href='https://t.me/ambersol_support' target='_blank' rel='noopener noreferrer' style={{
                flex:1, padding:'11px 14px',
                background:'rgba(0,136,204,0.08)', border:'1px solid rgba(0,136,204,0.18)',
                borderRadius:'12px', color:'#0088cc', fontSize:'13px', fontWeight:600,
                textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
              }}>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.54-.46.67-.93.42l-2.58-1.9-1.24 1.2c-.14.14-.25.25-.51.25l.18-2.61 4.73-4.27c.21-.18-.04-.28-.31-.1L7.87 14.4l-2.54-.79c-.55-.17-.56-.55.12-.82l9.92-3.83c.46-.17.86.11.27.84z'/>
                </svg>
                {t.telegram}
              </a>
            </div>
          </div>

          <div style={{ textAlign:'center',marginTop:'18px' }}>
            <button onClick={handleLogout} style={{
              background:'none',border:'none',color:'rgba(248,250,252,0.25)',
              fontSize:'12px',cursor:'pointer',
              display:'inline-flex',alignItems:'center',gap:'5px',
              fontFamily:"'Rubik',sans-serif",
            }}>
              <LogOut size={12} />{t.logout}
            </button>
          </div>
        </>}
      </div>

      <div style={{ marginTop:'22px',fontSize:'11px',color:'rgba(248,250,252,0.18)',display:'flex',alignItems:'center',gap:'6px' }}>
        <span style={{ width:'14px',height:'14px',background:'linear-gradient(135deg,#f59e0b,#6366f1)',borderRadius:'3px',display:'inline-block' }} />
        Trinity CRM · Amber Solutions
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
