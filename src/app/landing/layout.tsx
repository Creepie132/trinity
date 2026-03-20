/**
 * Landing layout — изолирован от RootLayout.
 * Не подключает ClientProviders / ModalManager / ChatWidget.
 *
 * FOUC Fix strategy:
 * 1. Critical CSS инлайново в <head> через <style> — применяется до JS
 * 2. Google Fonts через <link rel="preconnect"> + preload stylesheet
 * 3. Логотип — оптимизированный WebP 80px (5 КБ вместо 235 КБ PNG)
 * 4. Opacity trick: body{opacity:0} → 1 через микроскрипт после загрузки стилей
 *
 * Heebo (иврит RTL):
 * - Variable Font: один файл покрывает все веса 100–900
 * - Применяется ТОЛЬКО к [dir="rtl"] — кириллица не затронута
 * - letter-spacing: normal (иврит не любит разрядку)
 * - line-height: 1.55 (глифы Heebo чуть крупнее)
 */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trinity CRM — Система управления для вашего бизнеса',
  description: 'Trinity — нервная система вашего бизнеса. Клиенты, записи, аналитика и WhatsApp-напоминания в одном месте.',
  icons: { icon: '/trinity-logo.png' },
  openGraph: {
    title: 'Trinity CRM',
    description: 'Система управления для малого бизнеса · Израиль',
    images: ['/trinity-logo.png'],
  },
}

