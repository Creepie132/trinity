@echo off
cd /d F:\Amber_solutions_Kira\Trinity
del cleanup.bat
git add -A
git commit -m "docs: update TRINITY_DOCS with VisitActionButtons"
git push origin main
