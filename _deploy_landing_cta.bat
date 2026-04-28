@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
git add "src/app/landing/page.tsx"
git commit -m "fix: landing CTA links to demo registration"
git push origin main
echo Done!
