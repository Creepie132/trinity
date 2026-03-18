@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "feat: polling fallback 3s messages + 5s conversations"
git push
echo DONE
