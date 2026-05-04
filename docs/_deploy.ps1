Set-Location "F:\Amber_solutions_Kira\Trinity"
$git = "C:\Program Files\Git\cmd\git.exe"
& $git add -A 2>&1 | Out-File "docs\_git_result.txt"
& $git commit -m "chore: update CLAUDE.md deploy section, gitignore cleanup" 2>&1 | Out-File "docs\_git_result.txt" -Append
& $git push origin main 2>&1 | Out-File "docs\_git_result.txt" -Append