const CRITICAL_CSS = `
  /* === RESET === */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  /* === CSS VARIABLES === */
  :root {
    --cream: #FDFAF5; --cream-dark: #F5F0E8; --cream-mid: #EDE7D8;
    --amber: #D97706; --amber-light: #F59E0B; --amber-pale: #FEF3C7;
    --amber-glow: rgba(217,119,6,0.12); --navy: #1E2D4A; --navy-mid: #2D3E5C;
    --text: #1A1A2E; --text-mid: #4A5568; --text-light: #8896A8;
    --white: #FFFFFF; --border: rgba(217,119,6,0.15);
    --gutter: clamp(20px,5vw,80px);
    --shadow-sm: 0 2px 12px rgba(30,45,74,0.06);
    --shadow-md: 0 8px 32px rgba(30,45,74,0.10);
    --shadow-lg: 0 20px 60px rgba(30,45,74,0.14);
  }

  /* === BODY — фон сразу, без мигания белым === */
  html, body { min-height: unset !important; height: auto !important; }
  body {
    background: #FDFAF5;
    color: #1A1A2E;
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
    overflow-x: hidden;
    line-height: 1.65;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    /* Opacity trick: тело скрыто до готовности CSS */
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  body.css-ready { opacity: 1; }
  .page-root { display: contents; }

  /* === NAV — фиксированная высота сразу === */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px clamp(20px,4vw,60px);
    height: 72px;
    background: rgba(253,250,245,0.88);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(217,119,6,0.15);
  }

  /* === LOGO — фиксированные размеры, резервирует место === */
  .logo {
    display: flex; align-items: center; gap: 10px;
    font-size: 22px; font-weight: 600; color: #1E2D4A;
    text-decoration: none; letter-spacing: -0.3px;
  }
  .logo-img-wrap {
    width: 40px; height: 40px; min-width: 40px;
    border-radius: 50%; overflow: hidden;
    background: #000;
    display: flex; align-items: center; justify-content: center;
  }
  .logo-img-wrap img {
    width: 40px; height: 40px;
    object-fit: cover;
    mix-blend-mode: lighten;
    display: block;
  }

  /* === HERO === */
  .hero {
    min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: clamp(72px,8vw,120px) clamp(20px,5vw,80px) clamp(28px,4vw,60px);
    text-align: center; overflow: hidden; position: relative;
  }

  /* === TYPOGRAPHY LTR (RU) — шрифты с fallback === */
  h1 {
    font-family: 'Lora', Georgia, serif;
    font-size: clamp(32px,5vw,64px);
    font-weight: 600; line-height: 1.12;
    letter-spacing: -1.5px; color: #1E2D4A;
    margin-bottom: clamp(12px,2vw,24px);
  }
  h2 {
    font-family: 'Lora', Georgia, serif;
    font-size: clamp(28px,4vw,52px);
    font-weight: 600; line-height: 1.15;
    letter-spacing: -1px; color: #1E2D4A;
    margin-bottom: 20px;
  }

  /* ================================================================
     HEEBO — RTL/Hebrew typography
     Селективно: ТОЛЬКО [dir="rtl"], кириллица не затронута.
     Variable Font: один запрос покрывает все веса 300-700.
     ================================================================ */

  /* Базовый шрифт для всего RTL-контейнера */
  [dir="rtl"] {
    font-family: 'Heebo', sans-serif;
    font-weight: 400;
    line-height: 1.55;         /* глифы Heebo чуть крупнее кириллицы */
    letter-spacing: normal;    /* иврит не любит разрядку */
  }

  /* Заголовки RTL */
  [dir="rtl"] h1 {
    font-family: 'Heebo', sans-serif;
    font-weight: 700;
    line-height: 1.15;         /* заголовки компактнее */
    letter-spacing: normal;
  }
  [dir="rtl"] h2 {
    font-family: 'Heebo', sans-serif;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: normal;
  }
  [dir="rtl"] h3 {
    font-family: 'Heebo', sans-serif;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: normal;
  }

  /* Основной текст и описания */
  [dir="rtl"] p,
  [dir="rtl"] .section-sub,
  [dir="rtl"] .hero-sub,
  [dir="rtl"] .plan-usecase,
  [dir="rtl"] .testi-text {
    font-weight: 400;
    line-height: 1.65;
    letter-spacing: normal;
  }

  /* Второстепенные подписи — stat labels, meta-текст */
  [dir="rtl"] .stat-label,
  [dir="rtl"] .plan-period,
  [dir="rtl"] .testi-role,
  [dir="rtl"] .feature-tag,
  [dir="rtl"] .section-label {
    font-weight: 300;
    letter-spacing: 0.01em;    /* минимальная разрядка для мелкого текста */
  }

  /* Цифры в блоке статистики — читабельность через tabular-nums */
  [dir="rtl"] .stat-num {
    font-family: 'Heebo', sans-serif;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: normal;
  }

  /* Кнопки в RTL — увеличенный padding, иврит короче визуально */
  [dir="rtl"] .btn-primary,
  [dir="rtl"] .btn-secondary,
  [dir="rtl"] .btn-nav,
  [dir="rtl"] .btn-plan,
  [dir="rtl"] .btn-white {
    font-family: 'Heebo', sans-serif;
    font-weight: 600;
    letter-spacing: normal;
    padding-inline: clamp(28px,3.5vw,44px); /* шире чем LTR */
  }

  /* Nav links RTL */
  [dir="rtl"] .nav-links a,
  [dir="rtl"] .logo {
    font-family: 'Heebo', sans-serif;
    letter-spacing: normal;
  }

  /* Logo в RTL — убираем кернинг для иврита */
  [dir="rtl"] .logo {
    font-weight: 700;
    font-size: 21px; /* чуть меньше — Heebo визуально крупнее */
  }
`

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" dir="ltr">
      <head>
        {/* 1. Critical CSS — инлайново, применяется до JS и до загрузки шрифтов */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />

        {/* 2. Preconnect — DNS + TLS handshake для Google Fonts заранее */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* 3. Preload логотипа — браузер скачает его в первую очередь */}
        <link rel="preload" href="/trinity-logo-80.webp" as="image" type="image/webp" />

        {/* 4. Google Fonts с font-display=swap — текст не прыгает */}
        {/*
          Шрифты:
          - Manrope + Lora: кириллица (LTR, RU)
          - Heebo: иврит (RTL, HE) — Variable Font wght@300..700
            Один файл вместо четырёх = меньше запросов, быстрее в Ашкелоне и ТА
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Lora:wght@400;500;600&family=Heebo:wght@300..700&display=swap"
          rel="stylesheet"
        />

        {/* 5. Opacity trick — показываем body только когда стили готовы */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function showBody() {
              document.body && document.body.classList.add('css-ready');
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', showBody);
            } else {
              showBody();
            }
            // Failsafe: через 300ms показываем в любом случае
            setTimeout(showBody, 300);
          })();
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
