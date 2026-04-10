@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/api/sales/route.ts
git commit -m "fix: sales POST returns full sale object for mobile DataStore"
git push origin main
