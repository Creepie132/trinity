Set-Location "F:\Amber_solutions_Kira\Trinity"
git add src/hooks/useSales.ts src/hooks/useProducts.ts src/hooks/useInventory.ts src/hooks/useExpenses.ts src/hooks/useServices.ts src/hooks/useVisitServices.ts
git commit -m "feat: add useRealtimeSync to all remaining data hooks"
git push
Write-Host "EXIT:$LASTEXITCODE"
