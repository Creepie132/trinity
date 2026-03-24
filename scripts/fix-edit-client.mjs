import { readFileSync, writeFileSync } from 'fs'

const path = 'src/components/clients/EditClientSheet.tsx'
let s = readFileSync(path, 'utf8')

const returnStart = s.indexOf('  return (')
const fieldsStart = s.indexOf('      {/* Avatar')
const fieldsEnd   = s.indexOf('      </TrinityModalShell>') + '      </TrinityModalShell>'.length
const fieldsBlock = s.slice(fieldsStart, fieldsEnd)

const newReturn = `  return (
    <Modal open={isOpen} onClose={onClose} width="560px"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      darkHeader
    >
      <TrinityModalShell
        open={isOpen}
        onClose={onClose}
        icon={<UserPen />}
        title={l.title}
        subtitle={locale === 'he' ? 'עדכן את פרטי הלקוח' : 'Обновите данные клиента'}
        dir={locale === 'he' ? 'rtl' : 'ltr'}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
            <button onClick={handleSave} disabled={saving}
              style={{
                padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: saving ? 'rgba(255,255,255,0.15)' : 'var(--trinity-accent, #4a6fa5)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: saving ? 0.6 : 1,
              }}>
              <Save size={14} />
              {saving ? l.saving : l.save}
            </button>
            <button onClick={onClose}
              style={{
                padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12,
                cursor: 'pointer', fontWeight: 500,
              }}>
              {l.cancel}
            </button>
          </div>
        }
      >
`

const newFile = s.slice(0, returnStart) + newReturn + fieldsBlock + '\n    </Modal>\n  )\n}'

writeFileSync(path, newFile, 'utf8')
console.log('done, lines:', newFile.split('\n').length)
