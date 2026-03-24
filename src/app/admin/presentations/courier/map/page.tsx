'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// מלבי — Afridar, Ashkelon (marked on map)
const MALBI_LAT = 31.6693
const MALBI_LNG = 34.5698

const COURIERS = [
  { id: 1, name: 'דניאל כהן', initials: 'דכ', color: '#10b981', bg: '#d1fae5', tc: '#065f46',
    lat: 31.672, lng: 34.573, dl: 0.00022, dg: 0.00031,
    orders: 14, avgTime: 18, earn: 280, status: 'active',
    order: { from: 'הרצל 22', to: 'בן גוריון 45', min: 14 } },
  { id: 2, name: 'יוסי לוי', initials: 'יל', color: '#3b82f6', bg: '#dbeafe', tc: '#1e40af',
    lat: 31.663, lng: 34.579, dl: -0.00018, dg: 0.00025,
    orders: 11, avgTime: 22, earn: 220, status: 'active',
    order: { from: 'רוטשילד 8', to: 'ז\'בוטינסקי 15', min: 8 } },
  { id: 3, name: 'אמיר ברק', initials: 'אב', color: '#f59e0b', bg: '#fef3c7', tc: '#78350f',
    lat: 31.671, lng: 34.566, dl: 0.00010, dg: -0.00022,
    orders: 9, avgTime: 20, earn: 180, status: 'active',
    order: { from: 'ויצמן 3', to: 'הנשיא 30', min: 5 } },
  { id: 4, name: 'מיכאל גל', initials: 'מג', color: '#94a3b8', bg: '#f1f5f9', tc: '#475569',
    lat: 31.665, lng: 34.562, dl: 0, dg: 0,
    orders: 7, avgTime: 25, earn: 140, status: 'break', order: null },
]

function makeCourierIcon(L: any, c: (typeof COURIERS)[0]) {
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

function makePopupHtml(c: (typeof COURIERS)[0]) {
  const lbl: Record<string, string> = { active: 'בדרך 🛵', break: 'הפסקה ☕', idle: 'פנוי' }
  const orderBlock = c.order
    ? `<div style="background:#eff6ff;border-right:3px solid #3b82f6;border-radius:8px;padding:10px 12px;margin-top:10px">
        <div style="font-size:11px;font-weight:800;color:#1d4ed8;margin-bottom:5px">📦 הזמנה פעילה</div>
        <div style="font-size:12px;color:#334155">${c.order.from} ← ${c.order.to}</div>
        <div style="font-size:14px;font-weight:800;color:#dc2626;margin-top:5px">⏱ ${c.order.min} דקות בדרך</div>
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

export default function CourierMapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Record<number, any>>({})
  const couriersRef = useRef(COURIERS.map(c => ({ ...c })))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const initMap = () => {
      const L = (window as any).L
      if (!L) return
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
        .setView([MALBI_LAT, MALBI_LNG], 14)
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      L.marker([MALBI_LAT, MALBI_LNG], { icon: L.divIcon({
        html: `<div style="background:#1e3a8a;color:white;border-radius:10px;padding:5px 11px;font-size:13px;font-weight:800;white-space:nowrap;border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3)">🍾 מלבי</div>`,
        className: '', iconAnchor: [38, 18],
      }) }).addTo(map)
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

  useEffect(() => {
    const interval = setInterval(() => {
      const L = (window as any).L
      if (!L || !mapInstanceRef.current) return
      couriersRef.current = couriersRef.current.map(c => {
        if (c.status !== 'active') return c
        const newLat = Math.max(31.650, Math.min(31.692, c.lat + c.dl + (Math.random() - 0.5) * 0.00008))
        const newLng = Math.max(34.548, Math.min(34.596, c.lng + c.dg + (Math.random() - 0.5) * 0.00008))
        const newMin = c.order ? (c.order.min % 34) + 1 : null
        const updated = { ...c, lat: newLat, lng: newLng,
          order: c.order && newMin ? { ...c.order, min: newMin } : c.order }
        const marker = markersRef.current[c.id]
        if (marker) {
          marker.setLatLng([newLat, newLng])
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
                  {c.status === 'active' ? `${c.order?.min ?? 0} דק'` : 'הפסקה'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
