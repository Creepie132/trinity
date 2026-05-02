@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
call npm run build
if %errorlevel% neq 0 (
  echo BUILD FAILED
  exit /b 1
)
echo BUILD OK
git add -A
git commit -m "fix: tranzila-notify — remove non-existent last_billing_date column, set subscription_status=expired on failed charge"
git push origin main
echo DONE
