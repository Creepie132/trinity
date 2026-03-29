Set-Location "F:\Amber_solutions_Kira\Trinity"
git add src/app/api/webhooks/whapi/route.ts src/components/wa/WaNotificationProvider.tsx
git commit -m "feat: whatsapp outgoing sync realtime toasts"
git push origin main
git push origin main:production
Remove-Item "F:\Amber_solutions_Kira\Trinity\_push.ps1"
