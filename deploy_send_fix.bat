@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/api/wa-inbox/send/route.ts
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "fix: vault read secret + single/double checkmarks"
git push
echo DONE
