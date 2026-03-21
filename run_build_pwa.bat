@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d F:\Amber_solutions_Kira\Trinity
"C:\Program Files\nodejs\node.exe" "F:\Amber_solutions_Kira\Trinity\node_modules\next\dist\bin\next" build > build_pwa.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> build_pwa.txt
