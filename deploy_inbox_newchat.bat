@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add "src/app/(dashboard)/inbox/page.tsx"
git add src/app/api/wa-inbox/conversations/route.ts
git commit -m "feat: wa inbox new chat button and manual conversation creation"
git push
echo DONE
