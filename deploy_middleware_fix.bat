@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add middleware.ts
git commit -m "fix: allow webhooks without auth in middleware"
git push
echo DONE
