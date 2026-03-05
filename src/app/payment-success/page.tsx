export default function PaymentSuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      background: '#f0fdf4',
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
          background: '#22c55e',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px'
        }}>✓</div>
        <h1 style={{
          color: '#16a34a',
          fontSize: '28px',
          marginBottom: '12px'
        }}>
          תודה על התשלום! 🎉
        </h1>
        <p style={{
          color: '#4b5563',
          fontSize: '18px',
          marginBottom: '8px'
        }}>
          התשלום התקבל בהצלחה
        </p>
        <p style={{
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          תוכל לסגור את הדף
        </p>
      </div>
    </div>
  )
}
