'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// מלבי — Afridar, Ashkelon
const MALBI_LAT = 31.6693
const MALBI_LNG = 34.5698

// ─── Real Ashkelon addresses with coordinates ─────────────────────────────────
const ASHKELON_ADDRESSES = [
  { name: 'הרצל 22',          lat: 31.6674, lng: 34.5712 },
  { name: 'בן גוריון 45',     lat: 31.6691, lng: 34.5731 },
  { name: 'רוטשילד 8',        lat: 31.6658, lng: 34.5698 },
  { name: "ז'בוטינסקי 15",    lat: 31.6703, lng: 34.5756 },
  { name: 'ויצמן 3',          lat: 31.6645, lng: 34.5669 },
  { name: 'הנשיא 30',         lat: 31.6720, lng: 34.5680 },
  { name: 'שדרות בן גוריון 12', lat: 31.6699, lng: 34.5743 },
  { name: 'הפלמ"ח 7',         lat: 31.6683, lng: 34.5722 },
  { name: 'הבנים 18',         lat: 31.6671, lng: 34.5689 },
  { name: 'קפלן 5',           lat: 31.6662, lng: 34.5705 },
  { name: 'עגנון 11',         lat: 31.6715, lng: 34.5768 },
  { name: 'ביאליק 4',         lat: 31.6648, lng: 34.5680 },
  { name: 'שמאי 9',           lat: 31.6637, lng: 34.5713 },
  { name: 'המלך דוד 22',      lat: 31.6728, lng: 34.5695 },
  { name: 'הנביאים 14',       lat: 31.6655, lng: 34.5735 },
  { name: 'ארלוזורוב 6',      lat: 31.6680, lng: 34.5748 },
  { name: 'בורוכוב 3',        lat: 31.6692, lng: 34.5710 },
  { name: 'קצנלסון 8',        lat: 31.6667, lng: 34.5725 },
  { name: 'טרומפלדור 17',     lat: 31.6641, lng: 34.5690 },
  { name: 'שטרן 21',          lat: 31.6709, lng: 34.5762 },
]

function randAddress(excludeIdx?: number) {
  let idx = Math.floor(Math.random() * ASHKELON_ADDRESSES.length)
  if (excludeIdx !== undefined && idx === excludeIdx) idx = (idx + 1) % ASHKELON_ADDRESSES.length
  return { ...ASHKELON_ADDRESSES[idx], idx }
}

// ─── Courier state with waypoint system ───────────────────────────────────────
interface CourierState {
  id: number; name: string; initials: string
  color: string; bg: string; tc: string
  lat: number; lng: number
  targetLat: number; targetLng: number
  targetFromName: string; targetToName: string
  orders: number; avgTime: number; earn: number
  status: 'active' | 'break'
  orderMin: number
}

function initCourier(id: number, name: string, initials: string,
  color: string, bg: string, tc: string,
  orders: number, avgTime: number, earn: number,
  status: 'active' | 'break'): CourierState {
  const from = randAddress()
  const to = randAddress(from.idx)
  return {
    id, name, initials, color, bg, tc,
    lat: from.lat, lng: from.lng,
    targetLat: to.lat, targetLng: to.lng,
    targetFromName: from.name, targetToName: to.name,
    orders, avgTime, earn, status,
    orderMin: Math.floor(Math.random() * 20) + 3,
  }
}

const INIT_COURIERS: CourierState[] = [
  initCourier(1, 'דניאל כהן', 'דכ', '#10b981', '#d1fae5', '#065f46', 14, 18, 280, 'active'),
  initCourier(2, 'יוסי לוי',  'יל', '#3b82f6', '#dbeafe', '#1e40af', 11, 22, 220, 'active'),
  initCourier(3, 'אמיר ברק',  'אב', '#f59e0b', '#fef3c7', '#78350f',  9, 20, 180, 'active'),
  initCourier(4, 'מיכאל גל', 'מג', '#94a3b8', '#f1f5f9', '#475569',  7, 25, 140, 'break'),
]

