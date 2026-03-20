/**
 * Landing layout — изолирован от RootLayout.
 * Не подключает ClientProviders / ModalManager / ChatWidget.
 */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trinity CRM — Система управления для вашего бизнеса',
  description: 'Trinity CRM — всё что нужно малому бизнесу.',
  icons: { icon: '/trinity-logo.png' },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { min-height: unset !important; height: auto !important; }

        /* ── Critical above-the-fold styles — loaded before JS hydration ── */
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Lora:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        :root {
          --cream: #FDFAF5; --cream-dark: #F5F0E8; --cream-mid: #EDE7D8;
          --amber: #D97706; --amber-light: #F59E0B; --amber-pale: #FEF3C7;
          --amber-glow: rgba(217,119,6,0.12); --navy: #1E2D4A; --navy-mid: #2D3E5C;
          --text: #1A1A2E; --text-mid: #4A5568; --text-light: #8896A8;
          --white: #FFFFFF; --border: rgba(217,119,6,0.15);
          --space-xs: clamp(8px,1vw,12px); --space-sm: clamp(12px,2vw,20px);
          --space-md: clamp(20px,3vw,36px); --space-lg: clamp(36px,5vw,64px);
          --space-xl: clamp(56px,7vw,100px); --space-2xl: clamp(72px,9vw,140px);
          --container: 1440px; --container-inner: 1100px;
          --gutter: clamp(20px,5vw,80px);
          --shadow-sm: 0 2px 12px rgba(30,45,74,0.06);
          --shadow-md: 0 8px 32px rgba(30,45,74,0.10);
          --shadow-lg: 0 20px 60px rgba(30,45,74,0.14);
        }
        body {
          background: var(--cream); color: var(--text);
          font-family: 'Manrope', system-ui, sans-serif;
          overflow-x: hidden; line-height: 1.65;
          display: flex; flex-direction: column; min-height: 100dvh;
        }
        .page-root { display: contents; }
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px clamp(20px,4vw,60px);
          background: rgba(253,250,245,0.88); backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border); transition: box-shadow 0.3s;
        }
        .logo { display:flex; align-items:center; gap:10px; font-family:'Lora',serif; font-size:22px; font-weight:600; color:var(--navy); text-decoration:none; letter-spacing:-0.3px; }
        .hero {
          min-height: 100dvh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: clamp(72px,8vw,120px) var(--gutter) clamp(28px,4vw,60px);
          position: relative; text-align: center; overflow: hidden;
        }
        h1 { font-family:'Lora',serif; font-size:clamp(32px,5vw,64px); font-weight:600; line-height:1.12; letter-spacing:-1.5px; color:var(--navy); margin-bottom:clamp(12px,2vw,24px); }
        h2 { font-family:'Lora',serif; font-size:clamp(28px,4vw,52px); font-weight:600; line-height:1.15; letter-spacing:-1px; color:var(--navy); margin-bottom:20px; }
      `}</style>
      {children}
    </>
  )
}
