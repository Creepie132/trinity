@echo off
cd /d F:\Amber_solutions_Kira\Trinity
git add src/components/admin/ImpersonationBanner.tsx
git commit -m "fix: remove unused useRouter from ImpersonationBanner"
git push origin main
del F:\Amber_solutions_Kira\Trinity\_build.bat
del F:\Amber_solutions_Kira\Trinity\_deploy.bat
del F:\Amber_solutions_Kira\Trinity\_commit.bat
echo DONE
