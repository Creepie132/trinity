@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
"C:\Program Files\Git\bin\git.exe" add src/app/(dashboard)/settings/bestsellers/page.tsx > fix_out.txt 2>&1
"C:\Program Files\Git\bin\git.exe" commit -m "fix: bestsellers page useAuth orgId (not activeOrgId)" >> fix_out.txt 2>&1
"C:\Program Files\Git\bin\git.exe" push origin main >> fix_out.txt 2>&1
