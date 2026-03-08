export default function PaymentFailedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      background: '#fef2f2',
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        maxWidth: '400px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#ef4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px',
          color: 'white'
        }}>✕</div>
        <h1 style={{ color: '#dc2626', fontSize: '28px', marginBottom: '12px' }}>
          התשלום נכשל
        </h1>
        <p style={{ color: '#4b5563', fontSize: '18px', marginBottom: '8px' }}>
          משהו השתבש עם התשלום שלך
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>
          אנא נסו שנית או פנו לבית העסק
        </p>
        <a href="javascript:history.back()" style={{
          background: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '16px'
        }}>
          חזרה
        </a>
      </div>
    </div>
  )
}
