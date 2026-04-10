import { NextResponse } from 'next/server'

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Israstar · Личный кабинет</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --indigo:#1a237e;--indigo2:#283593;--indigo3:#3949ab;
  --emerald:#27ae60;--emerald-bg:#e8f8f0;--emerald-bdr:#a8e6c8;
  --amber:#f5a623;
  --text:#1a1a2e;--text2:#4a5568;--muted:#9aa3b0;
  --bg:#f5f6fa;--white:#fff;
  --border:#e8ecf0;--border2:#d0d7de;
  --radius:10px;--radius-sm:6px;
  --shadow:0 1px 4px rgba(0,0,0,.08),0 2px 12px rgba(0,0,0,.04);
  --sb-w:224px;
}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.hdr{position:fixed;top:0;left:0;right:0;height:52px;background:linear-gradient(90deg,var(--indigo),var(--indigo2),var(--indigo3));display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:200;box-shadow:0 2px 12px rgba(0,0,0,.2)}
.hdr-left{display:flex;align-items:center;gap:10px}
.burger{display:flex;flex-direction:column;gap:5px;cursor:pointer;padding:6px;border-radius:6px}
.burger span{display:block;width:20px;height:2px;background:#fff;border-radius:2px;transition:all .28s}
.burger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.burger.open span:nth-child(2){opacity:0}
.burger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.hdr-logo{font-size:15px;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px}
.hdr-icon{width:30px;height:30px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--amber)}
.hdr-badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.85);font-size:11px;padding:2px 9px;border-radius:5px}
.hdr-right{display:flex;gap:4px}
.lb{padding:4px 9px;font-size:11px;border-radius:5px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s}
.lb.on{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-weight:600}
.lb:not(.on){background:transparent;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.6)}
.overlay{position:fixed;inset:0;background:rgba(15,22,41,.45);z-index:149;opacity:0;pointer-events:none;transition:opacity .25s}
.overlay.vis{opacity:1;pointer-events:all}
.sidebar{position:fixed;top:0;left:0;bottom:0;width:var(--sb-w);background:#fff;z-index:150;transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:4px 0 24px rgba(0,0,0,.1);display:flex;flex-direction:column}
.sidebar.open{transform:translateX(0)}
.sb-hdr{background:linear-gradient(90deg,var(--indigo),var(--indigo3));padding:0 18px;height:52px;display:flex;align-items:center;gap:10px}
.sb-icon{width:28px;height:28px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--amber)}
.sb-brand{font-size:14px;font-weight:700;color:#fff}
.sb-client{font-size:10px;color:rgba(255,255,255,.5);margin-top:1px}
.sb-nav{flex:1;padding:8px 0;overflow-y:auto}
.sb-sec{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;padding:12px 18px 5px}
.ni{display:flex;align-items:center;gap:10px;padding:10px 18px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-left:3px solid transparent;transition:all .15s;user-select:none}
.ni:hover{color:var(--text);background:#f8f9fc}
.ni.on{color:var(--indigo);background:#eef0fc;border-left-color:var(--indigo);font-weight:600}
.ni .ico{font-size:16px;width:22px;text-align:center;flex-shrink:0}
.sb-foot{padding:14px 18px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px}
.sb-av{width:34px;height:34px;background:linear-gradient(135deg,#5b8def,var(--indigo3));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
.sb-nm{font-size:13px;font-weight:600;color:var(--text)}
.sb-rl{font-size:11px;color:var(--muted)}
.main{padding-top:52px;min-height:100vh}
.content{padding:22px 20px;max-width:860px;margin:0 auto}
.screen{display:none}
.screen.on{display:block;animation:fu .3s ease}
@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.ph h1{font-size:20px;font-weight:700;color:var(--text)}
.ph p{font-size:12px;color:var(--muted);margin-top:3px}
.btn-a{background:linear-gradient(135deg,var(--amber),#e8960a);color:#0f1629;padding:9px 18px;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s}
.btn-a:hover{transform:translateY(-1px)}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
@media(max-width:560px){.kpi-grid{grid-template-columns:1fr 1fr}}
.kpi{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow)}
.kpi-lbl{font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:500}
.kpi-val{font-size:26px;font-weight:700;color:var(--text);line-height:1;margin-bottom:4px}
.kpi-sub{font-size:11px;color:var(--emerald)}
.sec-lbl{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.oc{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:8px;box-shadow:var(--shadow)}
.oc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.oc-num{font-size:13px;font-weight:600;color:var(--text)}
.badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px}
.b-a{background:var(--emerald-bg);color:var(--emerald)}
.b-p{background:rgba(245,166,35,.12);color:#c17d0a}
.b-d{background:#f0f1f5;color:var(--text2)}
.og{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
@media(max-width:560px){.og{grid-template-columns:1fr 1fr}}
.of label{display:block;font-size:10px;color:var(--muted);margin-bottom:2px}
.of span{font-size:12px;font-weight:500;color:var(--text)}
.ob{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:10px}
.ot{font-size:12px;color:var(--muted)}
.ot strong{color:var(--text)}
.oa{display:flex;gap:6px}
.bs{font-size:11px;padding:5px 12px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:#fff;color:var(--text);cursor:pointer;font-family:'Inter',sans-serif}
.bs.g{border-color:var(--emerald-bdr);color:var(--emerald)}
.filters{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.fb{padding:5px 13px;font-size:12px;border:1px solid var(--border);border-radius:100px;background:transparent;color:var(--muted);cursor:pointer;font-family:'Inter',sans-serif}
.fb.on{background:var(--emerald-bg);color:#1a7a4a;border-color:var(--emerald-bdr);font-weight:600}
.fc{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
@media(max-width:560px){.fr{grid-template-columns:1fr}}
.fg label{display:block;font-size:12px;color:var(--muted);margin-bottom:5px;font-weight:500}
.fg input,.fg select{width:100%;font-size:13px;padding:9px 11px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:#fff;color:var(--text);font-family:'Inter',sans-serif}
.fn{background:var(--emerald-bg);border-left:3px solid var(--emerald);border-radius:var(--radius-sm);padding:10px 14px;font-size:12px;color:var(--text2);margin-bottom:16px}
.fn strong{color:var(--emerald)}
.dc{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow)}
.di{width:38px;height:38px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.di-d{background:var(--emerald-bg)}.di-i{background:#e8eeff}
</style>
</head>
<body>
<header class="hdr">
  <div class="hdr-left">
    <div class="burger" id="burger" onclick="toggleSb()"><span></span><span></span><span></span></div>
    <div class="hdr-logo"><div class="hdr-icon">T</div><span>Israstar</span></div>
    <span class="hdr-badge t" data-k="badge">Личный кабинет</span>
  </div>
  <div class="hdr-right">
    <button class="lb on" onclick="setLang('ru')">RU</button>
    <button class="lb" onclick="setLang('en')">EN</button>
    <button class="lb" onclick="setLang('he')">עב</button>
  </div>
</header>
<div class="overlay" id="ov" onclick="closeSb()"></div>
<div class="sidebar" id="sb">
  <div class="sb-hdr"><div class="sb-icon">T</div><div><div class="sb-brand">Israstar</div><div class="sb-client t" data-k="badge">Личный кабинет</div></div></div>
  <nav class="sb-nav">
    <div class="sb-sec t" data-k="nav_sec">Навигация</div>
    <div class="ni on" data-s="home" onclick="go('home')"><span class="ico">🏠</span><span class="t" data-k="nav_home">Главная</span></div>
    <div class="ni" data-s="new" onclick="go('new')"><span class="ico">📋</span><span class="t" data-k="nav_new">Новый заказ</span></div>
    <div class="ni" data-s="orders" onclick="go('orders')"><span class="ico">📦</span><span class="t" data-k="nav_orders">Мои заказы</span></div>
    <div class="ni" data-s="docs" onclick="go('docs')"><span class="ico">📄</span><span class="t" data-k="nav_docs">Документы</span></div>
    <div class="ni" data-s="support" onclick="go('support')"><span class="ico">💬</span><span class="t" data-k="nav_support">Поддержка</span></div>
  </nav>
  <div class="sb-foot"><div class="sb-av">С</div><div><div class="sb-nm">Слава Шифрин</div><div class="sb-rl t" data-k="role">Гид · стандартный тариф</div></div></div>
</div>
<div class="main"><div class="content">
  <div id="s-home" class="screen on">
    <div class="ph"><div><h1 class="t" data-k="greet">Добрый день, Слава! 👋</h1><p class="t" data-k="greet_sub">Israstar · Апрель 2026</p></div><button class="btn-a t" data-k="btn_new" onclick="go('new')">+ Новый заказ</button></div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-lbl t" data-k="st1">Активных заказов</div><div class="kpi-val">3</div><div class="kpi-sub t" data-k="st1s">сейчас в работе</div></div>
      <div class="kpi"><div class="kpi-lbl t" data-k="st2">Устройств у меня</div><div class="kpi-val">47</div><div class="kpi-sub t" data-k="st2s">из последнего заказа</div></div>
      <div class="kpi"><div class="kpi-lbl t" data-k="st3">Заказов за год</div><div class="kpi-val">28</div><div class="kpi-sub t" data-k="st3s">с января 2024</div></div>
    </div>
    <div class="sec-lbl t" data-k="upcoming">Ближайшие заказы</div>
    <div class="oc"><div class="oc-top"><div class="oc-num">#2024-041</div><div class="badge b-a t" data-k="s_active">В работе</div></div><div class="og"><div class="of"><label class="t" data-k="l_pick">Выдача</label><span>12.05.2024</span></div><div class="of"><label class="t" data-k="l_ret">Возврат</label><span>19.05.2024</span></div><div class="of"><label class="t" data-k="l_loc">Место</label><span class="t" data-k="airport">Аэропорт</span></div><div class="of"><label class="t" data-k="l_qty">Устройств</label><span>25 (+2)</span></div></div></div>
    <div class="oc"><div class="oc-top"><div class="oc-num">#2024-042</div><div class="badge b-p t" data-k="s_pend">Ожидает подтв.</div></div><div class="og"><div class="of"><label class="t" data-k="l_pick">Выдача</label><span>25.05.2024</span></div><div class="of"><label class="t" data-k="l_ret">Возврат</label><span>01.06.2024</span></div><div class="of"><label class="t" data-k="l_loc">Место</label><span class="t" data-k="jerusalem">Иерусалим</span></div><div class="of"><label class="t" data-k="l_qty">Устройств</label><span>35 (+2)</span></div></div></div>
  </div>
  <div id="s-new" class="screen">
    <div class="ph"><div><h1 class="t" data-k="nav_new">Новый заказ</h1><p class="t" data-k="new_sub">Заполните форму и отправьте заявку</p></div></div>
    <div class="fc">
      <div class="fr"><div class="fg"><label class="t" data-k="f_pick">Дата выдачи</label><input type="date" value="2024-05-25"></div><div class="fg"><label class="t" data-k="f_ret">Дата возврата</label><input type="date" value="2024-06-01"></div></div>
      <div class="fr"><div class="fg"><label class="t" data-k="f_qty">Количество устройств</label><input type="number" value="20"></div><div class="fg"><label class="t" data-k="f_loc">Место получения</label><select><option class="t" data-k="airport_f">Аэропорт Бен-Гурион</option><option class="t" data-k="jerusalem_f">Иерусалим</option></select></div></div>
      <div class="fr"><div class="fg"><label class="t" data-k="f_guide">Имя гида</label><input type="text" placeholder="Слава Шифрин"></div><div class="fg"><label class="t" data-k="f_flight">Номер рейса</label><input type="text" placeholder="LY315"></div></div>
      <div class="fn"><strong>+ 2</strong> <span class="t" data-k="note">резервных устройства добавляются автоматически. В стоимость не включаются.</span></div>
      <button class="btn-a t" data-k="btn_submit">Отправить заказ</button>
    </div>
  </div>
  <div id="s-orders" class="screen">
    <div class="ph"><div><h1 class="t" data-k="nav_orders">Мои заказы</h1><p class="t" data-k="orders_sub">Апрель 2026 · 3 активных</p></div><button class="btn-a t" data-k="btn_new" onclick="go('new')">+ Новый заказ</button></div>
    <div class="filters" id="fBar"><button class="fb on" data-f="all" onclick="fO('all')"><span class="t" data-k="f_all">Все</span></button><button class="fb" data-f="active" onclick="fO('active')"><span class="t" data-k="f_act">В работе</span></button><button class="fb" data-f="pending" onclick="fO('pending')"><span class="t" data-k="f_pend">Ожидает</span></button><button class="fb" data-f="done" onclick="fO('done')"><span class="t" data-k="f_done">Завершены</span></button></div>
    <div id="oList"></div>
  </div>
  <div id="s-docs" class="screen">
    <div class="ph"><div><h1 class="t" data-k="nav_docs">Документы</h1><p class="t" data-k="docs_sub">Накладные и счета по заказам</p></div></div>
    <div class="filters" id="dfBar"><button class="fb on" data-df="all" onclick="fD('all')"><span class="t" data-k="df_all">Все</span></button><button class="fb" data-df="delivery" onclick="fD('delivery')"><span class="t" data-k="df_del">Накладные</span></button><button class="fb" data-df="invoice" onclick="fD('invoice')"><span class="t" data-k="df_inv">Счета</span></button></div>
    <div id="dList"></div>
  </div>
  <div id="s-support" class="screen">
    <div class="ph"><div><h1 class="t" data-k="nav_support">Поддержка</h1><p class="t" data-k="sup_sub">Мы всегда на связи</p></div></div>
    <div class="fc" style="text-align:center;padding:40px 20px"><div style="font-size:44px;margin-bottom:16px">💬</div><div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px" class="t" data-k="sup_title">Нужна помощь?</div><div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.7;max-width:300px;margin-left:auto;margin-right:auto" class="t" data-k="sup_desc">Пишите напрямую в WhatsApp — ответим быстро, на русском.</div><button class="btn-a">WhatsApp →</button></div>
  </div>
</div></div>
<script>
const L={ru:{badge:'Личный кабинет',nav_sec:'Навигация',nav_home:'Главная',nav_new:'Новый заказ',nav_orders:'Мои заказы',nav_docs:'Документы',nav_support:'Поддержка',role:'Гид · стандартный тариф',greet:'Добрый день, Слава! 👋',greet_sub:'Israstar · Апрель 2026',btn_new:'+ Новый заказ',st1:'Активных заказов',st1s:'сейчас в работе',st2:'Устройств у меня',st2s:'из последнего заказа',st3:'Заказов за год',st3s:'с января 2024',upcoming:'Ближайшие заказы',s_active:'В работе',s_pend:'Ожидает подтв.',s_done:'Завершён',l_pick:'Выдача',l_ret:'Возврат',l_loc:'Место',l_qty:'Устройств',airport:'Аэропорт',jerusalem:'Иерусалим',airport_f:'Аэропорт Бен-Гурион',jerusalem_f:'Иерусалим',new_sub:'Заполните форму и отправьте заявку',f_pick:'Дата выдачи',f_ret:'Дата возврата',f_qty:'Количество устройств',f_loc:'Место получения',f_guide:'Имя гида',f_flight:'Номер рейса',note:'резервных устройства добавляются автоматически. В стоимость не включаются.',btn_submit:'Отправить заказ',orders_sub:'Апрель 2026 · 3 активных',f_all:'Все',f_act:'В работе',f_pend:'Ожидает',f_done:'Завершены',lbl_tot:'Сумма:',doc_d:'Накладная',doc_i:'Счёт на оплату',doc_for:'Заказ',btn_dl:'Скачать',docs_sub:'Накладные и счета по заказам',df_all:'Все',df_del:'Накладные',df_inv:'Счета',sup_sub:'Мы всегда на связи',sup_title:'Нужна помощь?',sup_desc:'Пишите напрямую в WhatsApp — ответим быстро, на русском.',cur:'₪'},en:{badge:'Client Portal',nav_sec:'Navigation',nav_home:'Home',nav_new:'New Order',nav_orders:'My Orders',nav_docs:'Documents',nav_support:'Support',role:'Guide · standard rate',greet:'Good day, Slava! 👋',greet_sub:'Israstar · April 2026',btn_new:'+ New Order',st1:'Active orders',st1s:'running now',st2:'My devices',st2s:'from last order',st3:'Orders this year',st3s:'since Jan 2024',upcoming:'Upcoming orders',s_active:'Active',s_pend:'Awaiting conf.',s_done:'Completed',l_pick:'Pickup',l_ret:'Return',l_loc:'Location',l_qty:'Devices',airport:'Airport',jerusalem:'Jerusalem',airport_f:'Ben Gurion Airport',jerusalem_f:'Jerusalem',new_sub:'Fill in the form and submit',f_pick:'Pickup date',f_ret:'Return date',f_qty:'Number of devices',f_loc:'Pickup location',f_guide:'Guide name',f_flight:'Flight number',note:'spare devices added automatically at no charge.',btn_submit:'Submit order',orders_sub:'April 2026 · 3 active',f_all:'All',f_act:'Active',f_pend:'Pending',f_done:'Completed',lbl_tot:'Total:',doc_d:'Delivery note',doc_i:'Invoice',doc_for:'Order',btn_dl:'Download',docs_sub:'Delivery notes and invoices',df_all:'All',df_del:'Delivery notes',df_inv:'Invoices',sup_sub:'We are always available',sup_title:'Need help?',sup_desc:'Write to us on WhatsApp — we reply quickly.',cur:'₪'},he:{badge:'פורטל לקוחות',nav_sec:'ניווט',nav_home:'ראשי',nav_new:'הזמנה חדשה',nav_orders:'ההזמנות שלי',nav_docs:'מסמכים',nav_support:'תמיכה',role:'מדריך · תעריף רגיל',greet:'שלום, סלבה! 👋',greet_sub:'Israstar · אפריל 2026',btn_new:'+ הזמנה חדשה',st1:'הזמנות פעילות',st1s:'כעת בעבודה',st2:'מכשירים שלי',st2s:'מהזמנה אחרונה',st3:'הזמנות השנה',st3s:'מינואר 2024',upcoming:'הזמנות קרובות',s_active:'פעיל',s_pend:'ממתין לאישור',s_done:'הושלם',l_pick:'איסוף',l_ret:'החזרה',l_loc:'מיקום',l_qty:'מכשירים',airport:'שדה תעופה',jerusalem:'ירושלים',airport_f:'נמל תעופה בן גוריון',jerusalem_f:'ירושלים',new_sub:'מלא את הטופס ושלח בקשה',f_pick:'תאריך איסוף',f_ret:'תאריך החזרה',f_qty:'מספר מכשירים',f_loc:'מיקום איסוף',f_guide:'שם המדריך',f_flight:'מספר טיסה',note:'מכשירי גיבוי מתווספים אוטומטית ללא תשלום.',btn_submit:'שלח הזמנה',orders_sub:'אפריל 2026 · 3 פעילות',f_all:'הכל',f_act:'פעיל',f_pend:'ממתין',f_done:'הושלם',lbl_tot:'סכום:',doc_d:'תעודת משלוח',doc_i:'חשבון עסקה',doc_for:'הזמנה',btn_dl:'הורד',docs_sub:'תעודות משלוח וחשבונות',df_all:'הכל',df_del:'תעודות משלוח',df_inv:'חשבונות',sup_sub:'אנחנו תמיד זמינים',sup_title:'צריך עזרה?',sup_desc:'כתוב אלינו בוואטסאפ — נענה מהר.',cur:'₪'}};
const orders=[{n:'#2024-041',s:'active',p:'12.05',r:'19.05',l:'airport',q:25,t:'1,380'},{n:'#2024-042',s:'pending',p:'25.05',r:'01.06',l:'jerusalem',q:35,t:'3,220'},{n:'#2024-039',s:'done',p:'02.05',r:'09.05',l:'airport',q:22,t:'1,188'},{n:'#2024-037',s:'done',p:'10.04',r:'18.04',l:'jerusalem',q:20,t:'1,080'}];
const docs=[{tp:'delivery',o:'#2024-041',d:'12.05.2024',sz:'84 KB'},{tp:'invoice',o:'#2024-041',d:'12.05.2024',sz:'76 KB'},{tp:'delivery',o:'#2024-039',d:'02.05.2024',sz:'81 KB'},{tp:'invoice',o:'#2024-039',d:'02.05.2024',sz:'74 KB'}];
let lang='ru',cf='all',cdf='all';
function setLang(l){lang=l;document.body.style.direction=l==='he'?'rtl':'ltr';document.querySelectorAll('.t[data-k]').forEach(el=>{const k=el.getAttribute('data-k');if(L[l][k]!==undefined)el.textContent=L[l][k];});document.querySelectorAll('.lb').forEach(b=>{const t=b.textContent.trim();b.classList.toggle('on',t===l||(l==='he'&&t==='עב'));});rO();rD();}
function go(s){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));document.getElementById('s-'+s).classList.add('on');document.querySelectorAll('.ni').forEach(x=>x.classList.remove('on'));document.querySelector('.ni[data-s="'+s+'"]').classList.add('on');closeSb();window.scrollTo(0,0);}
function toggleSb(){const sb=document.getElementById('sb'),ov=document.getElementById('ov'),b=document.getElementById('burger');sb.classList.contains('open')?closeSb():(sb.classList.add('open'),ov.classList.add('vis'),b.classList.add('open'));}
function closeSb(){document.getElementById('sb').classList.remove('open');document.getElementById('ov').classList.remove('vis');document.getElementById('burger').classList.remove('open');}
function fO(f){cf=f;document.querySelectorAll('#fBar .fb').forEach(b=>b.classList.toggle('on',b.dataset.f===f));rO();}
function fD(f){cdf=f;document.querySelectorAll('#dfBar .fb').forEach(b=>b.classList.toggle('on',b.dataset.df===f));rD();}
function bc(s){return s==='active'?'b-a':s==='pending'?'b-p':'b-d';}
function rO(){const l=L[lang],el=document.getElementById('oList');if(!el)return;const arr=cf==='all'?orders:orders.filter(o=>o.s===cf);el.innerHTML=arr.map(o=>'<div class="oc"><div class="oc-top"><div class="oc-num">'+o.n+'</div><div class="badge '+bc(o.s)+'">'+(l['s_'+o.s]||l.s_done)+'</div></div><div class="og"><div class="of"><label>'+l.l_pick+'</label><span>'+o.p+'</span></div><div class="of"><label>'+l.l_ret+'</label><span>'+o.r+'</span></div><div class="of"><label>'+l.l_loc+'</label><span>'+(o.l==='airport'?l.airport:l.jerusalem)+'</span></div><div class="of"><label>'+l.l_qty+'</label><span>'+o.q+' (+2)</span></div></div><div class="ob"><div class="ot">'+l.lbl_tot+' <strong>'+o.t+' '+l.cur+'</strong></div><div class="oa"><button class="bs g">📄 '+l.doc_d+'</button>'+(o.s==='done'?'<button class="bs">🔄</button>':'')+'</div></div></div>').join('');}
function rD(){const l=L[lang],el=document.getElementById('dList');if(!el)return;const arr=cdf==='all'?docs:docs.filter(d=>d.tp===cdf);el.innerHTML=arr.map(d=>'<div class="dc"><div class="di '+(d.tp==='delivery'?'di-d':'di-i')+'">'+(d.tp==='delivery'?'📦':'📃')+'</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(d.tp==='delivery'?l.doc_d:l.doc_i)+' '+d.o+'.pdf</div><div style="font-size:11px;color:var(--muted)">'+l.doc_for+' '+d.o+' · '+d.d+'</div></div><div style="display:flex;align-items:center;gap:10px;flex-shrink:0"><span style="font-size:11px;color:var(--muted)">'+d.sz+'</span><button class="bs g">'+l.btn_dl+'</button></div></div>').join('');}
rO();rD();
<\/script>
</body>
</html>`

export async function GET() {
  return new NextResponse(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
