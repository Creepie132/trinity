Set-Location 'F:\Amber_solutions_Kira\Trinity'
$env:PATH = 'C:\Program Files\Git\bin;C:\Program Files\Git\cmd;' + $env:PATH

git add `
  src/app/api/admin/organizations/`[orgId`]/receipt-settings/route.ts `
  src/app/api/payments/`[id`]/auto-send-receipt/route.ts `
  src/components/modals/integrations/ReceiptSettingsModal.tsx `
  src/app/admin/organizations/page.tsx

git status --short > __commit_out.txt 2>&1
git commit -m "feat: per-org automatic WhatsApp receipt settings

- DB: org_receipt_settings table (provider, trigger_events, message_template, is_enabled)
- API: GET/PUT /api/admin/organizations/[orgId]/receipt-settings
- API: POST /api/payments/[id]/auto-send-receipt (Whapi + Tranzila, internal auth)
- UI: ReceiptSettingsModal (3-step WizardModal: Provider → Triggers → Message)
- Admin org panel: 'Квитанции/קבלות' button opens ReceiptSettingsModal per org" >> __commit_out.txt 2>&1

git push >> __commit_out.txt 2>&1
Write-Host "done"
