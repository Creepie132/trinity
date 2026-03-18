@echo off
cd /d F:\Amber_solutions_Kira\Trinity
npm run build > build_output.txt 2>&1
echo BUILD_DONE >> build_output.txt
