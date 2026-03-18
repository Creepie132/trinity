@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "feat: optimistic update + pending spinner + read receipts in inbox"
git push
echo DONE
