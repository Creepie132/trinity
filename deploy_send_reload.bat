@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "fix: reload messages after send to show real status"
git push
echo DONE
