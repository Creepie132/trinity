@echo off
cd /d F:\Amber_solutions_Kira\Trinity
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next build --webpack > build_result.txt 2>&1
if %ERRORLEVEL% == 0 (echo BUILD_OK >> build_result.txt) else (echo BUILD_FAIL >> build_result.txt)
