$bytes = [System.IO.File]::ReadAllBytes('F:\Amber_solutions_Kira\Trinity\src\app\admin\organizations\page.tsx')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = $text -split "`n"
for ($i = 1048; $i -lt 1070; $i++) {
  Write-Host "$($i+1): $($lines[$i])"
}
