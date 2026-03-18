Set-Location "F:\Amber_solutions_Kira\Trinity"
git add src/app/api/admin/organizations/`[orgId`]/integrations/route.ts
git add src/components/modals/integrations/MorningIntegrationModal.tsx
git add src/app/admin/organizations/page.tsx
git commit -m "feat: add Morning (Green Invoice) integration per organization"
git push
Write-Host "EXIT:$LASTEXITCODE"
