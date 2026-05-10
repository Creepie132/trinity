'use client'

import { useEffect } from 'react'
import { useLandingLang } from '@/contexts/LandingLangContext'

export default function LandingPage() {
  const { lang, setLang, t, dir, isRTL } = useLandingLang()
  useEffect(() => {
    const mainScroll = document.getElementById('main-scroll')

    // Сбрасываем <html dir> чтобы globals.css Trinity не применял Rubik ко всему лендингу
    const prevDir = document.documentElement.getAttribute('dir')
    const prevLang = document.documentElement.getAttribute('lang')
    document.documentElement.setAttribute('dir', 'ltr')
    document.documentElement.setAttribute('lang', 'ru')

    // Функция проверки видимости элемента в scrollable контейнере
    function isInView(el: Element): boolean {
      if (!mainScroll) return true
      const containerRect = mainScroll.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      return elRect.top < containerRect.bottom + 100 && elRect.bottom > containerRect.top - 100
    }

    // Показываем элементы которые сейчас видимы
    function revealVisible() {
      document.querySelectorAll('.reveal').forEach(el => {
        if (isInView(el)) el.classList.add('visible')
      })
    }

    // Сразу показываем всё видимое (hero всегда виден)
    const heroRevealTimer = setTimeout(revealVisible, 50)

    // Слушаем скролл в main-scroll контейнере
    const scrollHandler = () => revealVisible()
    if (mainScroll) mainScroll.addEventListener('scroll', scrollHandler, { passive: true })

    // Active section tracking
    const sectionIds = ['home', 'problems', 'features', 'how', 'security', 'pricing', 'reviews', 'contacts']
    const sidebarLinks = document.querySelectorAll<HTMLAnchorElement>('.sidebar-nav a[data-section]')
    const mobileLinks = document.querySelectorAll<HTMLAnchorElement>('.mobile-tabs a[data-section]')

    function setActive(id: string) {
      sidebarLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.section === id)
      })
      mobileLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.section === id)
      })
    }

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            setActive(entry.target.id)
          }
        })
      },
      { threshold: [0.25, 0.5], root: mainScroll ?? null }
    )

    sectionIds.forEach((id) => {
      const sec = document.getElementById(id)
      if (sec) sectionObserver.observe(sec)
    })

    // Smooth nav clicks
    const clickHandler = function (this: HTMLAnchorElement, e: Event) {
      const href = this.getAttribute('href')
      if (!href) return
      const target = document.querySelector(href)
      if (target) {
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
    anchors.forEach((a) => a.addEventListener('click', clickHandler))

    return () => {
      clearTimeout(heroRevealTimer)
      if (mainScroll) mainScroll.removeEventListener('scroll', scrollHandler)
      sectionObserver.disconnect()
      anchors.forEach((a) => a.removeEventListener('click', clickHandler))
      // Восстанавливаем html attrs
      if (prevDir) document.documentElement.setAttribute('dir', prevDir)
      else document.documentElement.removeAttribute('dir')
      if (prevLang) document.documentElement.setAttribute('lang', prevLang)
    }
  }, [])

  return (
    <div dir={dir} className={isRTL ? 'landing-rtl' : ''}>
      <style>{`
/* Нет переопределений Trinity — layout уже изолирован через route group (marketing) */
/* Сброс RTL от Trinity root layout — лендинг всегда LTR на уровне html */
html, html[dir="rtl"] {
  direction: ltr !important;
  font-family: 'Inter', sans-serif !important;
}
/* Переопределяем Rubik который Trinity globals.css навязывает через [dir=rtl] * */
html[dir="rtl"] * {
  font-family: 'Inter', sans-serif !important;
}
body {
  direction: ltr !important;
  font-family: 'Inter', sans-serif !important;
  overflow: hidden !important;
  background: #080810 !important;
  color: #fff !important;
  margin: 0 !important;
  padding: 0 !important;
}
/* КРИТИЧНО: JS чанки могут не грузиться (кэш CDN).
   Показываем .reveal элементы сразу через CSS — анимация через animation, не JS-класс */
.reveal {
  opacity: 1 !important;
  transform: none !important;
}
.reveal.visible {
  opacity: 1 !important;
  transform: none !important;
}
/* Принудительно белый цвет всем заголовкам и текстовым элементам — защита от Trinity light-theme */
main h1, main h2, main h3, main h4, main h5, main h6,
main p, main div, main span, main li, main blockquote, main a {
  color: inherit;
}
main h1, main h2, main h3, main h4 {
  color: #fff !important;
}
/* Hero h1 имеет свой градиент — НЕ перезаписываем */
.hero h1 {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}
/* ======================================================================== */

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #080810;
  --surface: #111118;
  --surface-alt: #0f0f16;
  --white: #fff;
  --muted: rgba(255,255,255,.4);
  --gold: #C8881A;
  --gold-glow: rgba(200,136,26,.25);
  --sidebar-w: 80px;
  --sidebar-expanded: 240px;
  --red-accent: #e74c3c;
  --green-accent: #2ecc71;
}

html {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--white);
  scroll-behavior: smooth;
}

body {
  overflow: hidden;
  background: var(--bg);
  font-family: 'Inter', sans-serif;
}

/* ===== SIDEBAR ===== */
.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: rgba(8,8,16,.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: width .35s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

.sidebar:hover {
  width: var(--sidebar-expanded);
}

.sidebar-logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 80px;
  flex-shrink: 0;
  width: var(--sidebar-expanded);
}

.sidebar-logo img {
  width: 40px; height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar-logo span {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transition: opacity .25s;
}

.sidebar:hover .sidebar-logo span { opacity: 1; }

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 0;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sidebar-nav::-webkit-scrollbar {
  display: none;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  text-decoration: none;
  color: var(--muted);
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  position: relative;
  transition: color .2s, background .2s;
  width: var(--sidebar-expanded);
}

.sidebar-nav a:hover {
  color: var(--white);
  background: rgba(255,255,255,.04);
}

.sidebar-nav a.active {
  color: var(--gold);
}

.sidebar-nav a.active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: var(--gold);
  border-radius: 0 3px 3px 0;
  transition: top .3s cubic-bezier(.4,0,.2,1);
}

.sidebar-nav a svg {
  width: 22px; height: 22px;
  flex-shrink: 0;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
}

.sidebar-nav a span {
  opacity: 0;
  transition: opacity .25s;
}

.sidebar:hover .sidebar-nav a span { opacity: 1; }

.sidebar-bottom {
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  width: var(--sidebar-expanded);
}

.sidebar-bottom a {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--gold);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.sidebar-bottom .lang-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity .25s;
}
.sidebar:hover .sidebar-bottom .lang-switcher { opacity: 1; }

.lang-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,.12);
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all .2s;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.05em;
}
.lang-btn:hover { color: var(--white); border-color: rgba(255,255,255,.3); }
.lang-btn.active { color: var(--gold); border-color: var(--gold); background: rgba(200,136,26,.08); }

.sidebar-bottom a span {
  opacity: 0;
  transition: opacity .25s;
}
.sidebar:hover .sidebar-bottom a span { opacity: 1; }

/* RTL support */
.landing-rtl {
  direction: rtl;
}
.landing-rtl .sidebar {
  left: auto;
  right: 0;
  border-right: none;
  border-left: 1px solid rgba(255,255,255,.06);
}
.landing-rtl .main-scroll {
  margin-left: 0;
  margin-right: var(--sidebar-w);
}
.landing-rtl .sidebar-nav a.active::before {
  left: auto;
  right: 0;
  border-radius: 3px 0 0 3px;
}
.landing-rtl .steps-container::before {
  background: linear-gradient(270deg, var(--gold), rgba(200,136,26,.2));
}
.landing-rtl .mobile-tabs {
  direction: rtl;
}
@media (max-width: 1024px) {
  .landing-rtl .main-scroll {
    margin-left: 0;
    margin-right: 60px;
  }
}
@media (max-width: 768px) {
  .landing-rtl .main-scroll {
    margin-right: 0;
  }
}

/* ===== MAIN SCROLL CONTAINER ===== */
.main-scroll {
  margin-left: var(--sidebar-w);
  height: 100vh;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.snap-section {
  min-height: 100vh;
  position: relative;
  overflow: visible;
}

.no-snap {
  min-height: auto;
}

/* ===== HERO ===== */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 40px 40px;
  position: relative;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(30,20,60,.8) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 70% 30%, rgba(200,136,26,.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 50% at 20% 70%, rgba(20,20,60,.6) 0%, transparent 50%);
  animation: meshMove 12s ease-in-out infinite alternate;
}

@keyframes meshMove {
  0% { transform: scale(1) translate(0,0); }
  50% { transform: scale(1.05) translate(-1%,2%); }
  100% { transform: scale(1) translate(1%,-1%); }
}

.hero-particles {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 2px; height: 2px;
  background: var(--gold);
  border-radius: 50%;
  opacity: 0;
  animation: particleFade 4s ease-in-out infinite;
}

.particle:nth-child(1) { left: 20%; top: 30%; animation-delay: 0s; }
.particle:nth-child(2) { left: 70%; top: 20%; animation-delay: .8s; }
.particle:nth-child(3) { left: 40%; top: 60%; animation-delay: 1.6s; }
.particle:nth-child(4) { left: 80%; top: 50%; animation-delay: 2.4s; }
.particle:nth-child(5) { left: 15%; top: 70%; animation-delay: 3.2s; }
.particle:nth-child(6) { left: 55%; top: 15%; animation-delay: 1s; width: 3px; height: 3px; }
.particle:nth-child(7) { left: 90%; top: 40%; animation-delay: 2s; }
.particle:nth-child(8) { left: 35%; top: 85%; animation-delay: 0.5s; }

@keyframes particleFade {
  0%, 100% { opacity: 0; transform: translateY(0); }
  50% { opacity: .6; transform: translateY(-20px); }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 28px;
}

.hero h1 {
  font-size: clamp(44px, 6vw, 80px);
  font-weight: 300;
  line-height: 1.1;
  background: linear-gradient(180deg, #ffffff 30%, rgba(255,255,255,.45) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
}

.hero-subtitle {
  font-size: clamp(16px, 1.8vw, 20px);
  font-weight: 300;
  color: rgba(255,255,255,.6);
  line-height: 1.7;
  max-width: 640px;
  margin: 0 auto 40px;
}

.hero-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

.btn-gold {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: var(--gold);
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  transition: transform .2s, box-shadow .2s;
}

.btn-gold:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--gold-glow);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: transparent;
  color: var(--white);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  transition: border-color .2s, background .2s;
}

.btn-ghost:hover {
  border-color: rgba(255,255,255,.35);
  background: rgba(255,255,255,.04);
}

.hero-stats {
  display: flex;
  gap: 40px;
  justify-content: center;
  flex-wrap: wrap;
}

.hero-stat {
  text-align: center;
}

.hero-stat .val {
  font-size: 22px;
  font-weight: 600;
  color: var(--white);
}

.hero-stat .label {
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
}

.hero-stat + .hero-stat {
  padding-left: 40px;
  border-left: 1px solid rgba(255,255,255,.1);
}

.scroll-chevron {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  animation: bounce 2s ease-in-out infinite;
}

.scroll-chevron svg {
  width: 28px; height: 28px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 2;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

/* ===== INDUSTRIES STRIP ===== */
.industries-strip {
  padding: 40px 0;
  overflow: hidden;
  border-top: 1px solid rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.04);
}

.industries-strip h3 {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.marquee-track {
  display: flex;
  gap: 16px;
  animation: marqueeScroll 30s linear infinite;
  width: max-content;
}

.marquee-track:hover {
  animation-play-state: paused;
}

@keyframes marqueeScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.industry-pill {
  padding: 10px 22px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 100px;
  font-size: 14px;
  color: rgba(255,255,255,.65);
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color .2s, color .2s;
}

.industry-pill:hover {
  border-color: var(--gold);
  color: var(--gold);
}

/* ===== PAIN POINTS ===== */
.pain-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
}

.section-heading {
  text-align: center;
  margin-bottom: 16px;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 600;
}

.section-subtitle {
  text-align: center;
  color: var(--muted);
  font-size: 16px;
  font-weight: 300;
  max-width: 560px;
  margin: 0 auto 56px;
  line-height: 1.6;
}

.pain-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1100px;
  width: 100%;
}

.pain-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 32px;
  border-left: 3px solid var(--red-accent);
  transition: transform .25s, box-shadow .25s;
}

.pain-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,.4);
}

.pain-card .icon {
  font-size: 28px;
  margin-bottom: 16px;
}

.pain-card h4 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}

.pain-card p {
  font-size: 14px;
  color: rgba(255,255,255,.55);
  line-height: 1.65;
}

/* ===== BENTO FEATURES ===== */
.features-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  gap: 20px;
  max-width: 1100px;
  width: 100%;
  grid-template-areas:
    "whatsapp whatsapp clients diary"
    "analytics analytics stock payments";
}

.bento-card {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 16px;
  padding: 28px;
  position: relative;
  overflow: hidden;
  transition: transform .25s, border-color .3s;
}

.bento-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--gold);
  opacity: 0;
  transition: opacity .3s;
}

.bento-card:hover {
  transform: translateY(-3px);
  border-color: rgba(200,136,26,.2);
}

.bento-card:hover::before { opacity: 1; }

.bento-card.whatsapp { grid-area: whatsapp; }
.bento-card.clients { grid-area: clients; }
.bento-card.diary { grid-area: diary; }
.bento-card.analytics { grid-area: analytics; }
.bento-card.stock { grid-area: stock; }
.bento-card.payments { grid-area: payments; }

.bento-card .icon { font-size: 24px; margin-bottom: 12px; }

.bento-card h4 {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 8px;
}

.bento-card p {
  font-size: 14px;
  color: rgba(255,255,255,.55);
  line-height: 1.6;
  margin-bottom: 16px;
}

.bento-tag {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 100px;
  background: rgba(200,136,26,.12);
  color: var(--gold);
  font-size: 12px;
  font-weight: 500;
}

.mini-chat {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
}

.chat-bubble.incoming {
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.7);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.chat-bubble.outgoing {
  background: rgba(37,211,102,.15);
  color: rgba(255,255,255,.8);
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 60px;
  margin-top: 16px;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(to top, var(--gold), rgba(200,136,26,.3));
  border-radius: 4px 4px 0 0;
}

/* ===== HOW IT WORKS ===== */
.how-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
}

.steps-container {
  display: flex;
  gap: 0;
  max-width: 1100px;
  width: 100%;
  position: relative;
}

.steps-container::before {
  content: '';
  position: absolute;
  top: 36px;
  left: 60px;
  right: 60px;
  height: 2px;
  background: linear-gradient(90deg, var(--gold), rgba(200,136,26,.2));
}

.step-card {
  flex: 1;
  text-align: center;
  padding: 0 20px;
  position: relative;
}

.step-num {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--gold);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gold);
  position: relative;
  z-index: 1;
}

.step-card h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}

.step-card p {
  font-size: 14px;
  color: rgba(255,255,255,.5);
  line-height: 1.6;
}

/* ===== SECURITY ===== */
.security-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
}

.security-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 800px;
  width: 100%;
}

.security-card {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 16px;
  padding: 28px;
  border-left: 3px solid rgba(46,204,113,.3);
  transition: transform .25s;
}

.security-card:hover {
  transform: translateY(-3px);
}

.security-card .icon { font-size: 26px; margin-bottom: 12px; }

.security-card h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.security-card p {
  font-size: 14px;
  color: rgba(255,255,255,.5);
  line-height: 1.6;
}

/* ===== PRICING ===== */
.pricing-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px 120px;
  overflow: visible;
  isolation: auto;
  clip-path: none !important;
}

.pricing-scroll {
  display: flex;
  gap: 20px;
  max-width: 1100px;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 24px;
  padding-top: 12px;
}

.pricing-scroll::-webkit-scrollbar { height: 4px; }
.pricing-scroll::-webkit-scrollbar-track { background: transparent; }
.pricing-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

.pricing-card {
  flex: 1;
  min-width: 240px;
  background: var(--surface);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 16px;
  padding: 32px 28px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  transition: transform .3s cubic-bezier(.4,0,.2,1), box-shadow .3s;
  position: relative;
  margin: 8px 0 16px;
}

.pricing-card::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: 10%;
  right: 10%;
  height: 60px;
  background: radial-gradient(ellipse at center, rgba(255,255,255,.06) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  transition: opacity .3s;
  pointer-events: none;
  filter: blur(8px);
}

.pricing-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.4);
}

.pricing-card:hover::after {
  opacity: 1;
}

.pricing-card.featured {
  border-color: var(--gold);
  box-shadow: 0 0 32px rgba(200,136,26,.12), 0 4px 16px rgba(200,136,26,.08);
}

.pricing-card.featured::after {
  background: radial-gradient(ellipse at center, rgba(200,136,26,.2) 0%, transparent 70%);
}

.pricing-card.featured:hover {
  box-shadow: 0 20px 60px rgba(0,0,0,.6), 0 8px 32px rgba(200,136,26,.2);
}

.pricing-badge {
  display: inline-block;
  align-self: flex-start;
  background: var(--gold);
  color: #000;
  padding: 4px 14px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  margin-bottom: 12px;
}

.pricing-card h4 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #fff !important;
}

.pricing-price {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #fff !important;
}

.pricing-price span {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255,255,255,.4) !important;
}

.pricing-period {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 24px;
}

.pricing-features {
  list-style: none;
  margin-bottom: 28px;
  flex: 1;
}

.pricing-features li {
  padding: 6px 0;
  font-size: 14px;
  color: rgba(255,255,255,.65);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-features li::before {
  content: '\\2713';
  color: var(--gold);
  font-weight: 700;
  font-size: 13px;
}

.pricing-card .btn-gold,
.pricing-card .btn-ghost {
  width: 100%;
  justify-content: center;
  padding: 12px 24px;
}

/* ===== REVIEWS ===== */
.reviews-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
}

.reviews-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 900px;
  width: 100%;
}

.review-card {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 16px;
  padding: 32px;
  position: relative;
}

.review-card .quote-mark {
  font-size: 64px;
  line-height: 1;
  color: rgba(200,136,26,.15);
  font-family: Georgia, serif;
  position: absolute;
  top: 16px;
  left: 24px;
}

.review-stars {
  color: var(--gold);
  font-size: 16px;
  margin-bottom: 16px;
  letter-spacing: 2px;
}

.review-card blockquote {
  font-size: 15px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(255,255,255,.75);
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.review-author {
  font-size: 14px;
  font-weight: 600;
}

.review-role {
  font-size: 13px;
  color: var(--muted);
}

/* ===== CTA + CONTACTS ===== */
.contacts-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px 80px;
}
@media (max-width: 768px) {
  .contacts-section {
    padding: 60px 20px 100px;
  }
}

.cta-block {
  text-align: center;
  max-width: 700px;
  margin-bottom: 60px;
}

.cta-block h2 {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 600;
  margin-bottom: 16px;
}

.cta-block p {
  font-size: 16px;
  color: var(--muted);
  margin-bottom: 32px;
  line-height: 1.6;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.contact-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  max-width: 900px;
  width: 100%;
}

.contact-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  color: rgba(255,255,255,.65);
}

.contact-item svg {
  width: 20px; height: 20px;
  stroke: var(--gold);
  fill: none;
  stroke-width: 1.5;
  flex-shrink: 0;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-form input,
.contact-form textarea {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,.15);
  padding: 12px 0;
  font-size: 14px;
  color: var(--white);
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color .2s;
}

.contact-form input:focus,
.contact-form textarea:focus {
  border-bottom-color: var(--gold);
}

.contact-form input::placeholder,
.contact-form textarea::placeholder {
  color: var(--muted);
}

.contact-form textarea {
  resize: vertical;
  min-height: 80px;
}

.contact-form button {
  align-self: flex-start;
}

/* ===== FOOTER ===== */
.footer {
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--muted);
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-links a {
  color: var(--muted);
  text-decoration: none;
  transition: color .2s;
}

.footer-links a:hover { color: var(--white); }

/* ===== MOBILE BOTTOM TAB BAR ===== */
.mobile-tabs {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: rgba(8,8,16,.97);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,.06);
  z-index: 1000;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
}

.mobile-tabs-inner {
  display: flex;
  justify-content: space-around;
}

.mobile-tabs a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--muted);
  font-size: 10px;
  padding: 4px 8px;
  transition: color .2s;
}

.mobile-tabs a.active { color: var(--gold); }

.mobile-tabs a svg {
  width: 22px; height: 22px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
}

/* ===== FADE-UP REVEAL ===== */
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity .7s cubic-bezier(.4,0,.2,1), transform .7s cubic-bezier(.4,0,.2,1);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

.reveal-delay-1 { transition-delay: .1s; }
.reveal-delay-2 { transition-delay: .2s; }
.reveal-delay-3 { transition-delay: .3s; }
.reveal-delay-4 { transition-delay: .35s; }
.reveal-delay-5 { transition-delay: .4s; }
.reveal-delay-6 { transition-delay: .5s; }

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  .sidebar { width: 60px; }
  .sidebar:hover { width: 60px; }
  .sidebar .sidebar-nav a span,
  .sidebar .sidebar-logo span,
  .sidebar .sidebar-bottom a span,
  .sidebar .sidebar-bottom .lang-toggle span {
    display: none;
  }
  .main-scroll { margin-left: 60px; }
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas:
      "whatsapp whatsapp"
      "clients diary"
      "analytics analytics"
      "stock payments";
  }
  .pricing-card { min-width: 220px; }
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-tabs { display: block; }

  .main-scroll {
    margin-left: 0;
    padding-bottom: 72px;
  }

  .snap-section {
    min-height: auto;
  }

  .hero {
    min-height: 100vh;
    min-height: 100svh;
    padding: 40px 20px;
  }

  .hero-stats { gap: 20px; }
  .hero-stat + .hero-stat { padding-left: 20px; }
  .pain-grid { grid-template-columns: 1fr; }

  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "whatsapp"
      "clients"
      "diary"
      "analytics"
      "stock"
      "payments";
  }

  .steps-container {
    flex-direction: column;
    gap: 32px;
    padding-left: 40px;
  }

  .steps-container::before {
    top: 0;
    bottom: 0;
    left: 24px;
    right: auto;
    width: 2px;
    height: auto;
  }

  .step-card {
    text-align: left;
    padding: 0;
  }

  .step-num {
    position: absolute;
    left: -40px;
    margin: 0;
  }

  .security-grid { grid-template-columns: 1fr; }
  .pricing-card { min-width: 280px; }
  .reviews-grid { grid-template-columns: 1fr; }

  .contact-area {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .features-section,
  .how-section,
  .security-section,
  .pricing-section,
  .reviews-section,
  .contacts-section,
  .pain-section {
    padding: 60px 20px;
  }

  .footer {
    flex-direction: column;
    text-align: center;
    padding: 24px 20px;
  }
}
      `}</style>

      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/trinity-logo-80.webp" alt="Trinity CRM" />
          <span>Trinity</span>
        </div>
        <nav className="sidebar-nav">
          <a href="#home" className="active" data-section="home">
            <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
            <span>{t('nav.home')}</span>
          </a>
          <a href="#features" data-section="features">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>{t('nav.features')}</span>
          </a>
          <a href="#pricing" data-section="pricing">
            <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span>{t('nav.pricing')}</span>
          </a>
          <a href="#how" data-section="how">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{t('nav.how')}</span>
          </a>
          <a href="#security" data-section="security">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>{t('nav.security')}</span>
          </a>
          <a href="#reviews" data-section="reviews">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{t('nav.reviews')}</span>
          </a>
          <a href="#contacts" data-section="contacts">
            <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>{t('nav.contacts')}</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a href="/login">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span>{t('nav.login')}</span>
          </a>
          <div className="lang-switcher">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--muted)" fill="none" strokeWidth="1.5" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg>
            <button className={`lang-btn${lang==='ru'?' active':''}`} onClick={()=>setLang('ru')}>RU</button>
            <button className={`lang-btn${lang==='en'?' active':''}`} onClick={()=>setLang('en')}>EN</button>
            <button className={`lang-btn${lang==='he'?' active':''}`} onClick={()=>setLang('he')}>עב</button>
          </div>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="mobile-tabs">
        <div className="mobile-tabs-inner">
          <a href="#home" className="active" data-section="home">
            <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
            {t('nav.home')}
          </a>
          <a href="#features" data-section="features">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            {t('nav.features')}
          </a>
          <a href="#pricing" data-section="pricing">
            <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            {t('nav.pricing')}
          </a>
          <a href="#reviews" data-section="reviews">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {t('nav.reviews')}
          </a>
          <a href="#contacts" data-section="contacts">
            <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {t('nav.contacts')}
          </a>
          {/* Mobile lang switcher */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'4px 6px'}}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--muted)" fill="none" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg>
            <div style={{display:'flex',gap:3}}>
              <button className={`lang-btn${lang==='ru'?' active':''}`} style={{padding:'2px 5px',fontSize:9}} onClick={()=>setLang('ru')}>RU</button>
              <button className={`lang-btn${lang==='en'?' active':''}`} style={{padding:'2px 5px',fontSize:9}} onClick={()=>setLang('en')}>EN</button>
              <button className={`lang-btn${lang==='he'?' active':''}`} style={{padding:'2px 5px',fontSize:9}} onClick={()=>setLang('he')}>עב</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="main-scroll" id="main-scroll">

        {/* HERO */}
        <section className="snap-section hero" id="home">
          <div className="hero-bg" />
          <div className="hero-particles">
            <div className="particle" />
            <div className="particle" />
            <div className="particle" />
            <div className="particle" />
            <div className="particle" />
            <div className="particle" />
            <div className="particle" />
            <div className="particle" />
          </div>
          <div className="hero-content">
            <div className="hero-eyebrow reveal">{t('hero.eyebrow')}</div>
            <h1 className="reveal reveal-delay-1">{t('hero.h1')}</h1>
            <p className="hero-subtitle reveal reveal-delay-2">{t('hero.subtitle')}</p>

            <div className="hero-buttons reveal reveal-delay-3">
              <a href="/demo/register" className="btn-gold">{t('hero.cta')}</a>
              <a href="#features" className="btn-ghost">{t('hero.cta2')}</a>
            </div>
            <div className="hero-stats reveal reveal-delay-4">
              <div className="hero-stat">
                <div className="val">{t('hero.stat1.val')}</div>
                <div className="label">{t('hero.stat1.lbl')}</div>
              </div>
              <div className="hero-stat">
                <div className="val">{t('hero.stat2.val')}</div>
                <div className="label">{t('hero.stat2.lbl')}</div>
              </div>
              <div className="hero-stat">
                <div className="val">{t('hero.stat3.val')}</div>
                <div className="label">{t('hero.stat3.lbl')}</div>
              </div>
            </div>
          </div>
          <div className="scroll-chevron">
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </section>

        {/* INDUSTRIES STRIP */}
        <section className="no-snap industries-strip">
          <h3>{t('industries.title')}</h3>
          <div className="marquee-track">
            {[0,1,2,3,4,5,6,7,0,1,2,3,4,5,6,7].map((i, idx) => (
              <div key={idx} className="industry-pill">{t(`industries.${i}`)}</div>
            ))}
          </div>
        </section>

        {/* PAIN POINTS */}
        <section className="snap-section pain-section" id="problems">
          <h2 className="section-heading reveal">{t('pain.heading')}</h2>
          <div className="pain-grid">
            <div className="pain-card reveal reveal-delay-1">
              <div className="icon">📋</div>
              <h4>{t('pain.1.title')}</h4>
              <p>{t('pain.1.text')}</p>
            </div>
            <div className="pain-card reveal reveal-delay-2">
              <div className="icon">📵</div>
              <h4>{t('pain.2.title')}</h4>
              <p>{t('pain.2.text')}</p>
            </div>
            <div className="pain-card reveal reveal-delay-3">
              <div className="icon">📊</div>
              <h4>{t('pain.3.title')}</h4>
              <p>{t('pain.3.text')}</p>
            </div>
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section className="snap-section features-section" id="features">
          <div className="section-heading reveal">{t('features.heading')}</div>
          <p className="section-subtitle reveal reveal-delay-1">{t('features.subtitle')}</p>
          <div className="bento-grid">
            <div className="bento-card whatsapp reveal reveal-delay-1">
              <div className="icon">💬</div>
              <h4>{t('features.wa.title')}</h4>
              <p>{t('features.wa.text')}</p>
              <div className="bento-tag">{t('features.wa.tag')}</div>
              <div className="mini-chat">
                <div className="chat-bubble outgoing">{t('features.wa.chat1')}</div>
                <div className="chat-bubble incoming">{t('features.wa.chat2')}</div>
                <div className="chat-bubble outgoing">{t('features.wa.chat3')}</div>
              </div>
            </div>

            <div className="bento-card clients reveal reveal-delay-2">
              <div className="icon">👥</div>
              <h4>{t('features.cl.title')}</h4>
              <p>{t('features.cl.text')}</p>
              <div className="bento-tag">{t('features.cl.tag')}</div>
            </div>
            <div className="bento-card diary reveal reveal-delay-3">
              <div className="icon">📅</div>
              <h4>{t('features.di.title')}</h4>
              <p>{t('features.di.text')}</p>
              <div className="bento-tag">{t('features.di.tag')}</div>
            </div>

            <div className="bento-card analytics reveal reveal-delay-4">
              <div className="icon">📈</div>
              <h4>{t('features.an.title')}</h4>
              <p>{t('features.an.text')}</p>
              <div className="bento-tag">{t('features.an.tag')}</div>
              <div className="mini-chart">
                <div className="chart-bar" style={{ height: '35%' }} />
                <div className="chart-bar" style={{ height: '55%' }} />
                <div className="chart-bar" style={{ height: '45%' }} />
                <div className="chart-bar" style={{ height: '70%' }} />
                <div className="chart-bar" style={{ height: '60%' }} />
                <div className="chart-bar" style={{ height: '85%' }} />
                <div className="chart-bar" style={{ height: '75%' }} />
                <div className="chart-bar" style={{ height: '95%' }} />
                <div className="chart-bar" style={{ height: '80%' }} />
                <div className="chart-bar" style={{ height: '65%' }} />
              </div>
            </div>

            <div className="bento-card stock reveal reveal-delay-5">
              <div className="icon">📦</div>
              <h4>{t('features.st.title')}</h4>
              <p>{t('features.st.text')}</p>
              <div className="bento-tag">{t('features.st.tag')}</div>
            </div>
            <div className="bento-card payments reveal reveal-delay-6">
              <div className="icon">💰</div>
              <h4>{t('features.pa.title')}</h4>
              <p>{t('features.pa.text')}</p>
              <div className="bento-tag">{t('features.pa.tag')}</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="snap-section how-section" id="how">
          <h2 className="section-heading reveal">{t('how.heading')}</h2>
          <p className="section-subtitle reveal reveal-delay-1">{t('how.subtitle')}</p>
          <div className="steps-container">
            <div className="step-card reveal reveal-delay-1">
              <div className="step-num">01</div>
              <h4>{t('how.1.title')}</h4>
              <p>{t('how.1.text')}</p>
            </div>
            <div className="step-card reveal reveal-delay-2">
              <div className="step-num">02</div>
              <h4>{t('how.2.title')}</h4>
              <p>{t('how.2.text')}</p>
            </div>
            <div className="step-card reveal reveal-delay-3">
              <div className="step-num">03</div>
              <h4>{t('how.3.title')}</h4>
              <p>{t('how.3.text')}</p>
            </div>
            <div className="step-card reveal reveal-delay-4">
              <div className="step-num">04</div>
              <h4>{t('how.4.title')}</h4>
              <p>{t('how.4.text')}</p>
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section className="snap-section security-section" id="security">
          <h2 className="section-heading reveal">{t('security.heading')}</h2>
          <p className="section-subtitle reveal reveal-delay-1">{t('security.subtitle')}</p>
          <div className="security-grid">
            <div className="security-card reveal reveal-delay-1">
              <div className="icon">🔐</div>
              <h4>{t('security.1.title')}</h4>
              <p>{t('security.1.text')}</p>
            </div>
            <div className="security-card reveal reveal-delay-2">
              <div className="icon">💾</div>
              <h4>{t('security.2.title')}</h4>
              <p>{t('security.2.text')}</p>
            </div>
            <div className="security-card reveal reveal-delay-3">
              <div className="icon">🇮🇱</div>
              <h4>{t('security.3.title')}</h4>
              <p>{t('security.3.text')}</p>
            </div>
            <div className="security-card reveal reveal-delay-4">
              <div className="icon">🚫</div>
              <h4>{t('security.4.title')}</h4>
              <p>{t('security.4.text')}</p>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="snap-section pricing-section" id="pricing">
          <h2 className="section-heading reveal">{t('pricing.heading')}</h2>
          <p className="section-subtitle reveal reveal-delay-1">{t('pricing.subtitle')}</p>
          <div className="pricing-scroll reveal reveal-delay-2">
            <div className="pricing-card">
              <h4>Base</h4>
              <div className="pricing-price">₪199 <span>{t('pricing.period')}</span></div>
              <div className="pricing-period" />
              <ul className="pricing-features">
                <li>{t('pricing.base.1')}</li>
                <li>{t('pricing.base.2')}</li>
                <li>{t('pricing.base.3')}</li>
                <li>{t('pricing.base.4')}</li>
              </ul>
              <a href="#contacts" className="btn-ghost">{t('pricing.cta.select')}</a>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">{t('pricing.badge.recommended')}</div>
              <h4>Pro</h4>
              <div className="pricing-price">₪249 <span>{t('pricing.period')}</span></div>
              <div className="pricing-period" />
              <ul className="pricing-features">
                <li>{t('pricing.pro.1')}</li>
                <li>{t('pricing.pro.2')}</li>
                <li>{t('pricing.pro.3')}</li>
                <li>{t('pricing.pro.4')}</li>
              </ul>
              <a href="#contacts" className="btn-gold">{t('pricing.cta.select')}</a>
            </div>

            <div className="pricing-card">
              <div className="pricing-badge" style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }}>{t('pricing.badge.business')}</div>
              <h4>Enterprise</h4>
              <div className="pricing-price">₪499 <span>{t('pricing.period')}</span></div>
              <div className="pricing-period" />
              <ul className="pricing-features">
                <li>{t('pricing.enterprise.1')}</li>
                <li>{t('pricing.enterprise.2')}</li>
                <li>{t('pricing.enterprise.3')}</li>
                <li>{t('pricing.enterprise.4')}</li>
              </ul>
              <a href="#contacts" className="btn-ghost">{t('pricing.cta.select')}</a>
            </div>
            <div className="pricing-card">
              <h4>{t('pricing.custom.title')}</h4>
              <div className="pricing-price">{t('pricing.custom.price')}</div>
              <div className="pricing-period" />
              <ul className="pricing-features">
                <li>{t('pricing.custom.1')}</li>
                <li>{t('pricing.custom.2')}</li>
                <li>{t('pricing.custom.3')}</li>
                <li>{t('pricing.custom.4')}</li>
              </ul>
              <a href="#contacts" className="btn-ghost">{t('pricing.cta.select')}</a>
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section className="snap-section reviews-section" id="reviews">
          <h2 className="section-heading reveal">{t('reviews.heading')}</h2>
          <p className="section-subtitle reveal reveal-delay-1">{t('reviews.subtitle')}</p>
          <div className="reviews-grid">
            <div className="review-card reveal reveal-delay-2">
              <div className="quote-mark">&#8220;</div>
              <div className="review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <blockquote>{t('reviews.1.text')}</blockquote>
              <div className="review-author">{t('reviews.1.author')}</div>
              <div className="review-role">{t('reviews.1.role')}</div>
            </div>
            <div className="review-card reveal reveal-delay-3">
              <div className="quote-mark">&#8220;</div>
              <div className="review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <blockquote>{t('reviews.2.text')}</blockquote>
              <div className="review-author">{t('reviews.2.author')}</div>
              <div className="review-role">{t('reviews.2.role')}</div>
            </div>
          </div>
        </section>

        {/* CTA + CONTACTS */}
        <section className="no-snap contacts-section" id="contacts">
          <div className="cta-block reveal">
            <h2>{t('contacts.cta.h2')}</h2>
            <p>{t('contacts.cta.p')}</p>
            <div className="cta-buttons">
              <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer" className="btn-gold">{t('contacts.cta.wa')}</a>
              <a href="#pricing" className="btn-ghost">{t('contacts.cta.pricing')}</a>
            </div>
          </div>
          <div className="contact-area reveal reveal-delay-2">
            <div className="contact-info">
              <h3>{t('contacts.info.h3')}</h3>
              <div className="contact-item">
                <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                {t('contacts.wa')}
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {t('contacts.email')}
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {t('contacts.location')}
              </div>
            </div>
            <form className="contact-form" onSubmit={(e) => { e.preventDefault(); alert('ok'); }}>
              <input type="text" placeholder={t('contacts.form.name')} required />
              <input type="email" placeholder={t('contacts.form.email')} required />
              <input type="tel" placeholder={t('contacts.form.phone')} />
              <textarea placeholder={t('contacts.form.msg')} rows={3} />
              <button type="submit" className="btn-gold">{t('contacts.form.submit')}</button>
            </form>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div>{t('footer.copy')}</div>
          <div className="footer-links">
            <a href="#features">{t('footer.features')}</a>
            <a href="#pricing">{t('footer.pricing')}</a>
            <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer">{t('footer.support')}</a>
            <a href="#contacts">{t('footer.contacts')}</a>
          </div>
        </footer>

      </main>
    </div>
  )
}
