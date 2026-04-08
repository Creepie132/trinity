@echo off
cd /d F:\Amber_solutions_Kira\Trinity
del commit.bat
git add -A
git commit -m "chore: remove temp commit.bat"
git push origin main
