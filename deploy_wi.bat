@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
cd /d F:\Amber_solutions_Kira\Trinity

%GIT% add -A > git_wi.txt 2>&1
%GIT% commit -F commit_msg.txt >> git_wi.txt 2>&1
%GIT% push origin main >> git_wi.txt 2>&1
echo DONE >> git_wi.txt
