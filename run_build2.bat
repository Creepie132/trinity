@echo off
cd /d F:\Amber_solutions_Kira\Trinity
npm run build > build_result.txt 2>&1
if %ERRORLEVEL% == 0 (echo BUILD_OK >> build_result.txt) else (echo BUILD_FAIL >> build_result.txt)
