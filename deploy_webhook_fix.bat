@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/api/webhooks/whapi/route.ts
git commit -m "fix: whapi webhook use org_id from URL param"
git push
echo DONE
