'use client'

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #080810; --surface: #111118; --white: #fff;
          --muted: rgba(255,255,255,.4); --gold: #C8881A;
          --gold-glow: rgba(200,136,26,.25); --sidebar-w: 80px;
          --sidebar-expanded: 240px; --red-accent: #e74c3c;
        }
        html { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--white); scroll-behavior: smooth; }
        body { overflow: hidden; background: var(--bg); }
        .sidebar { position: fixed; top: 0; left: 0; width: var(--sidebar-w); height: 100vh; background: rgba(8,8,16,.95); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,.06); display: flex; flex-direction: column; z-index: 1000; transition: width .35s cubic-bezier(.4,0,.2,1); overflow: hidden; }
        .sidebar:hover { width: var(--sidebar-expanded); }
        .sidebar-logo { padding: 24px 20px; display: flex; align-items: center; gap: 12px; min-height: 80px; flex-shrink: 0; }
        .sidebar-logo img { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }
        .sidebar-logo span { font-size: 18px; font-weight: 600; white-space: nowrap; opacity: 0; transition: opacity .25s; }
        .sidebar:hover .sidebar-logo span { opacity: 1; }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 12px 0; overflow-y: auto; }
        .sidebar-nav a { display: flex; align-items: center; gap: 14px; padding: 12px 20px; text-decoration: none; color: var(--muted); font-size: 14px; white-space: nowrap; position: relative; transition: color .2s, background .2s; }
        .sidebar-nav a:hover { color: var(--white); background: rgba(255,255,255,.04); }
        .sidebar-nav a.active { color: var(--gold); }
        .sidebar-nav a.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 24px; background: var(--gold); border-radius: 0 3px 3px 0; }
        .sidebar-nav a svg { width: 22px; height: 22px; flex-shrink: 0; stroke: currentColor; fill: none; stroke-width: 1.5; }
        .sidebar-nav a span { opacity: 0; transition: opacity .25s; }
        .sidebar:hover .sidebar-nav a span { opacity: 1; }
        .sidebar-bottom { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,.06); display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
        .sidebar-bottom a { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--gold); font-size: 13px; font-weight: 500; white-space: nowrap; }
        .sidebar-bottom a span { opacity: 0; transition: opacity .25s; }
        .sidebar:hover .sidebar-bottom a span { opacity: 1; }
        .main-scroll { margin-left: var(--sidebar-w); height: 100vh; overflow-y: auto; scroll-snap-type: y mandatory; scroll-behavior: smooth; }
        .snap-section { scroll-snap-align: start; min-height: 100vh; position: relative; }
        .no-snap { scroll-snap-align: none; min-height: auto; }
        .hero { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 40px 40px; position: relative; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; z-index: 0; background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(30,20,60,.8) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 30%, rgba(200,136,26,.08) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 20% 70%, rgba(20,20,60,.6) 0%, transparent 50%); animation: meshMove 12s ease-in-out infinite alternate; }
        @keyframes meshMove { 0% { transform: scale(1) translate(0,0); } 50% { transform: scale(1.05) translate(-1%,2%); } 100% { transform: scale(1) translate(1%,-1%); } }
        .hero-particles { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
        .particle { position: absolute; width: 2px; height: 2px; background: var(--gold); border-radius: 50%; opacity: 0; animation: particleFade 4s ease-in-out infinite; }
        .particle:nth-child(1){left:20%;top:30%;animation-delay:0s} .particle:nth-child(2){left:70%;top:20%;animation-delay:.8s} .particle:nth-child(3){left:40%;top:60%;animation-delay:1.6s} .particle:nth-child(4){left:80%;top:50%;animation-delay:2.4s} .particle:nth-child(5){left:15%;top:70%;animation-delay:3.2s} .particle:nth-child(6){left:55%;top:15%;animation-delay:1s;width:3px;height:3px} .particle:nth-child(7){left:90%;top:40%;animation-delay:2s} .particle:nth-child(8){left:35%;top:85%;animation-delay:.5s}
        @keyframes particleFade { 0%,100%{opacity:0;transform:translateY(0)} 50%{opacity:.6;transform:translateY(-20px)} }
        .hero-content { position: relative; z-index: 1; max-width: 800px; }
        .hero-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); margin-bottom: 28px; }
        .hero h1 { font-size: clamp(44px,6vw,80px); font-weight: 300; line-height: 1.1; background: linear-gradient(180deg,#fff 30%,rgba(255,255,255,.45) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 24px; }
        .hero-subtitle { font-size: clamp(16px,1.8vw,20px); font-weight: 300; color: rgba(255,255,255,.6); line-height: 1.7; max-width: 640px; margin: 0 auto 40px; }
        .hero-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; }
        .btn-gold { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: var(--gold); color: #000; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; font-family: 'Inter',sans-serif; transition: transform .2s, box-shadow .2s; }
        .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 8px 32px var(--gold-glow); }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: transparent; color: var(--white); border: 1px solid rgba(255,255,255,.15); border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; text-decoration: none; font-family: 'Inter',sans-serif; transition: border-color .2s, background .2s; }
        .btn-ghost:hover { border-color: rgba(255,255,255,.35); background: rgba(255,255,255,.04); }
        .hero-stats { display: flex; gap: 40px; justify-content: center; flex-wrap: wrap; }
        .hero-stat { text-align: center; }
        .hero-stat .val { font-size: 22px; font-weight: 600; }
        .hero-stat .label { font-size: 13px; color: var(--muted); margin-top: 4px; }
        .hero-stat + .hero-stat { padding-left: 40px; border-left: 1px solid rgba(255,255,255,.1); }
        .scroll-chevron { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 1; animation: bounce 2s ease-in-out infinite; }
        .scroll-chevron svg { width: 28px; height: 28px; stroke: var(--muted); fill: none; stroke-width: 2; }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(10px)} }
      `}</style>
      <style>{`
        .industries-strip { padding: 40px 0; overflow: hidden; border-top: 1px solid rgba(255,255,255,.04); border-bottom: 1px solid rgba(255,255,255,.04); }
        .industries-strip h3 { text-align: center; font-size: 13px; font-weight: 500; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
        .marquee-track { display: flex; gap: 16px; animation: marqueeScroll 30s linear infinite; width: max-content; }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes marqueeScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .industry-pill { padding: 10px 22px; border: 1px solid rgba(255,255,255,.1); border-radius: 100px; font-size: 14px; color: rgba(255,255,255,.65); white-space: nowrap; flex-shrink: 0; transition: border-color .2s,color .2s; }
        .industry-pill:hover { border-color: var(--gold); color: var(--gold); }
        .section-heading { text-align: center; margin-bottom: 16px; font-size: clamp(28px,4vw,44px); font-weight: 600; }
        .section-subtitle { text-align: center; color: var(--muted); font-size: 16px; font-weight: 300; max-width: 560px; margin: 0 auto 56px; line-height: 1.6; }
        .pain-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; }
        .pain-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; max-width: 1100px; width: 100%; }
        .pain-card { background: var(--surface); border-radius: 16px; padding: 32px; border-left: 3px solid var(--red-accent); transition: transform .25s,box-shadow .25s; }
        .pain-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,.4); }
        .pain-card .icon { font-size: 28px; margin-bottom: 16px; }
        .pain-card h4 { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
        .pain-card p { font-size: 14px; color: rgba(255,255,255,.55); line-height: 1.65; }
        .features-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; }
        .bento-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; max-width: 1100px; width: 100%; grid-template-areas: "whatsapp whatsapp clients diary" "analytics analytics stock payments"; }
        .bento-card { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 16px; padding: 28px; position: relative; overflow: hidden; transition: transform .25s,border-color .3s; }
        .bento-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--gold); opacity:0; transition:opacity .3s; }
        .bento-card:hover { transform: translateY(-3px); border-color: rgba(200,136,26,.2); }
        .bento-card:hover::before { opacity: 1; }
        .bento-card.whatsapp{grid-area:whatsapp} .bento-card.clients{grid-area:clients} .bento-card.diary{grid-area:diary} .bento-card.analytics{grid-area:analytics} .bento-card.stock{grid-area:stock} .bento-card.payments{grid-area:payments}
        .bento-card .icon { font-size: 24px; margin-bottom: 12px; }
        .bento-card h4 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
        .bento-card p { font-size: 14px; color: rgba(255,255,255,.55); line-height: 1.6; margin-bottom: 16px; }
        .bento-tag { display: inline-block; padding: 5px 14px; border-radius: 100px; background: rgba(200,136,26,.12); color: var(--gold); font-size: 12px; font-weight: 500; }
        .mini-chat { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
        .chat-bubble { max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 12px; line-height: 1.4; }
        .chat-bubble.incoming { background: rgba(255,255,255,.06); color: rgba(255,255,255,.7); align-self: flex-start; border-bottom-left-radius: 4px; }
        .chat-bubble.outgoing { background: rgba(37,211,102,.15); color: rgba(255,255,255,.8); align-self: flex-end; border-bottom-right-radius: 4px; }
        .mini-chart { display: flex; align-items: flex-end; gap: 6px; height: 60px; margin-top: 16px; }
        .chart-bar { flex: 1; background: linear-gradient(to top,var(--gold),rgba(200,136,26,.3)); border-radius: 4px 4px 0 0; }
        .how-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; }
        .steps-container { display: flex; max-width: 1100px; width: 100%; position: relative; }
        .steps-container::before { content:''; position:absolute; top:36px; left:60px; right:60px; height:2px; background:linear-gradient(90deg,var(--gold),rgba(200,136,26,.2)); }
        .step-card { flex: 1; text-align: center; padding: 0 20px; }
        .step-num { width:48px; height:48px; border-radius:50%; background:var(--surface); border:2px solid var(--gold); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:14px; font-weight:600; color:var(--gold); position:relative; z-index:1; }
        .step-card h4 { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
        .step-card p { font-size: 14px; color: rgba(255,255,255,.5); line-height: 1.6; }
        .security-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; }
        .security-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; max-width: 800px; width: 100%; }
        .security-card { background:var(--surface); border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:28px; border-left:3px solid rgba(46,204,113,.3); transition:transform .25s; }
        .security-card:hover { transform: translateY(-3px); }
        .security-card .icon { font-size: 26px; margin-bottom: 12px; }
        .security-card h4 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
        .security-card p { font-size: 14px; color: rgba(255,255,255,.5); line-height: 1.6; }
        .pricing-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; }
        .pricing-scroll { display: flex; gap: 20px; max-width: 1100px; width: 100%; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; }
        .pricing-scroll::-webkit-scrollbar{height:4px} .pricing-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
        .pricing-card { flex:1; min-width:240px; background:var(--surface); border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:32px 28px; scroll-snap-align:start; display:flex; flex-direction:column; transition:transform .25s; position:relative; }
        .pricing-card:hover { transform: translateY(-3px); }
        .pricing-card.featured { border-color: var(--gold); box-shadow: 0 0 40px rgba(200,136,26,.12); }
        .pricing-badge { position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--gold); color:#000; padding:4px 16px; border-radius:100px; font-size:12px; font-weight:600; white-space:nowrap; }
        .pricing-card h4 { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
        .pricing-price { font-size: 36px; font-weight: 700; margin-bottom: 4px; }
        .pricing-price span { font-size: 16px; font-weight: 400; color: var(--muted); }
        .pricing-period { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
        .pricing-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; flex: 1; }
        .pricing-features li { font-size: 14px; color: rgba(255,255,255,.7); display: flex; align-items: center; gap: 8px; }
        .pricing-features li::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--gold); flex-shrink:0; }
        .reviews-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; }
        .reviews-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; max-width: 900px; width: 100%; }
        .review-card { background:var(--surface); border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:36px; }
        .quote-mark { font-size: 64px; font-family: Georgia,serif; color: var(--gold); opacity: .3; line-height: 1; margin-bottom: 8px; }
        .review-stars { font-size: 18px; color: var(--gold); margin-bottom: 16px; letter-spacing: 2px; }
        .review-card blockquote { font-size: 15px; color: rgba(255,255,255,.75); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
        .review-author { font-size: 15px; font-weight: 600; }
        .review-role { font-size: 13px; color: var(--muted); margin-top: 4px; }
        .contacts-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; gap: 64px; }
        .cta-block { text-align: center; max-width: 700px; }
        .cta-block h2 { font-size: clamp(28px,4vw,48px); font-weight: 600; margin-bottom: 16px; }
        .cta-block p { font-size: 18px; color: rgba(255,255,255,.6); margin-bottom: 36px; }
        .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .contact-area { display: flex; gap: 60px; max-width: 900px; width: 100%; flex-wrap: wrap; }
        .contact-info { flex: 1; min-width: 220px; }
        .contact-info h3 { font-size: 20px; font-weight: 600; margin-bottom: 24px; }
        .contact-item { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 15px; color: rgba(255,255,255,.7); }
        .contact-item svg { width:20px; height:20px; stroke:var(--gold); fill:none; stroke-width:1.5; flex-shrink:0; }
        .contact-form { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 12px; }
        .contact-form input,.contact-form textarea { background:var(--surface); border:1px solid rgba(255,255,255,.1); border-radius:8px; padding:14px 16px; color:var(--white); font-size:15px; font-family:'Inter',sans-serif; outline:none; transition:border-color .2s; }
        .contact-form input:focus,.contact-form textarea:focus { border-color: var(--gold); }
        .contact-form textarea { resize: vertical; }
        .footer { padding:24px 40px 24px calc(var(--sidebar-w) + 40px); display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,.06); font-size:13px; color:var(--muted); flex-wrap:wrap; gap:12px; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { color: var(--muted); text-decoration: none; transition: color .2s; }
        .footer-links a:hover { color: var(--white); }
        .reveal { opacity:0; transform:translateY(24px); transition:opacity .7s ease,transform .7s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }
        .reveal-delay-1{transition-delay:.1s} .reveal-delay-2{transition-delay:.2s} .reveal-delay-3{transition-delay:.3s} .reveal-delay-4{transition-delay:.4s}
        .mobile-tabs { display:none; position:fixed; bottom:0; left:0; right:0; z-index:999; background:rgba(8,8,16,.97); border-top:1px solid rgba(255,255,255,.08); padding:8px 0; }
        .mobile-tabs-inner { display: flex; justify-content: space-around; }
        .mobile-tabs a { display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 12px; text-decoration:none; color:var(--muted); font-size:10px; transition:color .2s; }
        .mobile-tabs a.active { color: var(--gold); }
        .mobile-tabs a svg { width:22px; height:22px; stroke:currentColor; fill:none; stroke-width:1.5; }
        @media (max-width:768px) {
          :root{--sidebar-w:0px} .sidebar{display:none} .main-scroll{margin-left:0;padding-bottom:64px} .mobile-tabs{display:block}
          .pain-grid{grid-template-columns:1fr} .bento-grid{grid-template-columns:1fr 1fr;grid-template-areas:"whatsapp whatsapp" "clients diary" "analytics analytics" "stock payments"}
          .steps-container{flex-direction:column;gap:32px} .steps-container::before{display:none} .security-grid{grid-template-columns:1fr} .reviews-grid{grid-template-columns:1fr} .contact-area{flex-direction:column;gap:32px} .footer{padding:20px}
          .hero,.pain-section,.features-section,.how-section,.security-section,.pricing-section,.reviews-section,.contacts-section{padding:60px 20px}
        }
        @media (min-width:769px) and (max-width:1024px) {
          .bento-grid{grid-template-columns:repeat(2,1fr);grid-template-areas:"whatsapp clients" "analytics diary" "stock payments"} .pain-grid{grid-template-columns:repeat(2,1fr)}
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/trinity-logo.png" alt="Trinity" />
          <span>Trinity CRM</span>
        </div>
        <nav className="sidebar-nav">
          <a href="#home" data-section="home" className="active"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>Главная</span></a>
          <a href="#problems" data-section="problems"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Проблемы</span></a>
          <a href="#features" data-section="features"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Возможности</span></a>
          <a href="#how" data-section="how"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Как работает</span></a>
          <a href="#security" data-section="security"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Безопасность</span></a>
          <a href="#pricing" data-section="pricing"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><span>Тарифы</span></a>
          <a href="#reviews" data-section="reviews"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>Отзывы</span></a>
          <a href="#contacts" data-section="contacts"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014 12a19.79 19.79 0 01-3-8.63A2 2 0 012.88 1h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg><span>Контакты</span></a>
        </nav>
        <div className="sidebar-bottom">
          <a href="/login"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg><span>Войти в систему</span></a>
        </div>
      </aside>

      <div className="mobile-tabs">
        <div className="mobile-tabs-inner">
          <a href="#home" data-section="home" className="active"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg><span>Главная</span></a>
          <a href="#features" data-section="features"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Функции</span></a>
          <a href="#pricing" data-section="pricing"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><span>Тарифы</span></a>
          <a href="#contacts" data-section="contacts"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014 12a19.79 19.79 0 01-3-8.63A2 2 0 012.88 1h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg><span>Контакты</span></a>
        </div>
      </div>

      <main className="main-scroll" id="main-scroll">
        <section className="snap-section hero" id="home">
          <div className="hero-bg" />
          <div className="hero-particles"><div className="particle"/><div className="particle"/><div className="particle"/><div className="particle"/><div className="particle"/><div className="particle"/><div className="particle"/><div className="particle"/></div>
          <div className="hero-content">
            <div className="hero-eyebrow">Система управления бизнесом · Израиль</div>
            <h1>Нервная система<br/>вашего бизнеса</h1>
            <p className="hero-subtitle">Клиенты, записи, аналитика и WhatsApp-напоминания в одном месте. Работает для салонов, клиник, автосервисов и любого сервисного бизнеса.</p>
            <div className="hero-buttons">
              <a href="https://wa.me/972544858586" target="_blank" rel="noopener" className="btn-gold">Попробовать бесплатно →</a>
              <a href="#features" className="btn-ghost">Посмотреть возможности</a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><div className="val">100%</div><div className="label">Онлайн, 24/7</div></div>
              <div className="hero-stat"><div className="val">WhatsApp</div><div className="label">Напоминания клиентам</div></div>
              <div className="hero-stat"><div className="val">1 день</div><div className="label">Запуск под ключ</div></div>
            </div>
          </div>
          <div className="scroll-chevron"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></div>
        </section>

        <div className="no-snap industries-strip">
          <h3>Работает для любого сервисного бизнеса</h3>
          <div className="marquee-track">
            {['Салон красоты','Барбершоп','Маникюр','Медклиника','Стоматология','Автосервис','Риелтор','Фитнес','Ветклиника','Фотограф','Массажный кабинет','Репетитор',
              'Салон красоты','Барбершоп','Маникюр','Медклиника','Стоматология','Автосервис','Риелтор','Фитнес','Ветклиника','Фотограф','Массажный кабинет','Репетитор'
            ].map((item, i) => <div key={i} className="industry-pill">{item}</div>)}
          </div>
        </div>

        <section className="snap-section pain-section" id="problems">
          <h2 className="section-heading reveal">Узнаёте себя?</h2>
          <p className="section-subtitle reveal reveal-delay-1">Каждый день одни и те же проблемы, которые стоят вам денег и нервов.</p>
          <div className="pain-grid">
            <div className="pain-card reveal reveal-delay-1"><div className="icon">📓</div><h4>Тетрадь и Excel</h4><p>Клиенты теряются, записи путаются, история визитов нигде не хранится. При каждом звонке — поиск по страницам.</p></div>
            <div className="pain-card reveal reveal-delay-2"><div className="icon">👻</div><h4>Клиенты не приходят</h4><p>Забыли о записи. Никто не напомнил. Вы потеряли время и деньги. Это происходит каждую неделю.</p></div>
            <div className="pain-card reveal reveal-delay-3"><div className="icon">📊</div><h4>Нет понимания цифр</h4><p>Непонятно кто лучший клиент, какая услуга приносит больше, сколько реально заработано за месяц.</p></div>
          </div>
        </section>

        <section className="snap-section features-section" id="features">
          <h2 className="section-heading reveal">Всё что нужно — в одном месте</h2>
          <p className="section-subtitle reveal reveal-delay-1">Инструменты для реального бизнеса, без лишнего.</p>
          <div className="bento-grid">
            <div className="bento-card whatsapp reveal reveal-delay-1">
              <div className="icon">💬</div><h4>WhatsApp-напоминания</h4>
              <p>Система автоматически отправляет напоминание клиенту за день до визита. Пропуски сокращаются на 40%.</p>
              <span className="bento-tag">Автоматически</span>
              <div className="mini-chat">
                <div className="chat-bubble outgoing">Привет! Напоминаем о вашей записи завтра в 14:00 💇‍♀️</div>
                <div className="chat-bubble incoming">Спасибо, буду!</div>
              </div>
            </div>
            <div className="bento-card clients reveal reveal-delay-2"><div className="icon">👥</div><h4>База клиентов</h4><p>История визитов, предпочтения, долги — всё в одном профиле. Поиск за секунду.</p><span className="bento-tag">Все данные</span></div>
            <div className="bento-card diary reveal reveal-delay-3"><div className="icon">📅</div><h4>Дневник записей</h4><p>Онлайн-расписание для мастеров и отделений. Без путаницы и двойных записей.</p><span className="bento-tag">В реальном времени</span></div>
            <div className="bento-card analytics reveal reveal-delay-1">
              <div className="icon">📈</div><h4>Аналитика и отчёты</h4>
              <p>Доходы, популярные услуги, лучшие клиенты — наглядно и по периодам.</p>
              <span className="bento-tag">Понятно</span>
              <div className="mini-chart">
                <div className="chart-bar" style={{height:'30%'}}/><div className="chart-bar" style={{height:'55%'}}/><div className="chart-bar" style={{height:'45%'}}/><div className="chart-bar" style={{height:'75%'}}/><div className="chart-bar" style={{height:'60%'}}/><div className="chart-bar" style={{height:'90%'}}/><div className="chart-bar" style={{height:'70%'}}/>
              </div>
            </div>
            <div className="bento-card stock reveal reveal-delay-2"><div className="icon">📦</div><h4>Склад</h4><p>Учёт товаров и расходников. Система предупредит когда заканчивается запас.</p><span className="bento-tag">Под контролем</span></div>
            <div className="bento-card payments reveal reveal-delay-3"><div className="icon">💳</div><h4>Платежи</h4><p>Принимайте оплату наличными, картой или переводом. Всё в одном журнале.</p><span className="bento-tag">Просто</span></div>
          </div>
        </section>

        <section className="snap-section how-section" id="how">
          <h2 className="section-heading reveal">Запуск за один день</h2>
          <p className="section-subtitle reveal reveal-delay-1">Мы приезжаем, настраиваем, обучаем. Вы просто начинаете работать.</p>
          <div className="steps-container">
            <div className="step-card reveal reveal-delay-1"><div className="step-num">01</div><h4>Встреча и демо</h4><p>Показываем систему вживую, отвечаем на все вопросы. Никаких обязательств.</p></div>
            <div className="step-card reveal reveal-delay-2"><div className="step-num">02</div><h4>Настройка</h4><p>Приезжаем и настраиваем всё под ваш бизнес. Переносим существующие данные.</p></div>
            <div className="step-card reveal reveal-delay-3"><div className="step-num">03</div><h4>Обучение</h4><p>Объясняем как пользоваться. Вы и ваши сотрудники готовы за пару часов.</p></div>
            <div className="step-card reveal reveal-delay-4"><div className="step-num">04</div><h4>Работаете</h4><p>Мы на связи. Любой вопрос — пишите. Система обновляется автоматически.</p></div>
          </div>
        </section>

        <section className="snap-section security-section" id="security">
          <h2 className="section-heading reveal">Ваши данные — только ваши</h2>
          <p className="section-subtitle reveal reveal-delay-1">Доверяете нам клиентскую базу — мы относимся к этому серьёзно.</p>
          <div className="security-grid">
            <div className="security-card reveal reveal-delay-1"><div className="icon">🔐</div><h4>Шифрование SSL/TLS</h4><p>Все данные передаются по защищённому протоколу. Никто не перехватит.</p></div>
            <div className="security-card reveal reveal-delay-2"><div className="icon">💾</div><h4>Ежедневные бэкапы</h4><p>Автоматическое резервное копирование каждый день. Данные не пропадут.</p></div>
            <div className="security-card reveal reveal-delay-3"><div className="icon">🇮🇱</div><h4>Соответствие стандартам</h4><p>Работаем в соответствии с израильским законом о защите персональных данных.</p></div>
            <div className="security-card reveal reveal-delay-4"><div className="icon">🚫</div><h4>Никакой рекламы</h4><p>Ваша клиентская база не передаётся третьим лицам и не используется для рекламы. Никогда.</p></div>
          </div>
        </section>

        <section className="snap-section pricing-section" id="pricing">
          <h2 className="section-heading reveal">Честные цены. Без сюрпризов.</h2>
          <p className="section-subtitle reveal reveal-delay-1">Платите только за то что используете. Никаких скрытых комиссий.</p>
          <div className="pricing-scroll reveal reveal-delay-2">
            <div className="pricing-card">
              <h4>Base</h4><div className="pricing-price">₪199 <span>/ мес</span></div><div className="pricing-period"/>
              <ul className="pricing-features"><li>Клиенты</li><li>Визиты / Записи</li><li>Дневник и задачи</li><li>Склад</li></ul>
              <a href="#contacts" className="btn-ghost">Выбрать</a>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">Рекомендован</div>
              <h4>Pro</h4><div className="pricing-price">₪249 <span>/ мес</span></div><div className="pricing-period"/>
              <ul className="pricing-features"><li>Всё из Base</li><li>Онлайн-запись</li><li>Статистика и отчёты</li><li>SMS и напоминания</li></ul>
              <a href="#contacts" className="btn-gold">Выбрать</a>
            </div>
            <div className="pricing-card" style={{position:'relative'}}>
              <div className="pricing-badge" style={{background:'rgba(255,255,255,.1)',color:'var(--white)'}}>Для бизнеса</div>
              <h4>Enterprise</h4><div className="pricing-price">₪499 <span>/ мес</span></div><div className="pricing-period"/>
              <ul className="pricing-features"><li>Всё из Base и Pro</li><li>Филиалы</li><li>Программа лояльности</li><li>До 5 работников</li></ul>
              <a href="#contacts" className="btn-ghost">Выбрать</a>
            </div>
            <div className="pricing-card">
              <h4>Индивидуальная</h4><div className="pricing-price" style={{fontSize:'28px'}}>По выбору</div><div className="pricing-period"/>
              <ul className="pricing-features"><li>Выберите нужные модули</li><li>Инд. конфигурация</li><li>Приоритетная поддержка</li><li>Скидка до 15% от 5+ модулей</li></ul>
              <a href="#contacts" className="btn-ghost">Выбрать</a>
            </div>
          </div>
        </section>

        <section className="snap-section reviews-section" id="reviews">
          <h2 className="section-heading reveal">Что говорят наши клиенты</h2>
          <p className="section-subtitle reveal reveal-delay-1">Реальные владельцы бизнеса о работе с Trinity</p>
          <div className="reviews-grid">
            <div className="review-card reveal reveal-delay-2">
              <div className="quote-mark">&ldquo;</div><div className="review-stars">★★★★★</div>
              <blockquote>Раньше вела всё в тетрадке и постоянно теряла клиентов. Теперь система сама напоминает через WhatsApp — пропусков стало в разы меньше.</blockquote>
              <div className="review-author">Анета</div><div className="review-role">Владелица салона Beautymania</div>
            </div>
            <div className="review-card reveal reveal-delay-3">
              <div className="quote-mark">&ldquo;</div><div className="review-stars">★★★★★</div>
              <blockquote>Влад приехал, всё настроил за один день. Теперь я вижу кто мой лучший клиент и сколько денег приносит каждая услуга. Это меняет всё.</blockquote>
              <div className="review-author">Ксения</div><div className="review-role">Владелица Hair Rehab</div>
            </div>
          </div>
        </section>

        <section className="snap-section contacts-section" id="contacts">
          <div className="cta-block reveal">
            <h2>Готовы навести порядок в своём бизнесе?</h2>
            <p>Напишите нам — покажем систему вживую. Без обязательств.</p>
            <div className="cta-buttons">
              <a href="https://wa.me/972544858586" target="_blank" rel="noopener" className="btn-gold">Написать в WhatsApp →</a>
              <a href="#pricing" className="btn-ghost">Посмотреть тарифы</a>
            </div>
          </div>
          <div className="contact-area reveal reveal-delay-2">
            <div className="contact-info">
              <h3>Свяжитесь с нами</h3>
              <div className="contact-item"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014 12a19.79 19.79 0 01-3-8.63A2 2 0 012.88 1h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>WhatsApp: +972-54-485-8586</div>
              <div className="contact-item"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email: info@ambersol.co.il</div>
              <div className="contact-item"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Израиль</div>
            </div>
            <form className="contact-form" onSubmit={(e) => { e.preventDefault(); alert('Спасибо! Мы свяжемся с вами в ближайшее время.'); }}>
              <input type="text" placeholder="Имя" required />
              <input type="email" placeholder="Email" required />
              <input type="tel" placeholder="Телефон" />
              <textarea placeholder="Сообщение" rows={3} />
              <button type="submit" className="btn-gold">Отправить</button>
            </form>
          </div>
        </section>

        <footer className="footer">
          <div>© 2025 Amber Solutions. Все права защищены.</div>
          <div className="footer-links">
            <a href="#features">Возможности</a>
            <a href="#pricing">Тарифы</a>
            <a href="https://wa.me/972544858586" target="_blank" rel="noopener">Поддержка</a>
            <a href="#contacts">Контакты</a>
          </div>
        </footer>
      </main>

      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var ms = document.getElementById('main-scroll');
  if (!ms) return;
  var revealObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12, root: ms });
  document.querySelectorAll('.reveal').forEach(function(el) { revealObs.observe(el); });

  var ids = ['home','problems','features','how','security','pricing','reviews','contacts'];
  function setActive(id) {
    document.querySelectorAll('.sidebar-nav a[data-section],.mobile-tabs a[data-section]').forEach(function(a) {
      a.classList.toggle('active', a.dataset.section === id);
    });
  }
  var secObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting && e.intersectionRatio >= 0.25) setActive(e.target.id); });
  }, { threshold: [0.25, 0.5], root: ms });
  ids.forEach(function(id) { var s = document.getElementById(id); if (s) secObs.observe(s); });

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
})();
      `}} />
    </>
  )
}
