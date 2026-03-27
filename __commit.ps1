Set-Location 'F:\Amber_solutions_Kira\Trinity'
$env:PATH = 'C:\Program Files\Git\bin;C:\Program Files\Git\cmd;' + $env:PATH

# Проверяем статус
git status --short > __commit_out.txt 2>&1
Write-Host "Status done, check __commit_out.txt"
