const fs = require('fs')
const file = 'src/components/sales/UnifiedSalesDialog.tsx'
let c = fs.readFileSync(file, 'utf8')

// Find the ItemPickerSheet function body and patch it
// Old: hooks, then early return, then logic
// New: hooks + focus effect, early return, logic

const OLD = `  const [mounted, setMounted] = useState(false)
  const { data: services = [], isLoading: svcLoading } = useServices()
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-sale-picker'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) return []
      const json = await res.json()
      return (json.products ?? []) as Product[]
    },
  })

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (isOpen) { setStep('choose'); setSearch(''); setCustomName(''); setCustomPrice('') }
  }, [isOpen])

  if (!isOpen || !mounted) return null`

const NEW = `  const [mounted, setMounted] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const { data: services = [], isLoading: svcLoading } = useServices()
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-sale-picker'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) return []
      const json = await res.json()
      return (json.products ?? []) as Product[]
    },
  })

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (isOpen) { setStep('choose'); setSearch(''); setCustomName(''); setCustomPrice('') }
  }, [isOpen])
  // Явный фокус через ref — autoFocus не работает в портале поверх активной модалки
  useEffect(() => {
    if (!isOpen) return
    if (step === 'service' || step === 'product') {
      const t = setTimeout(() => searchInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
    if (step === 'custom') {
      const t = setTimeout(() => customInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [step, isOpen])

  if (!isOpen || !mounted) return null`

if (!c.includes(OLD)) {
  // Try to find what's actually there
  const idx = c.indexOf('const [mounted, setMounted] = useState(false)')
  console.log('OLD not found. Context around mounted:', c.substring(idx, idx+200))
  process.exit(1)
}
c = c.replace(OLD, NEW)

// Now add ref to service search input (replace autoFocus with ref)
const SVC_OLD = `                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поיסוק...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200" />`
const SVC_NEW = `                <input ref={searchInputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200" />`

// Try different placeholder spellings
const SVC_OLD2 = `                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200" />`

if (c.includes(SVC_OLD)) {
  c = c.replace(SVC_OLD, SVC_NEW)
  console.log('Patched service input (typo)')
} else if (c.includes(SVC_OLD2)) {
  c = c.replace(SVC_OLD2, SVC_NEW)
  console.log('Patched service input')
} else {
  console.log('Service input not found, skipping')
}

// Product input
const PROD_OLD = `                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />`
const PROD_NEW = `                <input ref={searchInputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isHe?'חיפוש...':'Поиск...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200" />`

if (c.includes(PROD_OLD)) {
  c = c.replace(PROD_OLD, PROD_NEW)
  console.log('Patched product input')
} else {
  console.log('Product input not found, skipping')
}

// Custom name input
const CUST_OLD = `              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus
                placeholder={isHe?'שם פריט':'Название'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />`
const CUST_NEW = `              <input ref={customInputRef} type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder={isHe?'שם פריט':'Название'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />`

if (c.includes(CUST_OLD)) {
  c = c.replace(CUST_OLD, CUST_NEW)
  console.log('Patched custom input')
} else {
  console.log('Custom input not found, skipping')
}

fs.writeFileSync(file, c)
console.log('DONE')
