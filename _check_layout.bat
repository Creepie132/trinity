@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git diff src/app/layout.tsx
git log --oneline -3
echo DONE