// ─── Move courier one step toward target, pick new target on arrival ──────────
function stepCourier(c: CourierState): CourierState {
  if (c.status !== 'active') return c

  const SPEED = 0.0004 // ~44m per tick (2s) — realistic moped speed
  const dLat = c.targetLat - c.lat
  const dLng = c.targetLng - c.lng
  const dist = Math.sqrt(dLat * dLat + dLng * dLng)

  // Arrived at destination — pick new waypoint
  if (dist < SPEED * 1.2) {
    const newFrom = { name: c.targetToName, lat: c.targetLat, lng: c.targetLng, idx: -1 }
    const newTo = randAddress()
    return {
      ...c,
      lat: c.targetLat, lng: c.targetLng,
      targetLat: newTo.lat, targetLng: newTo.lng,
      targetFromName: newFrom.name, targetToName: newTo.name,
      orderMin: Math.floor(Math.random() * 20) + 3,
      orders: c.orders + 1,
      earn: c.earn + 20,
    }
  }

  // Move toward target with tiny jitter (natural movement)
  const ratio = SPEED / dist
  const jitter = 0.000035
  return {
    ...c,
    lat: c.lat + dLat * ratio + (Math.random() - 0.5) * jitter,
    lng: c.lng + dLng * ratio + (Math.random() - 0.5) * jitter,
    orderMin: c.orderMin < 35 ? c.orderMin + 1 : 1,
  }
}

