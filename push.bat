@echo off
git -C F:\Amber_solutions_Kira\Trinity add src/app/callback/route.ts email-templates/invite.html
git -C F:\Amber_solutions_Kira\Trinity commit -m "fix: callback links sales agent by email on first invite login"
git -C F:\Amber_solutions_Kira\Trinity push
