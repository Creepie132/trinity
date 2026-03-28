@echo off
cd /d F:\Amber_solutions_Kira\Trinity
rmdir /s /q .next 2>nul
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next build > build_wi.txt 2>&1
if %ERRORLEVEL% == 0 (echo BUILD_OK >> build_wi.txt) else (echo BUILD_FAIL >> build_wi.txt)
