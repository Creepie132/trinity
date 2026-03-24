import { readFileSync, writeFileSync } from 'fs'

const path = 'src/components/visits/VisitDetailModal.tsx'
let s = readFileSync(path, 'utf8')
const returnIdx = s.lastIndexOf('  return (')
const before = s.slice(0, returnIdx)

const newReturn = `  return (
    <Modal open={isOpen} onClose={onClose} title={undefined} width="480px" dir={isHe ? 'rtl' : 'ltr'} showCloseButton={viewMode === 'main'}>
      {viewMode === 'main'             && renderMainView()}
      {viewMode === 'instructions'     && renderInstructionsList()}
      {viewMode === 'send-instruction' && renderSendInstruction()}
      {viewMode === 'services'         && renderServices()}
      {viewMode === 'add-service'      && renderAddService()}
      {viewMode === 'add-product'      && renderAddProduct()}
    </Modal>
  )
}`

writeFileSync(path, before + newReturn, 'utf8')
console.log('done')
