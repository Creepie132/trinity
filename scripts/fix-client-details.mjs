import { readFileSync, writeFileSync } from 'fs'
const path = 'src/components/modals/ClientDetailsModal.tsx'
let s = readFileSync(path, 'utf8')
s = s.replace(
  "import Modal from '@/components/ui/Modal'\nimport { TrinityModalShell } from '@/components/ui/TrinityModalShell'",
  "import Modal from '@/components/ui/Modal'"
)
writeFileSync(path, s, 'utf8')
console.log('done')
