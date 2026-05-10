const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'src/components/sales/UnifiedSalesDialog.tsx')
let c = fs.readFileSync(file, 'utf8')

// 1. Add refs after mounted state
const old1 = `  const [mounted, setMounted] = useState(false)
  const { data: services = [], isLoading: svcLoading } = useServices()`

const new1 = `  const [mounted, setMounted] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const { data: services = [], isLoading: svcLoading } = useServices()`

if (!c.includes(old1)) { console.error('PATCH 1 NOT FOUND'); process.exit(1) }
c = c.replace(old1, new1)

// 2. Add focus effect after isOpen effect
const old2 = `  useEffect(() => {
    if (isOpen) { setStep('choose'); setSearch(''); setCustomName(''); setCustomPrice('') }
  }, [isOpen])

  if (!isOpen || !mounted) return null`

const new2 = `  useEffect(() => {
    if (isOpen) { setStep('choose'); setSearch(''); setCustomName(''); setCustomPrice('') }
  }, [isOpen])

  // Явный фокус через ref — autoFocus не работает в портале поверх активной модалки
  useEffect(() => {
    if (step === 'service' || step === 'product') {
      const t = setTimeout(() => searchInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
    if (step === 'custom') {
      const t = setTimeout(() => customInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [step])

  if (!isOpen || !mounted) return null`

if (!c.includes(old2)) { console.error('PATCH 2 NOT FOUND'); process.exit(1) }
c = c.replace(old2, new2)

// 3. Add ref to service search input
const old3 = `                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200" />`

const new3 = `                <input ref={searchInputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200" />`

if (!c.includes(old3)) { console.error('PATCH 3 NOT FOUND'); process.exit(1) }
c = c.replace(old3, new3)

// 4. Add ref to product search input
const old4 = `                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поיסוק...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />`

const new4 = `                <input ref={searchInputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />`

// Product input has slightly different placeholder typo - try both
if (c.includes(old4)) {
  c = c.replace(old4, new4)
} else {
  // Try exact match for product section
  const old4b = `                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />`
  if (c.includes(old4b)) {
    c = c.replace(old4b, new4)
  } else {
    console.error('PATCH 4 NOT FOUND')
    process.exit(1)
  }
}

// 5. Add ref to custom name input
const old5 = `              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus
                placeholder={isHe?'שם פריט':'Название'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />`

const new5 = `              <input ref={customInputRef} type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder={isHe?'שם פריט':'Название'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />`

if (!c.includes(old5)) { console.error('PATCH 5 NOT FOUND'); process.exit(1) }
c = c.replace(old5, new5)

fs.writeFileSync(file, c)
console.log('ALL PATCHES APPLIED OK')
