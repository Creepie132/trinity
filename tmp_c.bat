@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/components/visits/UnifiedVisitDialog.tsx docs/TRINITY_DOCS.md
git commit -m "fix: remove duration entirely from visit dialog"
git push origin main
