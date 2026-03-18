$bytes = [System.IO.File]::ReadAllBytes('F:\Amber_solutions_Kira\Trinity\src\app\admin\organizations\page.tsx')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = $text -split "`n"
$total = $lines.Length
Write-Host "Total lines: $total"
$start = [Math]::Max(0, $total - 25)
for ($i = $start; $i -lt $total; $i++) {
  Write-Host "$($i+1): $($lines[$i])"
}
