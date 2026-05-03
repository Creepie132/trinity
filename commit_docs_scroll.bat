@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
git add docs/TRINITY_DOCS.md
git commit -m "docs: scroll chaining fix documented in TRINITY_DOCS"
git push origin main
echo DONE
