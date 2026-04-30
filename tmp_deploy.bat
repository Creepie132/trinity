@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
git add -A
git commit -m "fix: stopImpersonation resets user_active_branch to real org"
git push origin main
echo DONE
