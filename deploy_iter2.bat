@echo off
cd /d F:\Amber_solutions_Kira\Trinity
del build_check.bat
git add -A
git commit -m "feat: i18n iter-2 — DashboardShell dedup LanguageProvider, broadcast full i18n"
git push origin main
