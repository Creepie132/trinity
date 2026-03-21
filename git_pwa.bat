@echo off
set PATH=C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%
cd /d F:\Amber_solutions_Kira\Trinity
git add src/hooks/useServiceWorker.ts src/components/UpdateBanner.tsx > git_pwa.txt 2>&1
git commit -m "feat: auto-update PWA silently on visibility change" >> git_pwa.txt 2>&1
git push >> git_pwa.txt 2>&1
echo DONE >> git_pwa.txt
