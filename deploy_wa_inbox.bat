@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/app/api/wa-inbox src/app/api/webhooks/whapi supabase/wa-inbox.sql
git commit -m "feat: wa inbox whapi integration"
git push
echo DONE
