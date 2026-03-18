@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git rm --cached __*.ps1 __*.txt deploy.bat 2>nul
git add .
git commit -m "chore: remove temp scripts from repo"
git push
echo DONE
