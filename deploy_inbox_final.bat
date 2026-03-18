@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add "src/app/(dashboard)/inbox/page.tsx"
git add src/app/api/webhooks/whapi/route.ts
git commit -m "fix: no flicker on send + status updates + typing indicator"
git push
echo DONE
