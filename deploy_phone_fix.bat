@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/api/wa-inbox/send/route.ts
git add src/app/api/webhooks/whapi/route.ts
git commit -m "fix: normalize IL phone format for Whapi 0524... to 972524..."
git push
echo DONE
