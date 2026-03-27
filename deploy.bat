@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
cd /d "F:\Amber_solutions_Kira\Trinity"

del /f /q "null" "prev" "skeleton" > nul 2>&1

echo === STATUS === > __commit_out.txt
%GIT% status --short >> __commit_out.txt 2>&1
echo === LOG === >> __commit_out.txt
%GIT% log --oneline -6 >> __commit_out.txt 2>&1
echo DONE >> __commit_out.txt
