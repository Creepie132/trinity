@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/api/wa-inbox/send/route.ts
git commit -m "fix: use get_wa_api_key RPC instead of vault direct query"
git push
echo DONE
