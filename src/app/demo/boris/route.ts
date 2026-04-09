import { NextResponse } from 'next/server'

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trinity CRM · Israstar · Демо</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f6fa;
  --white:#ffffff;
  --sidebar-bg:#ffffff;
  --header-bg:linear-gradient(90deg,#1a237e,#283593,#3949ab);
  --indigo:#1a237e;--indigo2:#283593;--indigo3:#3949ab;
  --amber:#f5a623;--amber2:#e8960a;
  --emerald:#27ae60;--emerald-bg:rgba(39,174,96,.1);
  --blue:#2980b9;--blue-bg:rgba(41,128,185,.1);
  --danger:#e74c3c;--danger-bg:rgba(231,76,60,.1);
  --warning:#e67e22;--warning-bg:rgba(230,126,34,.1);
  --purple:#8e44ad;--purple-bg:rgba(142,68,173,.1);
  --text:#1a1a2e;--text2:#4a5568;--muted:#9aa3b0;
  --border:#e8ecf0;--border2:#d0d7de;
  --radius:10px;--radius-sm:6px;
  --shadow:0 1px 4px rgba(0,0,0,.08),0 2px 12px rgba(0,0,0,.04);
  --shadow-md:0 4px 16px rgba(0,0,0,.1);
}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}

/* ── LANDING ── */
#landing{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;position:relative;background:linear-gradient(160deg,#0f1629 0%,#1a237e 50%,#0f1629 100%);overflow:hidden}
.l-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:48px 48px}
.l-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(245,166,35,.18) 0%,transparent 70%)}
.l-content{position:relative;z-index:1}
.l-logo-wrap{width:72px;height:72px;background:linear-gradient(135deg,#1a237e,#3949ab);border:1px solid rgba(255,255,255,.15);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 28px}
.l-logo-wrap img{width:52px;height:52px;object-fit:contain}
.l-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);color:#f5a623;padding:5px 16px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;margin-bottom:24px}
.l-title{font-family:'Syne',sans-serif;font-size:clamp(28px,5vw,56px);font-weight:800;line-height:1.1;color:#fff;margin-bottom:16px}
.l-title .a{color:#f5a623}
.l-sub{font-size:16px;color:rgba(255,255,255,.6);max-width:480px;margin:0 auto 20px;line-height:1.7}
.l-client{display:inline-flex;align-items:center;gap:10px;background:rgba(62,207,142,.12);border:1px solid rgba(62,207,142,.3);color:#3ecf8e;padding:8px 20px;border-radius:var(--radius);font-size:14px;font-weight:500;margin-bottom:40px}
.l-pains{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-bottom:44px;max-width:780px}
.l-pain{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius);padding:14px 16px;text-align:left;min-width:180px;max-width:220px}
.l-pain .pi{font-size:18px;margin-bottom:8px}
.l-pain .pt{font-size:12px;color:rgba(255,255,255,.5);line-height:1.5}
.l-pain .pt strong{color:rgba(255,255,255,.85);display:block;margin-bottom:3px;font-size:13px}
.btn-launch{background:linear-gradient(135deg,#f5a623,#e8960a);color:#0f1629;padding:16px 40px;border-radius:var(--radius);font-size:16px;font-weight:700;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:10px;box-shadow:0 8px 28px rgba(245,166,35,.35)}
.btn-launch:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(245,166,35,.45)}

/* ── APP ── */
#app{display:none;min-height:100vh}

/* HEADER */
.hdr{background:var(--header-bg);height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 0;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.2)}
.hdr-left{display:flex;align-items:center;gap:0}
.burger{display:flex;flex-direction:column;justify-content:center;gap:5px;width:48px;height:56px;cursor:pointer;padding:0 14px;flex-shrink:0}
.burger:hover{background:rgba(255,255,255,.08)}
.burger span{display:block;height:2px;background:#fff;border-radius:2px;transition:all .28s ease}
.burger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.burger.open span:nth-child(2){opacity:0;transform:scaleX(0)}
.burger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.hdr-logo{display:flex;align-items:center;gap:10px;padding:0 12px 0 4px}
.hdr-logo-box{width:32px;height:32px;background:linear-gradient(135deg,#1a237e,#3949ab);border:1px solid rgba(255,255,255,.25);border-radius:8px;display:flex;align-items:center;justify-content:center}
.hdr-logo-box img{width:22px;height:22px;object-fit:contain}
.hdr-brand{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#fff}
.hdr-client{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.9);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:500}
.hdr-right{display:flex;align-items:center;gap:12px}
.hdr-notif{position:relative;color:rgba(255,255,255,.75);font-size:18px;cursor:pointer;padding:4px}
.hdr-dot{position:absolute;top:2px;right:2px;width:8px;height:8px;background:#e74c3c;border-radius:50%;border:1.5px solid #283593}
.hdr-avatar{width:32px;height:32px;background:linear-gradient(135deg,#5b8def,#3949ab);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;cursor:pointer;border:2px solid rgba(255,255,255,.25)}

/* OVERLAY + SIDEBAR */
.s-overlay{position:fixed;inset:0;background:rgba(15,22,41,.45);z-index:149;opacity:0;pointer-events:none;transition:opacity .28s}
.s-overlay.vis{opacity:1;pointer-events:all}
.sidebar{position:fixed;top:0;left:0;bottom:0;width:264px;background:#fff;z-index:150;transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,.12)}
.sidebar.open{transform:translateX(0)}
.sb-hdr{background:var(--header-bg);padding:0 20px;height:56px;display:flex;align-items:center;gap:12px}
.sb-logo-box{width:30px;height:30px;background:linear-gradient(135deg,#1a237e,#3949ab);border:1px solid rgba(255,255,255,.25);border-radius:7px;display:flex;align-items:center;justify-content:contain}
.sb-logo-box img{width:20px;height:20px;object-fit:contain}
.sb-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#fff}
.sb-client{font-size:10px;color:rgba(255,255,255,.55);margin-top:1px}
.sb-nav{flex:1;padding:8px 0;overflow-y:auto}
.sb-section{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;padding:12px 20px 5px}
.nav-item{display:flex;align-items:center;gap:11px;padding:10px 20px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;transition:all .15s;border-left:3px solid transparent;user-select:none}
.nav-item:hover{color:var(--text);background:#f8f9fc}
.nav-item.active{color:var(--indigo);background:#eef0fc;border-left-color:var(--indigo);font-weight:600}
.nav-item .ni{font-size:16px;width:20px;text-align:center;flex-shrink:0}
.nav-item .nb{background:#e74c3c;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:100px;margin-left:auto}
.sb-footer{padding:16px 20px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px}
.sb-avatar{width:34px;height:34px;background:linear-gradient(135deg,#5b8def,#3949ab);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0}
.sb-name{font-size:13px;font-weight:600;color:var(--text)}
.sb-role{font-size:11px;color:var(--muted)}

/* BREADCRUMB */
.breadcrumb{background:#fff;border-bottom:1px solid var(--border);padding:8px 24px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
.breadcrumb .bc-sep{color:var(--border2)}
.breadcrumb .bc-active{color:var(--text);font-weight:500}

/* MAIN */
.main{padding:24px;max-width:1200px;width:100%;margin:0 auto}
.screen{display:none}
.screen.active{display:block;animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

/* PAGE HEADER */
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:14px}
.ph-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:var(--text)}
.ph-sub{font-size:12px;color:var(--muted);margin-top:3px}

/* BUTTONS */
.btn{padding:9px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;display:inline-flex;align-items:center;gap:7px;transition:all .18s}
.btn-amber{background:linear-gradient(135deg,var(--amber),var(--amber2));color:#0f1629;box-shadow:0 2px 8px rgba(245,166,35,.25)}
.btn-amber:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(245,166,35,.35)}
.btn-ghost{background:var(--white);color:var(--text2);border:1px solid var(--border2)}
.btn-ghost:hover{border-color:var(--text2);color:var(--text)}
.btn-sm{padding:6px 14px;font-size:12px}

/* KPI CARDS */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:22px}
.kpi{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;position:relative;overflow:hidden;box-shadow:var(--shadow)}
.kpi::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--radius) var(--radius) 0 0}
.kpi.ka::after{background:linear-gradient(90deg,var(--amber),var(--amber2))}
.kpi.ke::after{background:linear-gradient(90deg,#27ae60,#2ecc71)}
.kpi.kb::after{background:linear-gradient(90deg,#2980b9,#3498db)}
.kpi.kd::after{background:linear-gradient(90deg,#e74c3c,#c0392b)}
.kpi.kw::after{background:linear-gradient(90deg,#e67e22,#f39c12)}
.kpi.kp::after{background:linear-gradient(90deg,#8e44ad,#9b59b6)}
.kpi-label{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.kpi-val{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;line-height:1;margin-bottom:5px}
.kpi-val.va{color:var(--amber)}.kpi-val.ve{color:var(--emerald)}.kpi-val.vb{color:var(--blue)}.kpi-val.vd{color:var(--danger)}.kpi-val.vw{color:var(--warning)}.kpi-val.vp{color:var(--purple)}
.kpi-delta{font-size:11px;color:var(--muted)}.up{color:var(--emerald)}.dn{color:var(--danger)}

/* CARDS */
.card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);margin-bottom:18px}
.card-hdr{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fafbfe}
.card-title{font-size:13px;font-weight:600;color:var(--text)}
.card-body{padding:20px}

/* GRID */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:820px){.g2{grid-template-columns:1fr}}
.mb16{margin-bottom:16px}

/* TABLE */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 14px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:#fafbfe;white-space:nowrap}
td{padding:11px 14px;border-bottom:1px solid rgba(0,0,0,.04);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8f9fc}

/* PILLS */
.pill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:100px;font-size:11px;font-weight:600}
.pe{background:var(--emerald-bg);color:var(--emerald)}
.pa{background:rgba(245,166,35,.12);color:#c17d0a}
.pd{background:var(--danger-bg);color:var(--danger)}
.pb{background:var(--blue-bg);color:var(--blue)}
.pm{background:#f0f1f5;color:var(--text2)}
.pw{background:var(--warning-bg);color:var(--warning)}
.pp{background:var(--purple-bg);color:var(--purple)}

/* INV BARS */
.inv-bar-wrap{margin-top:8px}
.inv-track{height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:4px}
.inv-fill{height:100%;border-radius:3px}

/* WA DEMO */
.wa-chat{background:#f0f2f5;border-radius:var(--radius);padding:14px;font-size:13px}
.wa-bubble{background:#fff;border-radius:10px 10px 10px 2px;padding:10px 14px;margin-bottom:10px;line-height:1.6;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.wa-bubble .wt{font-size:10px;color:var(--muted);margin-top:4px}
.wa-out{background:#dcf8c6;border-radius:10px 10px 2px 10px;padding:10px 14px;margin-bottom:10px;line-height:1.6;font-size:13px}
.parsed-box{background:#f8f9fc;border:1px solid var(--border);border-radius:var(--radius);padding:14px}
.pf{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px}
.pf:last-child{border-bottom:none}
.pfl{color:var(--muted);font-size:12px}
.pfv{font-weight:600;color:var(--emerald)}
.ai-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.3);color:var(--emerald);padding:4px 10px;border-radius:100px;font-size:11px;font-weight:600;margin-bottom:12px}

/* CALENDAR */
.cal-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)}
.cal-row:last-child{border-bottom:none}
.cal-box{background:linear-gradient(135deg,var(--indigo2),var(--indigo3));border-radius:8px;padding:6px 10px;text-align:center;min-width:44px}
.cal-day{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:var(--amber)}
.cal-mon{font-size:9px;color:rgba(255,255,255,.65);text-transform:uppercase}
.cal-info{flex:1}
.cal-t{font-size:13px;font-weight:500;margin-bottom:2px}
.cal-m{font-size:11px;color:var(--muted);display:flex;gap:10px}
.dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:2px}

/* PORTAL PREVIEW */
.portal-preview{background:#f5f6fa;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.pp-hdr{background:var(--header-bg);padding:14px 18px;display:flex;align-items:center;gap:10px}
.pp-hdr .ppt{font-size:14px;font-weight:600;color:#fff}
.pp-body{padding:16px;background:#fff}
.pp-card{background:#f8f9fc;border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px}
.pp-card-title{font-size:13px;font-weight:600;color:var(--indigo);margin-bottom:4px}
.pp-card-meta{font-size:11px;color:var(--muted);margin-bottom:10px}
.pp-row{display:flex;justify-content:space-between;font-size:12px;color:var(--text2);padding:3px 0}
.pp-row strong{color:var(--text)}
.pp-btn{background:var(--amber);color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:11px;font-weight:600;cursor:pointer;margin-top:10px;font-family:'Inter',sans-serif}

/* BRANCHES */
.branch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px}
.branch-card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:20px;text-align:center;position:relative;box-shadow:var(--shadow)}
.branch-card.hq{border-color:rgba(245,166,35,.5);background:linear-gradient(135deg,rgba(245,166,35,.04),#fff)}
.hq-crown{position:absolute;top:8px;right:8px;background:rgba(245,166,35,.15);color:#c17d0a;font-size:10px;padding:2px 7px;border-radius:100px;font-weight:600}
.bf{font-size:28px;margin-bottom:6px}
.bn{font-size:13px;font-weight:600;margin-bottom:3px}
.bs{font-size:11px;color:var(--muted)}
.bv{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--blue);margin:7px 0}

/* HINT BUTTON */
.hint-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--indigo2);background:#eef0fc;border:1px solid rgba(26,35,126,.15);padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:500}
.hint-btn:hover{background:#e4e7f8}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-bottom:18px}
.pricing-card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:26px;position:relative;box-shadow:var(--shadow)}
.pricing-card.rec{border-color:rgba(245,166,35,.5);background:linear-gradient(160deg,rgba(245,166,35,.04),#fff)}
.rec-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--amber),var(--amber2));color:#0f1629;font-size:10px;font-weight:700;padding:3px 12px;border-radius:100px;white-space:nowrap}
.pr-plan{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px}
.pr-price{font-family:'Syne',sans-serif;font-size:34px;font-weight:800;color:var(--indigo);margin-bottom:3px}
.pr-price span{font-size:13px;font-weight:400;color:var(--muted)}
.pr-note{font-size:13px;color:var(--indigo2);margin-bottom:18px;position:relative;display:inline-block;cursor:help;border-bottom:1px dashed var(--indigo2);font-weight:500}
.tooltip-wrap{position:relative;display:inline-block}
.tooltip-box{position:fixed;width:290px;background:#1a237e;color:#fff;font-size:13px;border-radius:10px;padding:16px 18px;line-height:1.7;z-index:9999;box-shadow:0 8px 32px rgba(26,35,126,.5);opacity:0;pointer-events:none;transition:opacity .2s;white-space:normal;border:1px solid rgba(255,255,255,.2);display:none}
.tooltip-box::after{content:'';position:absolute;top:100%;left:20px;border:6px solid transparent;border-top-color:#1a237e;display:none}
.tooltip-wrap:hover .tooltip-box{opacity:1}
.tooltip-box strong{display:block;margin-bottom:8px;color:var(--amber);font-size:14px;font-weight:700}
.tooltip-box ul{padding-left:18px;margin:0}
.tooltip-box ul li{margin-bottom:4px}
.pr-feats{list-style:none}
.pr-feats li{font-size:13px;color:var(--text2);padding:5px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px}
.pr-feats li:last-child{border-bottom:none}
.ck{color:var(--emerald);font-size:13px;font-weight:700}

/* SPECIAL OFFER CARD */
.offer-card{background:linear-gradient(135deg,rgba(39,174,96,.06),#fff);border:1px solid rgba(39,174,96,.3);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow)}

/* TOUR TIP */
.tour-tip{position:fixed;bottom:24px;right:24px;background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;font-size:13px;max-width:260px;z-index:200;box-shadow:var(--shadow-md);line-height:1.5;border-left:3px solid var(--amber)}
.tour-tip strong{display:block;margin-bottom:4px;color:var(--indigo);font-size:13px}
.tour-tip small{color:var(--muted);font-size:11px}

/* NOTE BOX */
.note{padding:12px 16px;border-radius:var(--radius-sm);font-size:13px;color:var(--text2);margin-top:14px}
.note-green{background:var(--emerald-bg);border:1px solid rgba(39,174,96,.2)}
.note-amber{background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.25)}
.note-blue{background:var(--blue-bg);border:1px solid rgba(41,128,185,.2)}
</style>
</head>
<body>

<!-- ════════════════ LANDING ════════════════ -->
<div id="landing">
  <div class="l-grid"></div>
  <div class="l-glow"></div>
  <div class="l-content">
    <div class="l-logo-wrap">
      <img id="landingLogo" src="" alt="Trinity">
    </div>
    <div class="l-badge">🎯 Персональное демо</div>
    <h1 class="l-title">Ваш бизнес —<br>в одной <span class="a">системе</span></h1>
    <p class="l-sub">Trinity CRM — так будет выглядеть управление вашими радиогидами, заказами и клиентами каждый день.</p>
    <div class="l-client">🎧 Israstar · Борис · 90 устройств в парке</div>
    <div class="l-pains">
      <div class="l-pain"><div class="pi">📊</div><div class="pt"><strong>Google Таблицы</strong>Вместо формул и ячеек — автоматика</div></div>
      <div class="l-pain"><div class="pi">💬</div><div class="pt"><strong>WhatsApp-хаос</strong>ИИ читает сообщения и создаёт заказы</div></div>
      <div class="l-pain"><div class="pi">📦</div><div class="pt"><strong>Склад вслепую</strong>Реальный статус каждого из 90 устройств</div></div>
      <div class="l-pain"><div class="pi">🌍</div><div class="pt"><strong>Греция / Япония</strong>Мультифилиальность встроена с первого дня</div></div>
    </div>
    <button class="btn-launch" onclick="launchApp()">▶ Открыть демо-систему</button>
  </div>
</div>

<!-- ════════════════ APP ════════════════ -->
<div id="app">

  <!-- Header -->
  <header class="hdr">
    <div class="hdr-left">
      <div class="burger" id="burger" onclick="toggleSidebar()"><span></span><span></span><span></span></div>
      <div class="hdr-logo">
        <div class="hdr-logo-box"><img id="hdrLogo" src="" alt="T"></div>
        <span class="hdr-brand">Trinity CRM</span>
      </div>
      <span class="hdr-client">Israstar</span>
    </div>
    <div class="hdr-right">
      <div class="hdr-notif" title="2 новых заказа из WhatsApp">🔔<div class="hdr-dot"></div></div>
      <div class="hdr-avatar">Б</div>
    </div>
  </header>

  <!-- Overlay + Sidebar -->
  <div class="s-overlay" id="overlay" onclick="closeSidebar()"></div>
  <div class="sidebar" id="sidebar">
    <div class="sb-hdr">
      <div class="sb-logo-box"><img id="sbLogo" src="" alt="T"></div>
      <div><div class="sb-title">Trinity CRM</div><div class="sb-client">Israstar</div></div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section">Главное</div>
      <div class="nav-item active" data-s="dashboard" onclick="go('dashboard')"><span class="ni">📊</span> Дашборд</div>
      <div class="nav-item" data-s="orders" onclick="go('orders')"><span class="ni">📋</span> Заказы <span class="nb">2</span></div>
      <div class="nav-item" data-s="inventory" onclick="go('inventory')"><span class="ni">📦</span> Склад</div>
      <div class="sb-section">Инструменты</div>
      <div class="nav-item" data-s="whatsapp" onclick="go('whatsapp')"><span class="ni">💬</span> WhatsApp ИИ <span class="nb">2</span></div>
      <div class="nav-item" data-s="calendar" onclick="go('calendar')"><span class="ni">🗓</span> Календарь</div>
      <div class="nav-item" data-s="clients" onclick="go('clients')"><span class="ni">👥</span> Клиенты</div>
      <div class="sb-section">Прочее</div>
      <div class="nav-item" data-s="portal" onclick="go('portal')"><span class="ni">🌐</span> Портал клиентов</div>
      <div class="nav-item" data-s="branches" onclick="go('branches')"><span class="ni">🌍</span> Филиалы</div>
      <div class="nav-item" data-s="pricing" onclick="go('pricing')"><span class="ni">💳</span> Условия</div>
    </nav>
    <div class="sb-footer">
      <div class="sb-avatar">Б</div>
      <div><div class="sb-name">Борис</div><div class="sb-role">Администратор · RadioGuide</div></div>
    </div>
  </div>

  <!-- Breadcrumb -->
  <div class="breadcrumb">Trinity CRM <span class="bc-sep">›</span> <span class="bc-active" id="bc">Дашборд</span></div>

  <!-- Content -->
  <div class="main">

    <!-- ═══ DASHBOARD ═══ -->
    <div id="s-dashboard" class="screen active">
      <div class="ph">
        <div><div class="ph-title">Добро пожаловать, Борис 👋</div><div class="ph-sub">Israstar · Апрель 2026</div></div>
        <button class="btn btn-amber" onclick="go('orders')">+ Новый заказ</button>
      </div>
      <div class="kpi-grid">
        <div class="kpi ka"><div class="kpi-label">Устройств в работе</div><div class="kpi-val va">41</div><div class="kpi-delta"><span class="up">↑ +6</span> с прошлой недели</div></div>
        <div class="kpi ke"><div class="kpi-label">Устройств в наличии</div><div class="kpi-val ve">49</div><div class="kpi-delta">Готовы к выдаче</div></div>
        <div class="kpi kd"><div class="kpi-label">Ремонт / потери</div><div class="kpi-val vd">0</div><div class="kpi-delta">Всё в порядке ✓</div></div>
        <div class="kpi kb"><div class="kpi-label">Активных заказов</div><div class="kpi-val vb">4</div><div class="kpi-delta">В апреле 2026</div></div>
        <div class="kpi kw"><div class="kpi-label">Ожидают возврата</div><div class="kpi-val vw">1</div><div class="kpi-delta">Слава Шифрин — 4 апр</div></div>
      </div>
      <div class="g2">
        <div class="card">
          <div class="card-hdr"><span class="card-title">🔥 Активные заказы</span><span class="hint-btn" onclick="go('orders')">Все →</span></div>
          <div class="tw">
            <table>
              <thead><tr><th>Клиент</th><th>Устройств</th><th>Дни</th><th>Тариф</th><th>Статус</th></tr></thead>
              <tbody>
                <tr><td><strong>Слава Шифрин</strong></td><td>25 + 2 рез.</td><td>2–10 апр</td><td>₪6/д</td><td><span class="pill pe">● Активен</span></td></tr>
                <tr><td><strong>Шани Гранд Тур</strong></td><td>16 + 2 рез.</td><td>3–8 апр</td><td>₪6/д</td><td><span class="pill pe">● Активен</span></td></tr>
                <tr><td><strong>Марк Глобус</strong></td><td>32 + 2 рез.</td><td>7–12 апр</td><td>₪6/д</td><td><span class="pill pb">📦 Выдача 7 апр</span></td></tr>
                <tr><td><strong>Бишвиль Ха нофлим</strong></td><td>2</td><td>1–30 апр</td><td>Ежедн.</td><td><span class="pill pa">⏳ Текущий</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-hdr"><span class="card-title">💬 WhatsApp — новые</span><span class="hint-btn" onclick="go('whatsapp')">ИИ-парсер →</span></div>
          <div class="card-body" style="padding:14px">
            <div class="wa-chat">
              <div class="ai-badge">🤖 Kira AI активна</div>
              <div class="wa-bubble"><strong style="color:#27ae60">Шимон Мейтар:</strong><br>Борис, нужно 33 гида на 26 апреля, один день, аэропорт<div class="wt">Сегодня, 09:41</div></div>
              <div style="text-align:center;color:var(--emerald);font-size:11px;margin:6px 0">↓ Kira AI распознала заказ ↓</div>
              <div class="wa-out"><strong style="color:#1a5c2a">Trinity:</strong> Заказ создан ✓ · 33 устр. + 2 рез. · 26 апр · Счёт отправлен<div class="wt">09:41</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ ORDERS ═══ -->
    <div id="s-orders" class="screen">
      <div class="ph">
        <div><div class="ph-title">Заказы</div><div class="ph-sub">Апрель 2026 · 4 активных · 2 новых из WhatsApp</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost">📥 Из WhatsApp</button>
          <button class="btn btn-amber">+ Новый заказ</button>
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><span class="card-title">Все заказы · Апрель 2026</span><span class="pill pa">⏳ Ожидают: 2</span></div>
        <div class="tw">
          <table>
            <thead><tr><th>#</th><th>Клиент</th><th>Тип</th><th>Устройств</th><th>Резерв</th><th>Начало</th><th>Конец</th><th>Тариф</th><th>Сумма</th><th>Статус</th></tr></thead>
            <tbody>
              <tr><td style="color:var(--muted)">#4001</td><td><strong>Слава Шифрин</strong><br><small style="color:var(--muted)">Гид · стандарт</small></td><td><span class="pill pm">Гид</span></td><td>25</td><td style="color:var(--muted)">+2 бесплатно</td><td>02 апр</td><td>10 апр</td><td>₪6/д</td><td style="color:var(--emerald);font-weight:600">₪1,380</td><td><span class="pill pe">● Активен</span></td></tr>
              <tr><td style="color:var(--muted)">#4002</td><td><strong>Шани Гранд Тур</strong><br><small style="color:var(--muted)">Агентство · партнёр</small></td><td><span class="pill pb">Агент.</span></td><td>16</td><td style="color:var(--muted)">+2 бесплатно</td><td>03 апр</td><td>08 апр</td><td>₪6/д</td><td style="color:var(--emerald);font-weight:600">₪840</td><td><span class="pill pe">● Активен</span></td></tr>
              <tr><td style="color:var(--muted)">#4003</td><td><strong>Марк Глобус</strong><br><small style="color:var(--muted)">Агентство · партнёр</small></td><td><span class="pill pb">Агент.</span></td><td>32</td><td style="color:var(--muted)">+2 бесплатно</td><td>07 апр</td><td>12 апр</td><td>₪6/д</td><td style="color:var(--emerald);font-weight:600">₪1,680</td><td><span class="pill pb">📦 Выдача 7 апр</span></td></tr>
              <tr style="background:rgba(245,166,35,.03)"><td style="color:var(--muted)">#4004</td><td><strong>Шимон Мейтар</strong><br><small style="color:var(--emerald)">⚡ Создано из WhatsApp</small></td><td><span class="pill pm">Гид</span></td><td>33</td><td style="color:var(--muted)">+2 бесплатно</td><td>26 апр</td><td>26 апр</td><td>₪10/д</td><td style="color:var(--warning);font-weight:600">₪330</td><td><span class="pill pa">⏳ Ожидает подтв.</span></td></tr>
              <tr style="background:rgba(245,166,35,.03)"><td style="color:var(--muted)">#4005</td><td><strong>Орталь Археологи</strong><br><small style="color:var(--emerald)">⚡ Создано из WhatsApp</small></td><td><span class="pill pm">Гид</span></td><td>35</td><td style="color:var(--muted)">+2 бесплатно</td><td>29 апр</td><td>29 апр</td><td>₪13/д</td><td style="color:var(--warning);font-weight:600">₪455</td><td><span class="pill pa">⏳ Ожидает подтв.</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="note note-green">✅ <strong>Логика резерва:</strong> система автоматически добавляет +2 устройства к каждому заказу. Они списываются со склада, но не входят в стоимость. Клиент платит только за заказанное количество.</div>
    </div>

    <!-- ═══ INVENTORY ═══ -->
    <div id="s-inventory" class="screen">
      <div class="ph"><div><div class="ph-title">Склад · Инвентарь</div><div class="ph-sub">90 устройств · Israstar · Апрель 2026</div></div></div>
      <div class="kpi-grid mb16">
        <div class="kpi ke"><div class="kpi-label">Приёмники — в наличии</div><div class="kpi-val ve">49</div><div class="kpi-delta">Жёлтые · готовы к выдаче</div></div>
        <div class="kpi ka"><div class="kpi-label">Приёмники — в работе</div><div class="kpi-val va">41</div><div class="kpi-delta">У клиентов сейчас</div></div>
        <div class="kpi kd"><div class="kpi-label">Missing / Maintenance</div><div class="kpi-val vd">0</div><div class="kpi-delta">Всё в порядке</div></div>
        <div class="kpi kb"><div class="kpi-label">Всего в парке</div><div class="kpi-val vb">90</div><div class="kpi-delta">Available Whispers</div></div>
      </div>
      <div class="g2">
        <div class="card">
          <div class="card-hdr"><span class="card-title">📊 Использование по дням — Апрель</span></div>
          <div class="tw">
            <table>
              <thead><tr><th>Клиент</th><th>Кол-во</th><th>Период</th><th>Тариф</th><th>Доступно</th></tr></thead>
              <tbody>
                <tr><td><strong>Слава Шифрин</strong></td><td>25</td><td>2–10 апр (9д)</td><td>₪6</td><td style="color:var(--emerald)">65 → 49</td></tr>
                <tr><td><strong>Шани Гранд Тур</strong></td><td>16</td><td>3–8 апр (6д)</td><td>₪6</td><td style="color:var(--emerald)">49 → 33</td></tr>
                <tr><td><strong>Марк Глобус</strong></td><td>32</td><td>7–12 апр (6д)</td><td>₪6</td><td style="color:var(--warning)">33 → 1 !</td></tr>
                <tr><td><strong>Бишвиль Ха нофлим</strong></td><td>2</td><td>весь апрель</td><td>—</td><td style="color:var(--muted)">постоянно</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-hdr"><span class="card-title">📍 Где находятся устройства</span></div>
          <div class="card-body">
            <div class="cal-row"><div class="dot" style="background:var(--emerald)"></div><div class="cal-info"><div class="cal-t">Склад Иерусалим</div><div class="cal-m"><span>49 приёмников</span><span>Готовы</span></div></div></div>
            <div class="cal-row"><div class="dot" style="background:var(--amber)"></div><div class="cal-info"><div class="cal-t">У клиентов (в работе)</div><div class="cal-m"><span>41 устройство</span><span>2–10 апр</span></div></div></div>
            <div class="cal-row"><div class="dot" style="background:var(--blue)"></div><div class="cal-info"><div class="cal-t">Аэропорт / Локер</div><div class="cal-m"><span>Выдача Шани — 3 апр</span></div></div></div>
            <div class="cal-row"><div class="dot" style="background:var(--danger)"></div><div class="cal-info"><div class="cal-t">Missing / Maintenance</div><div class="cal-m"><span>0 устройств — всё чисто</span></div></div></div>
          </div>
        </div>
      </div>
      <div class="note note-amber">⚠️ <strong>7–8 апреля:</strong> одновременно работают Слава Шифрин (25) + Шани Гранд Тур (16) + Марк Глобус (32) = 73 устройства. Остаток: 17. Система предупредит заранее при конфликте.</div>
    </div>

    <!-- ═══ WHATSAPP AI ═══ -->
    <div id="s-whatsapp" class="screen">
      <div class="ph"><div><div class="ph-title">WhatsApp · ИИ-парсер заказов</div><div class="ph-sub">Kira AI читает сообщения и создаёт заказы автоматически</div></div><span class="pill pe" style="font-size:12px;padding:5px 12px">🤖 Kira AI активна</span></div>
      <div class="card mb16">
        <div class="card-hdr"><span class="card-title">💬 Входящее сообщение → Автозаказ</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
            <div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em">Исходное сообщение</div>
              <div class="wa-chat">
                <div class="wa-bubble"><strong style="color:var(--text2)">Орталь Археологи:</strong><br>Борис шалом! Нужны гиды на группу 35 чел, 29 апреля один день, тур археология, выдача аэропорт<div class="wt">Вчера, 14:22</div></div>
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--emerald);margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em">✓ Распознано Kira AI</div>
              <div class="parsed-box">
                <div class="pf"><span class="pfl">Клиент</span><span class="pfv">Орталь Археологи</span></div>
                <div class="pf"><span class="pfl">Количество</span><span class="pfv">35 + 2 резерв</span></div>
                <div class="pf"><span class="pfl">Дата</span><span class="pfv">29 апреля 2026</span></div>
                <div class="pf"><span class="pfl">Дней</span><span class="pfv">1 день</span></div>
                <div class="pf"><span class="pfl">Место выдачи</span><span class="pfv">Аэропорт</span></div>
                <div class="pf"><span class="pfl">Тариф клиента</span><span class="pfv">₪13/устр./день</span></div>
                <div class="pf"><span class="pfl">Сумма заказа</span><span class="pfv" style="font-size:16px;color:var(--amber)">₪455</span></div>
              </div>
              <div style="margin-top:12px;display:flex;gap:10px">
                <button class="btn btn-amber" style="flex:1">✅ Подтвердить</button>
                <button class="btn btn-ghost">✏️ Изменить</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><span class="card-title">📬 Ожидают подтверждения</span></div>
        <div class="tw">
          <table>
            <thead><tr><th>Отправитель</th><th>Суть</th><th>Устройств</th><th>Дата</th><th>Тариф</th><th>Сумма</th><th>Действие</th></tr></thead>
            <tbody>
              <tr><td><strong>Шимон Мейтар</strong></td><td>Один день, аэропорт</td><td>33 + 2 рез.</td><td>26 апр</td><td>₪10/д</td><td style="color:var(--warning);font-weight:600">₪330</td><td><button class="btn btn-amber btn-sm">Подтвердить</button></td></tr>
              <tr><td><strong>Орталь Археологи</strong></td><td>Тур археология</td><td>35 + 2 рез.</td><td>29 апр</td><td>₪13/д</td><td style="color:var(--warning);font-weight:600">₪455</td><td><button class="btn btn-amber btn-sm">Подтвердить</button></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ CALENDAR ═══ -->
    <div id="s-calendar" class="screen">
      <div class="ph"><div><div class="ph-title">🗓 Календарь выдач и возвратов</div><div class="ph-sub">Апрель 2026 · Реальные данные RadioGuide</div></div></div>
      <div class="g2">
        <div class="card">
          <div class="card-hdr"><span class="card-title">📤 Выдачи</span><span class="pill pb" style="font-size:11px">Синий в Google Cal</span></div>
          <div class="card-body">
            <div class="cal-row"><div class="cal-box"><div class="cal-day">02</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Слава Шифрин — 25 устройств</div><div class="cal-m"><span>📍 Точка Иерусалим</span><span>₪1,380</span></div></div><span class="pill pe">Активен</span></div>
            <div class="cal-row"><div class="cal-box"><div class="cal-day">03</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Шани Гранд Тур — 16 устройств</div><div class="cal-m"><span>📦 Аэропорт</span><span>₪840</span></div></div><span class="pill pe">Активен</span></div>
            <div class="cal-row"><div class="cal-box"><div class="cal-day">07</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Марк Глобус — 32 устройства</div><div class="cal-m"><span>📍 Иерусалим</span><span>₪1,680</span></div></div><span class="pill pb">Завтра</span></div>
            <div class="cal-row"><div class="cal-box"><div class="cal-day">26</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Шимон Мейтар — 33 устройства</div><div class="cal-m"><span>📦 Аэропорт</span><span>₪330</span></div></div><span class="pill pa">Ожидает</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-hdr"><span class="card-title">📥 Возвраты</span><span class="pill pa" style="font-size:11px">Коричневый в Google Cal</span></div>
          <div class="card-body">
            <div class="cal-row"><div class="cal-box"><div class="cal-day">08</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Шани Гранд Тур — 16 устройств</div><div class="cal-m"><span>📦 Аэропорт</span><span>Через 5 дней</span></div></div><span class="pill pm">Через 5 дн.</span></div>
            <div class="cal-row"><div class="cal-box"><div class="cal-day">10</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Слава Шифрин — 25 устройств</div><div class="cal-m"><span>📍 Иерусалим</span><span>Через 7 дней</span></div></div><span class="pill pm">Через 7 дн.</span></div>
            <div class="cal-row"><div class="cal-box"><div class="cal-day">12</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Марк Глобус — 32 устройства</div><div class="cal-m"><span>📍 Иерусалим</span><span>Через 9 дней</span></div></div><span class="pill pm">Через 9 дн.</span></div>
            <div class="cal-row"><div class="cal-box"><div class="cal-day">26</div><div class="cal-mon">апр</div></div><div class="cal-info"><div class="cal-t">Шимон Мейтар — 33 устройства</div><div class="cal-m"><span>📦 Аэропорт</span><span>Тот же день</span></div></div><span class="pill pa">Ожидает</span></div>
          </div>
        </div>
      </div>
      <div class="note note-blue">📅 Все события автоматически синхронизируются с вашим Google Календарём. Синий = выдача, коричневый = возврат — как вы привыкли, только без ручного добавления.</div>
    </div>

    <!-- ═══ CLIENTS ═══ -->
    <div id="s-clients" class="screen">
      <div class="ph"><div><div class="ph-title">Клиенты</div><div class="ph-sub">Умные тарифы — каждому своя цена автоматически</div></div><button class="btn btn-amber">+ Добавить клиента</button></div>
      <div class="card">
        <div class="card-hdr"><span class="card-title">База клиентов · Реальные данные из таблицы Бориса</span></div>
        <div class="tw">
          <table>
            <thead><tr><th>Клиент</th><th>Тип</th><th>Тариф ₪/д</th><th>Ср. устройств</th><th>Заказов/год</th><th>Язык</th></tr></thead>
            <tbody>
              <tr><td><strong>Рина Гиль (Ярон)</strong></td><td><span class="pill pb">Орг.</span></td><td style="font-weight:600;color:var(--indigo)">₪13</td><td>34</td><td>8</td><td>🇮🇱 ивр</td></tr>
              <tr><td><strong>Ирена</strong></td><td><span class="pill pm">Гид</span></td><td style="font-weight:600;color:var(--indigo)">₪10</td><td>48</td><td>5</td><td>🇷🇺 рус</td></tr>
              <tr><td><strong>Алла Офир</strong></td><td><span class="pill pm">Гид</span></td><td style="font-weight:600;color:var(--indigo)">₪6</td><td>32</td><td>12</td><td>🇷🇺 рус</td></tr>
              <tr><td><strong>Гранд Тур (Генадий / Полячок / Шани)</strong></td><td><span class="pill pb">Агент.</span></td><td style="font-weight:600;color:var(--indigo)">₪6</td><td>21</td><td>30</td><td>🇷🇺 рус</td></tr>
              <tr><td><strong>Каспи (Калишер / Минна)</strong></td><td><span class="pill pp">VIP</span></td><td style="font-weight:600;color:var(--indigo)">₪5</td><td>32</td><td>20</td><td>🇮🇱 ивр</td></tr>
              <tr><td><strong>Шимон Мейтар</strong></td><td><span class="pill pm">Гид</span></td><td style="font-weight:600;color:var(--indigo)">₪10</td><td>33</td><td>6</td><td>🇮🇱 ивр</td></tr>
              <tr><td><strong>Орталь Археологи</strong></td><td><span class="pill pm">Гид</span></td><td style="font-weight:600;color:var(--indigo)">₪13</td><td>35</td><td>4</td><td>🇮🇱 ивр</td></tr>
              <tr><td><strong>Ашкелон Балтимор</strong></td><td><span class="pill pp">Спец.</span></td><td style="font-weight:600;color:var(--purple)">₪300 fix</td><td>10</td><td>3</td><td>🇮🇱 ивр</td></tr>
              <tr><td><strong>Орэль</strong></td><td><span class="pill pp">Спец.</span></td><td style="font-weight:600;color:var(--purple)">₪1000 fix</td><td>84</td><td>2</td><td>🇮🇱 ивр</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="note note-amber">💡 <strong>Умные тарифы:</strong> система сама знает цену для каждого клиента. Создаёте заказ — сумма считается автоматически. Никаких формул в таблицах, никакого ручного расчёта.</div>
    </div>

    <!-- ═══ PORTAL ═══ -->
    <div id="s-portal" class="screen">
      <div class="ph"><div><div class="ph-title">🌐 Клиентский портал</div><div class="ph-sub">Нажимайте на вкладки — это живое демо того, что видит ваш клиент</div></div><span class="pill pe" style="font-size:12px;padding:5px 12px">✓ Встроено в Trinity</span></div>

      <!-- PORTAL DEMO WIDGET -->
      <div style="background:#f5f6fa;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:18px">
        <!-- Portal header -->
        <div style="background:linear-gradient(90deg,#1a237e,#3949ab);padding:10px 16px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:26px;height:26px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#f5a623">T</div>
            <span style="font-size:13px;font-weight:600;color:#fff">Israstar · Личный кабинет</span>
          </div>
          <div style="display:flex;gap:4px" id="pLangBar">
            <button onclick="pLang('ru')" style="padding:4px 9px;font-size:11px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.2);color:#fff;border-radius:5px;cursor:pointer;font-weight:600">RU</button>
            <button onclick="pLang('en')" style="padding:4px 9px;font-size:11px;border:1px solid rgba(255,255,255,.25);background:transparent;color:rgba(255,255,255,.7);border-radius:5px;cursor:pointer">EN</button>
            <button onclick="pLang('he')" style="padding:4px 9px;font-size:11px;border:1px solid rgba(255,255,255,.25);background:transparent;color:rgba(255,255,255,.7);border-radius:5px;cursor:pointer">עב</button>
          </div>
        </div>

        <!-- Portal tabs -->
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border);background:#fff" id="pTabBar">
          <button onclick="pTab('home')" class="ptab ptab-active" data-tab="home">🏠 <span class="pt" data-key="nav_home">Главная</span></button>
          <button onclick="pTab('new')"  class="ptab" data-tab="new">📋 <span class="pt" data-key="nav_new">Новый заказ</span></button>
          <button onclick="pTab('orders')" class="ptab" data-tab="orders">📦 <span class="pt" data-key="nav_orders">Мои заказы</span></button>
          <button onclick="pTab('docs')" class="ptab" data-tab="docs">📄 <span class="pt" data-key="nav_docs">Документы</span></button>
        </div>

        <!-- Tab: HOME -->
        <div id="pt-home" class="ptab-content" style="padding:16px;background:#fff">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
            <div style="background:#f5f6fa;border-radius:8px;padding:12px"><div style="font-size:11px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="stat_active">Активных заказов</div><div style="font-size:22px;font-weight:700;color:#1a1a2e">3</div><div style="font-size:11px;color:#27ae60" class="pt" data-key="stat_active_sub">сейчас в работе</div></div>
            <div style="background:#f5f6fa;border-radius:8px;padding:12px"><div style="font-size:11px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="stat_devices">Устройств у меня</div><div style="font-size:22px;font-weight:700;color:#1a1a2e">47</div><div style="font-size:11px;color:#27ae60" class="pt" data-key="stat_devices_sub">из последнего заказа</div></div>
            <div style="background:#f5f6fa;border-radius:8px;padding:12px"><div style="font-size:11px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="stat_total">Заказов за год</div><div style="font-size:22px;font-weight:700;color:#1a1a2e">28</div><div style="font-size:11px;color:#27ae60" class="pt" data-key="stat_total_sub">с января 2024</div></div>
          </div>
          <div style="font-size:12px;font-weight:600;color:#4a5568;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em" class="pt" data-key="sec_upcoming">Ближайшие заказы</div>
          <div style="background:#f8f9fc;border:1px solid #e8ecf0;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
            <div><div style="font-size:13px;font-weight:500;color:#1a1a2e">#2024-041</div><div style="font-size:12px;color:#9aa3b0" class="pt" data-key="order1_dates">12 мая → 19 мая · Аэропорт</div></div>
            <div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:#9aa3b0">20 <span class="pt" data-key="dev_s">уст.</span></span><span style="background:#e8f8f0;color:#27ae60;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px" class="pt" data-key="status_active">В работе</span></div>
          </div>
          <div style="background:#f8f9fc;border:1px solid #e8ecf0;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
            <div><div style="font-size:13px;font-weight:500;color:#1a1a2e">#2024-042</div><div style="font-size:12px;color:#9aa3b0" class="pt" data-key="order2_dates">25 мая → 1 июня · Иерусалим</div></div>
            <div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:#9aa3b0">35 <span class="pt" data-key="dev_s2">уст.</span></span><span style="background:#fef3e2;color:#c17d0a;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px" class="pt" data-key="status_pending">Ожидает подтв.</span></div>
          </div>
        </div>

        <!-- Tab: NEW ORDER -->
        <div id="pt-new" class="ptab-content" style="display:none;padding:16px;background:#fff">
          <div style="background:#f8f9fc;border:1px solid #e8ecf0;border-radius:8px;padding:16px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div><label style="display:block;font-size:12px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="field_pickup">Дата выдачи</label><input type="date" value="2024-05-25" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #e8ecf0;border-radius:6px;background:#fff;color:#1a1a2e"></div>
              <div><label style="display:block;font-size:12px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="field_return">Дата возврата</label><input type="date" value="2024-06-01" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #e8ecf0;border-radius:6px;background:#fff;color:#1a1a2e"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div><label style="display:block;font-size:12px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="field_qty">Количество устройств</label><input type="number" value="20" style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #e8ecf0;border-radius:6px;background:#fff;color:#1a1a2e"></div>
              <div><label style="display:block;font-size:12px;color:#9aa3b0;margin-bottom:4px" class="pt" data-key="field_loc">Место получения</label><select style="width:100%;font-size:13px;padding:7px 10px;border:1px solid #e8ecf0;border-radius:6px;background:#fff;color:#1a1a2e"><option class="pt" data-key="loc_airport">Аэропорт Бен-Гурион</option><option class="pt" data-key="loc_jerusalem">Иерусалим</option></select></div>
            </div>
            <div style="background:#e8f8f0;border-left:2px solid #27ae60;border-radius:6px;padding:10px 12px;font-size:12px;color:#4a5568;margin-bottom:14px"><span class="pt" data-key="note_reserve">+ 2 резервных устройства добавляются автоматически. В стоимость не включаются.</span></div>
            <button style="background:linear-gradient(135deg,#f5a623,#e8960a);color:#0f1629;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer" class="pt" data-key="btn_submit">Отправить заказ</button>
          </div>
        </div>

        <!-- Tab: MY ORDERS -->
        <div id="pt-orders" class="ptab-content" style="display:none;padding:16px;background:#fff">
          <div style="display:flex;gap:6px;margin-bottom:12px" id="pFilterBar">
            <button onclick="pFilter('all')" class="pfilt pfilt-active" data-f="all"><span class="pt" data-key="f_all">Все</span></button>
            <button onclick="pFilter('active')" class="pfilt" data-f="active"><span class="pt" data-key="f_active">В работе</span></button>
            <button onclick="pFilter('pending')" class="pfilt" data-f="pending"><span class="pt" data-key="f_pending">Ожидает</span></button>
            <button onclick="pFilter('done')" class="pfilt" data-f="done"><span class="pt" data-key="f_done">Завершены</span></button>
          </div>
          <div id="pOrdersList"></div>
        </div>

        <!-- Tab: DOCS -->
        <div id="pt-docs" class="ptab-content" style="display:none;padding:16px;background:#fff">
          <div style="display:flex;gap:6px;margin-bottom:12px">
            <button onclick="pDocFilter('all')" class="pfilt pfilt-active" data-df="all"><span class="pt" data-key="df_all">Все</span></button>
            <button onclick="pDocFilter('delivery')" class="pfilt" data-df="delivery"><span class="pt" data-key="df_delivery">Накладные</span></button>
            <button onclick="pDocFilter('invoice')" class="pfilt" data-df="invoice"><span class="pt" data-key="df_invoice">Счета</span></button>
          </div>
          <div id="pDocsList"></div>
        </div>
      </div>

      <div class="note note-green">💡 <strong>Итог:</strong> клиент получает ссылку в WhatsApp, открывает портал и сам оформляет заказ — вы не тратите время на переписку.</div>
    </div>

<style>
.ptab{padding:9px 14px;font-size:12px;font-weight:500;border:none;background:transparent;color:#9aa3b0;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
.ptab-active{color:#1a237e;border-bottom-color:#1a237e;background:#f8f9fc}
.ptab:hover:not(.ptab-active){color:#4a5568;background:#f5f6fa}
.pfilt{padding:5px 12px;font-size:12px;border:1px solid #e8ecf0;border-radius:20px;background:transparent;color:#9aa3b0;cursor:pointer}
.pfilt-active{background:#e8f8f0;color:#27ae60;border-color:#27ae60}
</style>

<script>
const PT = {
  ru:{nav_home:'Главная',nav_new:'Новый заказ',nav_orders:'Мои заказы',nav_docs:'Документы',
      stat_active:'Активных заказов',stat_active_sub:'сейчас в работе',stat_devices:'Устройств у меня',stat_devices_sub:'из последнего заказа',stat_total:'Заказов за год',stat_total_sub:'с января 2024',
      sec_upcoming:'Ближайшие заказы',order1_dates:'12 мая → 19 мая · Аэропорт',order2_dates:'25 мая → 1 июня · Иерусалим',dev_s:'уст.',dev_s2:'уст.',
      status_active:'В работе',status_pending:'Ожидает подтв.',status_done:'Завершён',
      field_pickup:'Дата выдачи',field_return:'Дата возврата',field_qty:'Количество устройств',field_loc:'Место получения',
      loc_airport:'Аэропорт Бен-Гурион',loc_jerusalem:'Иерусалим',
      note_reserve:'+ 2 резервных устройства добавляются автоматически. В стоимость не включаются.',
      btn_submit:'Отправить заказ',
      f_all:'Все',f_active:'В работе',f_pending:'Ожидает',f_done:'Завершены',
      df_all:'Все',df_delivery:'Накладные',df_invoice:'Счета',
      lbl_pickup:'Выдача',lbl_return:'Возврат',lbl_loc:'Место',lbl_qty:'Устройств',lbl_total:'Сумма:',
      loc_a:'Аэропорт',loc_j:'Иерусалим',
      doc_delivery:'Накладная',doc_invoice:'Счёт на оплату',doc_for:'Заказ',btn_dl:'Скачать',currency:'₪'},
  en:{nav_home:'Home',nav_new:'New Order',nav_orders:'My Orders',nav_docs:'Documents',
      stat_active:'Active orders',stat_active_sub:'running now',stat_devices:'My devices',stat_devices_sub:'from last order',stat_total:'Orders this year',stat_total_sub:'since Jan 2024',
      sec_upcoming:'Upcoming orders',order1_dates:'May 12 → May 19 · Airport',order2_dates:'May 25 → Jun 1 · Jerusalem',dev_s:'dev.',dev_s2:'dev.',
      status_active:'Active',status_pending:'Awaiting conf.',status_done:'Completed',
      field_pickup:'Pickup date',field_return:'Return date',field_qty:'Number of devices',field_loc:'Pickup location',
      loc_airport:'Ben Gurion Airport',loc_jerusalem:'Jerusalem',
      note_reserve:'+ 2 spare devices added automatically at no charge.',
      btn_submit:'Submit order',
      f_all:'All',f_active:'Active',f_pending:'Pending',f_done:'Completed',
      df_all:'All',df_delivery:'Delivery notes',df_invoice:'Invoices',
      lbl_pickup:'Pickup',lbl_return:'Return',lbl_loc:'Location',lbl_qty:'Devices',lbl_total:'Total:',
      loc_a:'Airport',loc_j:'Jerusalem',
      doc_delivery:'Delivery note',doc_invoice:'Payment invoice',doc_for:'Order',btn_dl:'Download',currency:'₪'},
  he:{nav_home:'ראשי',nav_new:'הזמנה חדשה',nav_orders:'ההזמנות שלי',nav_docs:'מסמכים',
      stat_active:'הזמנות פעילות',stat_active_sub:'כעת בעבודה',stat_devices:'מכשירים שלי',stat_devices_sub:'מהזמנה אחרונה',stat_total:'הזמנות השנה',stat_total_sub:'מינואר 2024',
      sec_upcoming:'הזמנות קרובות',order1_dates:'12 מאי → 19 מאי · שדה תעופה',order2_dates:'25 מאי → 1 יוני · ירושלים',dev_s:'מכש.',dev_s2:'מכש.',
      status_active:'פעיל',status_pending:'ממתין לאישור',status_done:'הושלם',
      field_pickup:'תאריך איסוף',field_return:'תאריך החזרה',field_qty:'מספר מכשירים',field_loc:'מיקום איסוף',
      loc_airport:'נמל תעופה בן גוריון',loc_jerusalem:'ירושלים',
      note_reserve:'+ 2 מכשירי גיבוי מתווספים אוטומטית ללא תשלום.',
      btn_submit:'שלח הזמנה',
      f_all:'הכל',f_active:'פעיל',f_pending:'ממתין',f_done:'הושלם',
      df_all:'הכל',df_delivery:'תעודות משלוח',df_invoice:'חשבונות',
      lbl_pickup:'איסוף',lbl_return:'החזרה',lbl_loc:'מיקום',lbl_qty:'מכשירים',lbl_total:'סכום:',
      loc_a:'שדה תעופה',loc_j:'ירושלים',
      doc_delivery:'תעודת משלוח',doc_invoice:'חשבון עסקה',doc_for:'הזמנה',btn_dl:'הורד',currency:'₪'}
};

const pOrders=[
  {num:'#2024-041',status:'active',pickup:'12.05',ret:'19.05',loc:'a',qty:20,total:'1,840'},
  {num:'#2024-042',status:'pending',pickup:'25.05',ret:'01.06',loc:'j',qty:35,total:'3,220'},
  {num:'#2024-039',status:'done',pickup:'02.05',ret:'09.05',loc:'a',qty:15,total:'1,380'},
  {num:'#2024-037',status:'done',pickup:'10.04',ret:'18.04',loc:'j',qty:25,total:'2,300'}
];
const pDocs=[
  {type:'delivery',order:'#2024-041',date:'12.05.2024',size:'84 KB'},
  {type:'invoice', order:'#2024-041',date:'12.05.2024',size:'76 KB'},
  {type:'delivery',order:'#2024-039',date:'02.05.2024',size:'81 KB'},
  {type:'invoice', order:'#2024-039',date:'02.05.2024',size:'74 KB'},
];

let pCurrentLang='ru', pCurrentFilter='all', pCurrentDocFilter='all';

function pLang(l){
  pCurrentLang=l;
  const dir=l==='he'?'rtl':'ltr';
  document.querySelectorAll('#s-portal .ptab-content').forEach(el=>el.style.direction=dir);
  document.querySelectorAll('.pt[data-key]').forEach(el=>{
    const k=el.getAttribute('data-key');
    if(PT[l][k]!==undefined) el.textContent=PT[l][k];
  });
  document.querySelectorAll('#pLangBar button').forEach(btn=>{
    const active=btn.textContent.trim().toLowerCase()===l||(l==='he'&&btn.textContent.trim()==='עב');
    btn.style.background=active?'rgba(255,255,255,.2)':'transparent';
    btn.style.borderColor=active?'rgba(255,255,255,.4)':'rgba(255,255,255,.25)';
    btn.style.color=active?'#fff':'rgba(255,255,255,.7)';
    btn.style.fontWeight=active?'600':'400';
  });
  renderPOrders();renderPDocs();
}

function pTab(name){
  document.querySelectorAll('.ptab-content').forEach(el=>el.style.display='none');
  document.getElementById('pt-'+name).style.display='block';
  document.querySelectorAll('.ptab').forEach(btn=>{
    btn.classList.toggle('ptab-active',btn.dataset.tab===name);
  });
}

function pFilter(f){
  pCurrentFilter=f;
  document.querySelectorAll('#pFilterBar .pfilt').forEach(btn=>{
    btn.classList.toggle('pfilt-active',btn.dataset.f===f);
  });
  renderPOrders();
}

function pDocFilter(f){
  pCurrentDocFilter=f;
  document.querySelectorAll('[data-df]').forEach(btn=>{
    btn.classList.toggle('pfilt-active',btn.dataset.df===f);
  });
  renderPDocs();
}

function statusBadge(s,l){
  const L=PT[l];
  const styles={active:'background:#e8f8f0;color:#27ae60',pending:'background:#fef3e2;color:#c17d0a',done:'background:#f0f1f5;color:#4a5568'};
  return '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;'+styles[s]+'">'+L['status_'+s]+'</span>';
}

function renderPOrders(){
  const l=pCurrentLang, L=PT[l];
  const list=document.getElementById('pOrdersList');
  if(!list) return;
  const filtered=pCurrentFilter==='all'?pOrders:pOrders.filter(o=>o.status===pCurrentFilter);
  list.innerHTML=filtered.map(o=>\`
    <div style="background:#f8f9fc;border:1px solid #e8ecf0;border-radius:8px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600;color:#1a1a2e">\${o.num}</span>
        \${statusBadge(o.status,l)}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
        <div><div style="font-size:10px;color:#9aa3b0">\${L.lbl_pickup}</div><div style="font-size:12px;font-weight:500;color:#1a1a2e">\${o.pickup}</div></div>
        <div><div style="font-size:10px;color:#9aa3b0">\${L.lbl_return}</div><div style="font-size:12px;font-weight:500;color:#1a1a2e">\${o.ret}</div></div>
        <div><div style="font-size:10px;color:#9aa3b0">\${L.lbl_loc}</div><div style="font-size:12px;font-weight:500;color:#1a1a2e">\${o.loc==='a'?L.loc_a:L.loc_j}</div></div>
        <div><div style="font-size:10px;color:#9aa3b0">\${L.lbl_qty}</div><div style="font-size:12px;font-weight:500;color:#1a1a2e">\${o.qty}(+2)</div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e8ecf0;padding-top:8px">
        <span style="font-size:12px;color:#9aa3b0">\${L.lbl_total} <strong style="color:#1a1a2e">\${o.total} \${L.currency}</strong></span>
        <button style="font-size:11px;padding:4px 12px;border:1px solid #e8ecf0;border-radius:6px;background:#fff;color:#1a237e;cursor:pointer">📄 \${L.doc_delivery}</button>
      </div>
    </div>
  \`).join('');
}

function renderPDocs(){
  const l=pCurrentLang, L=PT[l];
  const list=document.getElementById('pDocsList');
  if(!list) return;
  const filtered=pCurrentDocFilter==='all'?pDocs:pDocs.filter(d=>d.type===pCurrentDocFilter);
  list.innerHTML=filtered.map(d=>\`
    <div style="background:#f8f9fc;border:1px solid #e8ecf0;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="width:34px;height:34px;border-radius:8px;background:\${d.type==='delivery'?'#e8f8f0':'#e8eeff'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">\${d.type==='delivery'?'📦':'📃'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${L['doc_'+d.type]} \${d.order}.pdf</div>
        <div style="font-size:11px;color:#9aa3b0">\${L.doc_for} \${d.order} · \${d.date}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span style="font-size:11px;color:#9aa3b0">\${d.size}</span>
        <button style="font-size:12px;padding:5px 12px;border:1px solid #e8ecf0;border-radius:6px;background:#fff;color:#1a1a2e;cursor:pointer">\${L.btn_dl}</button>
      </div>
    </div>
  \`).join('');
}

// Init portal on first render
document.addEventListener('DOMContentLoaded', function(){
  renderPOrders(); renderPDocs();
});
// Also init immediately in case DOM already loaded
renderPOrders(); renderPDocs();
</script>

    <!-- ═══ BRANCHES ═══ -->
    <div id="s-branches" class="screen">
      <div class="ph"><div><div class="ph-title">🌍 Филиалы</div><div class="ph-sub">Единая система — любое количество стран</div></div></div>
      <div class="branch-grid mb16">
        <div class="branch-card hq"><div class="hq-crown">Главный</div><div class="bf">🇮🇱</div><div class="bn">Израиль</div><div class="bv">90</div><div class="bs">Иерусалим + Аэропорт</div><div style="margin-top:10px"><span class="pill pe">● Активен</span></div></div>
        <div class="branch-card"><div class="bf">🇬🇷</div><div class="bn">Греция</div><div class="bv">—</div><div class="bs">Планируется · Афины</div><div style="margin-top:10px"><span class="pill pm">Скоро</span></div></div>
        <div class="branch-card"><div class="bf">🇯🇵</div><div class="bn">Япония</div><div class="bv">—</div><div class="bs">Планируется · Токио</div><div style="margin-top:10px"><span class="pill pm">Скоро</span></div></div>
        <div class="branch-card" style="border:1px dashed var(--border2);background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:150px"><div style="font-size:24px;color:var(--muted);margin-bottom:6px">+</div><div style="font-size:13px;color:var(--muted)">Добавить филиал</div></div>
      </div>
      <div class="card">
        <div class="card-hdr"><span class="card-title">Как работает мультифилиальность</span></div>
        <div class="card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px">
          <div><div style="font-size:18px;margin-bottom:7px">👁</div><div style="font-size:13px;font-weight:600;margin-bottom:4px">Полная видимость</div><div style="font-size:13px;color:var(--text2);line-height:1.6">Склад, заказы и клиенты всех филиалов — в одном дашборде</div></div>
          <div><div style="font-size:18px;margin-bottom:7px">🔒</div><div style="font-size:13px;font-weight:600;margin-bottom:4px">Изоляция данных</div><div style="font-size:13px;color:var(--text2);line-height:1.6">Сотрудник Греции видит только Грецию. Никакого пересечения</div></div>
          <div><div style="font-size:18px;margin-bottom:7px">🌐</div><div style="font-size:13px;font-weight:600;margin-bottom:4px">3 языка</div><div style="font-size:13px;color:var(--text2);line-height:1.6">Каждый офис работает на своём языке: иврит / русский / английский</div></div>
          <div><div style="font-size:18px;margin-bottom:7px">📊</div><div style="font-size:13px;font-weight:600;margin-bottom:4px">Сводная аналитика</div><div style="font-size:13px;color:var(--text2);line-height:1.6">Выручка и устройства по всем странам — в одном месте</div></div>
        </div></div>
      </div>
    </div>

    <!-- ═══ PRICING ═══ -->
    <div id="s-pricing" class="screen">
      <div class="ph"><div><div class="ph-title">Условия для Israstar</div><div class="ph-sub">Гибкий старт — платите когда бизнес работает</div></div></div>
      <div class="pricing-grid" style="grid-template-columns:1fr">
        <div class="pricing-card rec" style="max-width:480px;margin:0 auto">
          <div class="rec-badge">🎯 Ваш тариф</div>
          <div class="pr-plan">PRO — всё включено</div>
          <div class="pr-price">₪399 <span>/мес</span></div>
          <div class="tooltip-wrap">
            <span class="pr-note">+ разовая настройка системы 1,500₪</span>
            <div class="tooltip-box">
              <strong>🔧 Что входит в разовую настройку</strong>
              <ul>
                <li>Перенос клиентской базы из Google Таблиц</li>
                <li>Настройка тарифов для каждого клиента</li>
                <li>Настройка складского учёта (90 устройств)</li>
                <li>Интеграция с Google Календарём</li>
                <li>Подключение WhatsApp ИИ-парсера (Kira)</li>
                <li>Настройка клиентского портала</li>
                <li>Мультифилиальность: Израиль + 2 страны</li>
                <li>Обучение команды (2 сессии)</li>
              </ul>
            </div>
          </div>
          <ul class="pr-feats">
            <li><span class="ck">✓</span>Заказы и аренда оборудования</li>
            <li><span class="ck">✓</span>Склад — статусы, резерв +2 автоматически</li>
            <li><span class="ck">✓</span>Клиентская база с умными тарифами</li>
            <li><span class="ck">✓</span>Календарь выдач и возвратов</li>
            <li><span class="ck">✓</span>WhatsApp AI парсер — до 1,000 парсингов/мес включено</li>
            <li><span class="ck">✓</span>Каждый дополнительный парсинг — +0.5₪</li>
            <li><span class="ck">✓</span>Клиентский портал (иврит / русский / английский)</li>
            <li><span class="ck">✓</span>Накладная + счёт на email автоматически</li>
            <li><span class="ck">✓</span>Мультифилиальность (Греция, Япония)</li>
            <li><span class="ck">✓</span>Подключение WhatsApp номера включено</li>
            <li><span class="ck">✓</span>Поддержка — живой человек, быстро</li>
          </ul>
        </div>
      </div>
      <!-- 3rd card: PRO + Site bundle -->
      <div class="card mb16" style="border:2px solid rgba(245,166,35,.4);background:linear-gradient(135deg,rgba(245,166,35,.05),#fff)">
        <div class="card-hdr" style="background:linear-gradient(135deg,rgba(245,166,35,.08),#fafbfe)">
          <span class="card-title" style="font-size:15px;color:var(--indigo)">🚀 Лучшее предложение · PRO + Современный сайт</span>
          <span class="pill pa" style="font-size:12px;padding:5px 12px">Скидка на сетап</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;flex-wrap:wrap">
            <div style="text-align:center;padding:14px;background:#f8f9fc;border-radius:var(--radius-sm)">
              <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Trinity PRO</div>
              <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--indigo)">₪499<span style="font-size:12px;font-weight:400;color:var(--muted)">/мес</span></div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">Система управления</div>
            </div>
            <div style="text-align:center;padding:14px;background:#f8f9fc;border-radius:var(--radius-sm)">
              <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Новый сайт</div>
              <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--indigo)">от ₪3000</div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">Разбивка на платежи</div>
            </div>
            <div style="text-align:center;padding:14px;background:linear-gradient(135deg,rgba(245,166,35,.1),rgba(245,166,35,.03));border-radius:var(--radius-sm);border:1px solid rgba(245,166,35,.3)">
              <div style="font-size:11px;font-weight:700;color:var(--warning);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Вместе = выгода</div>
              <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--amber)">₪649<span style="font-size:12px;font-weight:400;color:var(--muted)">/мес</span></div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">Скидка на сетап + сайт ₪3000</div>
            </div>
          </div>
          <div style="margin-top:16px;padding:14px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-sm)">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">🌐 Что входит в новый сайт Israstar:</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;color:var(--text2)">
              <div>✓ Современный дизайн (не WordPress)</div>
              <div>✓ Онлайн-бронирование туров</div>
              <div>✓ Интеграция с Trinity (заказы)</div>
              <div>✓ Мобильная адаптация</div>
              <div>✓ Иврит / Английский / Русский</div>
              <div>✓ SEO + быстрая загрузка</div>
            </div>
            <div style="margin-top:10px;font-size:12px;color:var(--muted)">
              Наши примеры: <a href="https://ambersol.co.il" target="_blank" style="color:var(--indigo2)">ambersol.co.il</a> · <a href="https://beautymania.co.il" target="_blank" style="color:var(--indigo2)">beautymania.co.il</a> · <a href="https://aurelia.photo" target="_blank" style="color:var(--indigo2)">aurelia.photo</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Online payments card -->
      <div class="card mb16" style="border:1px solid rgba(91,141,239,.3);background:linear-gradient(135deg,rgba(91,141,239,.04),#fff)">
        <div class="card-hdr" style="background:linear-gradient(135deg,rgba(91,141,239,.06),#fafbfe)">
          <span class="card-title" style="color:var(--blue)">💳 Приём онлайн-платежей</span>
          <span class="pill pb" style="font-size:11px">Особые условия для клиентов Amber</span>
        </div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:12px">
                Мы подключаем вашим клиентам возможность оплачивать заказы онлайн прямо в личном кабинете:
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <span style="background:#f8f9fc;border:1px solid var(--border);border-radius:8px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px"><svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="4" fill="#1A1F71"/><path d="M15.5 16.5H13.2L14.7 7.5H17L15.5 16.5Z" fill="white"/><path d="M22.8 7.7C22.3 7.5 21.5 7.3 20.5 7.3C18.1 7.3 16.4 8.5 16.4 10.2C16.4 11.5 17.6 12.2 18.5 12.6C19.4 13 19.7 13.3 19.7 13.7C19.7 14.3 19 14.6 18.3 14.6C17.3 14.6 16.8 14.4 15.9 14L15.5 13.8L15.1 16.1C15.7 16.4 16.8 16.7 17.9 16.7C20.5 16.7 22.1 15.5 22.1 13.7C22.1 12.7 21.5 11.9 20.1 11.3C19.3 10.9 18.8 10.7 18.8 10.2C18.8 9.8 19.3 9.4 20.2 9.4C20.9 9.4 21.5 9.5 21.9 9.7L22.2 9.9L22.8 7.7Z" fill="white"/><path d="M26.1 13.4L27.1 10.6C27.1 10.6 27.3 10 27.4 9.6L27.6 10.5L28.3 13.4H26.1ZM29 7.5H27.1C26.5 7.5 26.1 7.7 25.8 8.3L22.2 16.5H24.8L25.3 15H28.5L28.8 16.5H31.1L29 7.5Z" fill="white"/><path d="M13.2 7.5L10.8 13.3L10.5 11.9C10 10.4 8.6 8.8 7 7.9L9.2 16.5H11.8L15.8 7.5H13.2Z" fill="white"/><path d="M8.4 7.5H4.3L4.3 7.7C7.4 8.5 9.4 10.4 10.2 12.7L9.3 8.4C9.1 7.8 8.8 7.5 8.4 7.5Z" fill="#FAA61A"/></svg><span style="font-size:12px;font-weight:600;color:var(--text2)">Visa</span></span>
                <span style="background:#f8f9fc;border:1px solid var(--border);border-radius:8px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px"><svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="4" fill="#252525"/><circle cx="15" cy="12" r="6" fill="#EB001B"/><circle cx="23" cy="12" r="6" fill="#F79E1B"/><path d="M19 7.27A6 6 0 0 1 21.73 12 6 6 0 0 1 19 16.73 6 6 0 0 1 16.27 12 6 6 0 0 1 19 7.27Z" fill="#FF5F00"/></svg><span style="font-size:12px;font-weight:600;color:var(--text2)">Mastercard</span></span>
                <span style="background:#f8f9fc;border:1px solid var(--border);border-radius:8px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px"><svg width="50" height="24" viewBox="0 0 50 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="24" rx="4" fill="#000000"/><path d="M13.5 8.5C13.1 9 12.5 9.4 11.9 9.4C11.8 8.8 12.1 8.2 12.4 7.8C12.8 7.3 13.5 6.9 14 6.9C14.1 7.5 13.9 8.1 13.5 8.5ZM14 9.5C13.1 9.4 12.3 10 11.9 10C11.4 10 10.7 9.5 10 9.5C9.1 9.5 8.2 10 7.7 10.8C6.7 12.5 7.4 15 8.4 16.4C8.9 17.1 9.5 17.8 10.3 17.8C11 17.8 11.3 17.4 12.1 17.4C12.9 17.4 13.2 17.8 14 17.8C14.8 17.8 15.3 17.1 15.8 16.4C16.3 15.7 16.5 15 16.5 15C16.5 15 15.1 14.4 15.1 12.8C15.1 11.4 16.2 10.8 16.2 10.8C16.2 10.8 15.5 9.6 14 9.5Z" fill="white"/><path d="M21.2 7.1V17.7H22.5V14.2H24.8C26.9 14.2 28.3 12.9 28.3 10.6C28.3 8.4 26.9 7.1 24.9 7.1H21.2ZM22.5 8.2H24.6C25.9 8.2 27 8.9 27 10.6C27 12.3 25.9 13 24.6 13H22.5V8.2Z" fill="white"/><path d="M32.5 14.4C32.5 15.6 31.6 16.4 30.3 16.4C29.4 16.4 28.8 16 28.8 15.4C28.8 14.8 29.4 14.4 30.4 14.4L32.5 14.1V14.4ZM33.7 17.7V12.5C33.7 11.1 32.8 10.3 31.1 10.3C29.6 10.3 28.5 11.1 28.3 12.3H29.5C29.7 11.7 30.3 11.3 31.1 11.3C32 11.3 32.5 11.8 32.5 12.6V13.1L30.1 13.4C28.7 13.6 27.9 14.3 27.9 15.4C27.9 16.6 28.9 17.5 30.2 17.5C31.1 17.5 31.9 17.1 32.5 16.4V17.7H33.7Z" fill="white"/><path d="M35.2 19.8C36.3 19.8 37 19.2 37.5 17.7L40 10.4H38.7L37.1 15.7L35.4 10.4H34.1L36.5 17.4L36.4 17.7C36.2 18.3 35.9 18.6 35.2 18.6H34.6V19.7H35.2V19.8Z" fill="white"/></svg><span style="font-size:12px;font-weight:600;color:var(--text2)">Apple Pay</span></span>
                <span style="background:#f8f9fc;border:1px solid var(--border);border-radius:8px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px"><svg width="52" height="24" viewBox="0 0 52 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="24" rx="4" fill="white" stroke="#DADCE0"/><text x="8" y="16" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#4285F4">G</text><text x="17" y="16" font-family="Arial,sans-serif" font-size="11" font-weight="400" fill="#3C4043">Pay</text></svg><span style="font-size:12px;font-weight:600;color:var(--text2)">Google Pay</span></span>
                <span style="background:#f8f9fc;border:1px solid var(--border);border-radius:8px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px"><svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="24" rx="4" fill="white" stroke="#E0E0E0"/><circle cx="20" cy="12" r="7" fill="#00C48C"/><text x="20" y="16" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="9" fill="white">bit</text></svg><span style="font-size:12px;font-weight:600;color:var(--text2)">Bit</span></span>
              </div>
            </div>
            <div style="text-align:center;padding:18px 24px;background:#eef0fc;border-radius:var(--radius);border:1px solid rgba(26,35,126,.15)">
              <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em">Стоимость</div>
              <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--indigo)">По запросу</div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">Обсуждается отдельно</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Special offer -->
      <div class="offer-card">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="font-size:36px">🤝</div>
          <div style="flex:1">
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px">Специальные условия для Бориса</div>
            <div style="font-size:14px;color:var(--text2);line-height:1.8">
              Мы понимаем, что туристический сектор пока стоит. Поэтому:<br>
              <strong style="color:var(--emerald)">→ Символический старт: ₪99/мес первые 2 месяца</strong> — попробуйте без риска<br>
              <strong style="color:var(--emerald)">→ Далее: ₪399/мес</strong> — подписка + WhatsApp всё включено<br>
              <strong style="color:var(--emerald)">→ Поддержка</strong> — живой человек, на русском, ответ быстро<br>
              <strong style="color:var(--emerald)">→ Бесплатный перенос</strong> всех данных из Google Таблиц в Trinity
            </div>
          </div>
          <button class="btn btn-amber" style="padding:14px 28px;font-size:15px">Начать работу</button>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- Tour Tip -->
<div class="tour-tip" id="tourTip" style="display:none">
  <strong>👆 Это ваша будущая система</strong>
  Нажимайте на пункты меню — Склад, WhatsApp ИИ, Клиенты, Филиалы, Условия.<br>
  <small>Данные взяты из вашей таблицы.</small>
</div>

<script>
const LOGO_URL = 'data:image/png;base64,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';

// Inject logo
window.addEventListener('DOMContentLoaded', () => {
  ['landingLogo','hdrLogo','sbLogo','ppLogo'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.src = LOGO_URL;
  });
  initNav();
});

const LABELS = {dashboard:'Дашборд',orders:'Заказы',inventory:'Склад',whatsapp:'WhatsApp ИИ',calendar:'Календарь',clients:'Клиенты',portal:'Портал клиентов',branches:'Филиалы',pricing:'Условия'};

function launchApp(){
  document.getElementById('landing').style.display='none';
  document.getElementById('app').style.display='block';
  setTimeout(()=>{
    const t=document.getElementById('tourTip');
    t.style.display='block';
    setTimeout(()=>t.style.display='none',8000);
  },700);
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar'),ov=document.getElementById('overlay'),b=document.getElementById('burger');
  if(sb.classList.contains('open')){closeSidebar();}
  else{sb.classList.add('open');ov.classList.add('vis');b.classList.add('open');}
}

function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('vis');
  document.getElementById('burger').classList.remove('open');
}

function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const sc=document.getElementById('s-'+name);
  if(sc) sc.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const ni=document.querySelector('.nav-item[data-s="'+name+'"]');
  if(ni) ni.classList.add('active');
  const bc=document.getElementById('bc');
  if(bc) bc.textContent=LABELS[name]||name;
  closeSidebar();
}

function initNav(){
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click',()=>go(item.dataset.s));
  });
}

// Smart tooltip positioning
document.querySelectorAll('.tooltip-wrap').forEach(wrap => {
  const box = wrap.querySelector('.tooltip-box');
  if(!box) return;
  wrap.addEventListener('mouseenter', () => {
    const rect = wrap.getBoundingClientRect();
    const bw = 290;
    const margin = 16;
    box.style.display = 'block';
    const bh = box.offsetHeight;
    let left = rect.left;
    let top = rect.top - bh - 10;
    if(left + bw > window.innerWidth - margin) left = window.innerWidth - bw - margin;
    if(left < margin) left = margin;
    if(top < margin) top = rect.bottom + 10;
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    setTimeout(()=> box.style.opacity = '1', 10);
  });
  wrap.addEventListener('mouseleave', () => {
    box.style.opacity = '0';
    setTimeout(()=> box.style.display = 'none', 220);
  });
});
</script>
`

export async function GET() {
  return new NextResponse(HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
