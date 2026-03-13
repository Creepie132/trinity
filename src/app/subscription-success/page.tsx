export default function SubscriptionSuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      direction: 'rtl',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxWidth: '440px',
        width: '100%',
      }}>
        <div style={{
          width: '88px', height: '88px',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: '44px',
          boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
        }}>✓</div>

        <div style={{
          fontSize: '13px', fontWeight: '600', color: '#6366f1',
          letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px',
        }}>Trinity CRM</div>

        <h1 style={{
          color: '#111827', fontSize: '26px', fontWeight: '700',
          marginBottom: '12px', lineHeight: '1.3',
        }}>המנוי הופעל בהצלחה! 🎉</h1>

        <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6', marginBottom: '8px' }}>
          החיוב החודשי הוגדר אוטומטית.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '32px', lineHeight: '1.5' }}>
          החיובים הבאים יבוצעו אוטומטית מדי חודש.
        </p>

        <div style={{ height: '1px', background: '#f3f4f6', marginBottom: '28px' }} />

        <a href="/dashboard" style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: 'white', padding: '14px 32px', borderRadius: '12px',
          textDecoration: 'none', fontWeight: '600', fontSize: '16px',
          boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
        }}>כניסה למערכת</a>

        <p style={{ color: '#d1d5db', fontSize: '12px', marginTop: '20px' }}>
          ניתן לסגור את הדף
        </p>
      </div>
    </div>
  )
}
