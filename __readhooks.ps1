$hooks = @('useSales','useProducts','useInventory','useVisitServices','useServices','useExpenses','useBranches','useOrganization')
$base = 'F:\Amber_solutions_Kira\Trinity\src\hooks'
$out = 'F:\Amber_solutions_Kira\Trinity\__hooks_content.txt'

foreach ($h in $hooks) {
    $file = "$base\$h.ts"
    if (Test-Path $file) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $skip = 0
        if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { $skip = 2 }
        $text = [System.Text.Encoding]::UTF8.GetString($bytes, $skip, $bytes.Length - $skip)
        "=== $h.ts ===" | Out-File $out -Encoding UTF8 -Append
        $text | Out-File $out -Encoding UTF8 -Append
        "" | Out-File $out -Encoding UTF8 -Append
    }
}
