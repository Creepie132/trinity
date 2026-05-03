@echo off
cd /d "F:\Amber_solutions_Kira\Trinity"
call npm run build > build_scroll_lock.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> build_scroll_lock.txt
