@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
call npm run build
if %errorlevel% neq 0 (
  echo BUILD FAILED
  exit /b 1
)
git add -A
git commit -m "security: two-phase commit for installments, LIMIT 25 batch, IP allowlist for tranzila-notify"
git push origin main
echo DONE
