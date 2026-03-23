@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
git add .
git commit -m "feat: sync worker UI - KPI strip in visits, recency bar + WA in clients"
git push
del "%~f0"
