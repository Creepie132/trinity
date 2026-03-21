$file = "F:\Amber_solutions_Kira\Trinity\src\app\admin\ads\page.tsx"
$content = Get-Content $file -Raw -Encoding UTF8
$content = $content -replace 'target_categories', 'target_modules'
Set-Content $file $content -Encoding UTF8
Write-Host "Done: page.tsx"

$file2 = "F:\Amber_solutions_Kira\Trinity\src\hooks\useAdmin.ts"
$content2 = Get-Content $file2 -Raw -Encoding UTF8
$content2 = $content2 -replace 'target_categories', 'target_modules'
Set-Content $file2 $content2 -Encoding UTF8
Write-Host "Done: useAdmin.ts"