// ─── Icon & popup ─────────────────────────────────────────────────────────────
function makeCourierIcon(L: any, c: CourierState) {
  const active = c.status === 'active'
  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="56" viewBox="0 0 46 56">
    <circle cx="23" cy="23" r="21" fill="${c.color}" stroke="white" stroke-width="3"/>
    <text x="23" y="28" text-anchor="middle" fill="white" font-size="13"
      font-family="'Segoe UI',Arial,sans-serif" font-weight="800">${c.initials}</text>
    <polygon points="15,41 31,41 23,56" fill="${c.color}"/>
    ${active ? `<circle cx="38" cy="8" r="7" fill="#10b981" stroke="white" stroke-width="2"/>
    <circle cx="38" cy="8" r="3.5" fill="white"/>` : ''}
  </svg>`
  return L.divIcon({ html, className: '', iconSize: [46, 56], iconAnchor: [23, 56], popupAnchor: [0, -58] })
}

function makePopupHtml(c: CourierState) {
  const lbl: Record<string, string> = { active: 'בדרך 🛵', break: 'הפסקה ☕' }
  const orderBlock = c.status === 'active'
    ? `<div style="background:#eff6ff;border-right:3px solid #3b82f6;border-radius:8px;padding:10px 12px;margin-top:10px">
        <div style="font-size:11px;font-weight:800;color:#1d4ed8;margin-bottom:5px">📦 הזמנה פעילה</div>
        <div style="font-size:12px;color:#334155">${c.targetFromName} ← ${c.targetToName}</div>
        <div style="font-size:14px;font-weight:800;color:#dc2626;margin-top:5px">⏱ ${c.orderMin} דקות בדרך</div>
       </div>`
    : `<div style="margin-top:8px;font-size:12px;color:#94a3b8;text-align:center">אין הזמנה פעילה</div>`
  return `<div style="padding:14px 16px;direction:rtl;font-family:'Segoe UI',Arial,sans-serif;min-width:200px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:38px;height:38px;border-radius:50%;background:${c.bg};color:${c.tc};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800">${c.initials}</div>
      <div>
        <div style="font-size:15px;font-weight:800;color:#1e293b">${c.name}</div>
        <div style="font-size:11px;font-weight:600;color:${c.color}">${lbl[c.status] ?? c.status}</div>
      </div>
    </div>
    <div style="border-top:1px solid #f1f5f9;padding-top:8px">
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px">
        <span style="color:#64748b">הזמנות היום</span><span style="font-weight:700;color:#1e293b">${c.orders}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px">
        <span style="color:#64748b">זמן ממוצע</span><span style="font-weight:700;color:#1e293b">${c.avgTime} דק'</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px">
        <span style="color:#64748b">שכר היום</span><span style="font-weight:700;color:#059669">₪${c.earn}</span>
      </div>
    </div>
    ${orderBlock}
  </div>`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CourierMapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Record<number, any>>({})
  const couriersRef = useRef<CourierState[]>(INIT_COURIERS)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [, setTick] = useState(0)

  // Load Leaflet CSS
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const initMap = () => {
      const L = (window as any).L
      if (!L) return
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
        .setView([MALBI_LAT, MALBI_LNG], 14)
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      // Store
      L.marker([MALBI_LAT, MALBI_LNG], { icon: L.divIcon({
        html: `<div style="background:#1e3a8a;color:white;border-radius:10px;padding:5px 11px;font-size:13px;font-weight:800;white-space:nowrap;border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3)">🍾 מלבי</div>`,
        className: '', iconAnchor: [38, 18],
      }) }).addTo(map)
      // Courier markers
      couriersRef.current.forEach(c => {
        const marker = L.marker([c.lat, c.lng], { icon: makeCourierIcon(L, c) })
          .addTo(map).bindPopup(makePopupHtml(c), { maxWidth: 260, minWidth: 220 })
        marker.on('click', () => setSelectedId(c.id))
        markersRef.current[c.id] = marker
      })
    }
    if ((window as any).L) { initMap(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = initMap
    document.head.appendChild(script)
  }, [])

  // Live GPS simulation — waypoint-based, stays inside Ashkelon
  useEffect(() => {
    const interval = setInterval(() => {
      const L = (window as any).L
      if (!L || !mapInstanceRef.current) return
      couriersRef.current = couriersRef.current.map(c => {
        const updated = stepCourier(c)
        const marker = markersRef.current[c.id]
        if (marker) {
          marker.setLatLng([updated.lat, updated.lng])
          marker.setIcon(makeCourierIcon(L, updated))
          if (marker.isPopupOpen()) marker.setPopupContent(makePopupHtml(updated))
        }
        return updated
      })
      setTick(t => t + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const flyTo = (id: number) => {
    const c = couriersRef.current.find(x => x.id === id)
    if (!c || !mapInstanceRef.current) return
    mapInstanceRef.current.flyTo([c.lat, c.lng], 16, { duration: 0.8 })
    setTimeout(() => markersRef.current[id]?.openPopup(), 900)
    setSelectedId(id)
  }

  const activeCount = couriersRef.current.filter(c => c.status === 'active').length
  const totalOrders = couriersRef.current.reduce((s, c) => s + c.orders, 0)

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-lg" dir="rtl">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/admin/presentations/courier"
          className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 rotate-180" />
          דשבורד
        </Link>
        <span className="text-slate-600">|</span>
        <span className="text-white font-bold text-sm">🗺 מפה חיה — אשקלון</span>
        <div className="mr-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            GPS חי
          </span>
          <span className="text-xs text-slate-400">{activeCount}/{couriersRef.current.length} פעילים · {totalOrders} הזמנות</span>
        </div>
      </div>
      <div ref={mapRef} className="flex-1 w-full" />
      <div className="bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex overflow-x-auto gap-2 p-3">
          {couriersRef.current.map(c => (
            <button key={c.id} onClick={() => flyTo(c.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-all flex-shrink-0 ${selectedId === c.id ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
              style={{ background: c.bg }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: c.color }}>{c.initials}</div>
              <div className="text-right">
                <div className="font-semibold text-xs" style={{ color: c.tc }}>{c.name}</div>
                <div className="text-xs" style={{ color: c.color }}>
                  {c.status === 'active' ? `${c.orderMin} דק'` : 'הפסקה'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
