'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [status, setStatus] = useState<'form'|'loading'|'success'|'error'>('form')
  const [errMsg, setErrMsg] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase вставляет токен в хэш URL (#access_token=...&type=recovery)
    // При загрузке страницы Supabase SDK автоматически читает хэш и устанавливает сессию
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true)
      } else {
        // Слушаем событие PASSWORD_RECOVERY
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session) {
            setSessionReady(true)
          }
        })
        return () => subscription.unsubscribe()
      }
    })
  }, [])

  const latinRe = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{};':",.<>/?`~ ]+$/

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg('')
    if (pass.length < 8) { setErrMsg('Пароль минимум 8 символов'); return }
    if (!latinRe.test(pass)) { setErrMsg('Только латинские буквы и цифры'); return }
    if (pass !== pass2) { setErrMsg('Пароли не совпадают'); return }
    setStatus('loading')
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) {
      setErrMsg(error.message)
      setStatus('form')
    } else {
      setStatus('success')
    }
  }

  const s: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#080c18', fontFamily: 'Inter, system-ui, sans-serif',
    backgroundImage: 'linear-gradient(rgba(245,158,11,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.04) 1px,transparent 1px)',
    backgroundSize: '60px 60px',
  }

  if (status === 'success') return (
    <div style={s}>
      <div style={{textAlign:'center',padding:'48px',maxWidth:440}}>
        <div style={{width:64,height:64,borderRadius:16,background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 style={{color:'#fff',fontSize:24,fontWeight:500,marginBottom:12}}>Пароль обновлён!</h1>
        <p style={{color:'rgba(255,255,255,0.45)',fontSize:15,lineHeight:1.6,marginBottom:32}}>
          Ваш пароль успешно изменён.<br/>Теперь вы можете войти в систему.
        </p>
        <a href="https://www.ambersol.co.il" style={{display:'inline-block',padding:'12px 32px',background:'#f59e0b',color:'#080c18',borderRadius:12,fontWeight:600,fontSize:15,textDecoration:'none'}}>
          Войти в систему →
        </a>
      </div>
    </div>
  )

  if (!sessionReady) return (
    <div style={s}>
      <div style={{textAlign:'center',padding:'48px'}}>
        <div style={{width:48,height:48,border:'2px solid rgba(245,158,11,0.3)',borderTopColor:'#f59e0b',borderRadius:'50%',margin:'0 auto 20px',animation:'spin 0.8s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>Проверяем ссылку...</p>
      </div>
    </div>
  )

  return (
    <div style={s}>
      <div style={{width:'100%',maxWidth:420,padding:'0 24px'}}>
        {/* Steps indicator */}
        <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:28}}>
          <div style={{width:20,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)'}}/>
          <div style={{width:36,height:4,borderRadius:2,background:'#f59e0b'}}/>
          <div style={{width:20,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)'}}/>
        </div>

        <h1 style={{color:'#fff',fontSize:22,fontWeight:500,textAlign:'center',marginBottom:8}}>
          Новый пароль
        </h1>
        <p style={{color:'rgba(255,255,255,0.38)',fontSize:13,textAlign:'center',lineHeight:1.6,marginBottom:24}}>
          Придумайте надёжный пароль от 8 символов
        </p>

        {/* Hint */}
        <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.14)',borderRadius:10,padding:'10px 13px',marginBottom:22}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span style={{color:'rgba(255,255,255,0.38)',fontSize:12,lineHeight:1.4}}>
            Только латинские буквы и цифры, минимум 8 символов
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,0.4)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:7}}>
              НОВЫЙ ПАРОЛЬ
            </div>
            <input
              type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="Минимум 8 символов" autoFocus
              style={{width:'100%',padding:'11px 14px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:14,background:'rgba(255,255,255,0.04)',color:'#fff',outline:'none',fontFamily:'inherit'}}
              onFocus={e=>{e.target.style.borderColor='rgba(245,158,11,0.5)';e.target.style.background='rgba(245,158,11,0.04)'}}
              onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.background='rgba(255,255,255,0.04)'}}
            />
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,0.4)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:7}}>
              ПОВТОРИТЕ ПАРОЛЬ
            </div>
            <input
              type="password" value={pass2} onChange={e=>setPass2(e.target.value)}
              placeholder="Повторите пароль"
              style={{width:'100%',padding:'11px 14px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:14,background:'rgba(255,255,255,0.04)',color:'#fff',outline:'none',fontFamily:'inherit'}}
              onFocus={e=>{e.target.style.borderColor='rgba(245,158,11,0.5)';e.target.style.background='rgba(245,158,11,0.04)'}}
              onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';e.target.style.background='rgba(255,255,255,0.04)'}}
            />
          </div>

          {/* Match indicator */}
          {pass2.length > 0 && (
            <div style={{fontSize:12,marginBottom:12,color:pass===pass2?'#4ade80':'#f87171',display:'flex',alignItems:'center',gap:6}}>
              {pass===pass2 ? '✓ Пароли совпадают' : '✗ Пароли не совпадают'}
            </div>
          )}

          {errMsg && <div style={{fontSize:12,color:'#f87171',marginBottom:12,textAlign:'center'}}>{errMsg}</div>}

          <button type="submit" disabled={status==='loading'}
            style={{width:'100%',padding:12,background:'#f59e0b',color:'#080c18',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:status==='loading'?'not-allowed':'pointer',opacity:status==='loading'?0.6:1,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {status==='loading' ? 'Сохранение...' : <>Сохранить пароль <span style={{opacity:0.5}}>→</span></>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080c18'}}>
        <div style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>Загрузка...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
