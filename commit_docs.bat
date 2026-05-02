@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
del /f /q build_and_push.bat cleanup.bat do_fix.bat fix_out.txt grep_out.txt 2>nul
git add -A
git commit -m "docs: update TRINITY_DOCS.md — tranzila-notify bugfix changelog 02.05.2026"
git push origin main
echo DONE
