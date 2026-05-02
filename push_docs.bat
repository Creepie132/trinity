@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
git add docs\TRINITY_DOCS.md
git commit -m "docs: security changes 03.05.2026 — two-phase commit, LIMIT 25, IP allowlist"
git push origin main
echo DONE
