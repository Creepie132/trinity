@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/layout.tsx
git commit -m "fix(landing): skip getUserPreferences() for /landing to prevent 504 timeout"
git push origin main
echo DONE
