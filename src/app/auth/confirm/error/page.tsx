export default function ConfirmError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#080c18', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 600, marginBottom: 12 }}>
          Ссылка недействительна
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 32 }}>
          Ссылка устарела или уже была использована. Попробуйте зарегистрироваться снова.
        </p>
        <a href="https://www.ambersol.co.il" style={{
          display: 'inline-block', padding: '12px 32px',
          background: '#f59e0b', color: '#080c18',
          borderRadius: 12, fontWeight: 600, fontSize: 15,
          textDecoration: 'none'
        }}>
          На главную →
        </a>
      </div>
    </div>
  )
}
