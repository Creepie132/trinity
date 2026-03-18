$enc = [System.Text.Encoding]::UTF8

function PatchFile($path, $oldStr, $newStr) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    # strip UTF-16 BOM if present
    $start = 0
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { $start = 2 }
    $content = $enc.GetString($bytes, $start, $bytes.Length - $start)
    if ($content.Contains($oldStr)) {
        $content = $content.Replace($oldStr, $newStr)
        $out = $enc.GetBytes($content)
        [System.IO.File]::WriteAllBytes($path, $out)
        Write-Host "Patched: $([System.IO.Path]::GetFileName($path))"
    } else {
        Write-Host "NOT FOUND in $([System.IO.Path]::GetFileName($path)): $oldStr"
    }
}

$base = "F:\Amber_solutions_Kira\Trinity\src\hooks"

# useServices.ts - add useAuth call + useRealtimeSync inside useServices()
PatchFile "$base\useServices.ts" `
    "export function useServices() {`r`n  return useQuery({`r`n    queryKey: ['services']," `
    "export function useServices() {`r`n  const { orgId } = useAuth()`r`n  useRealtimeSync({ table: 'services', orgId, queryKey: ['services'] })`r`n  return useQuery({`r`n    queryKey: ['services'],"

# useVisitServices.ts - add useBranch call + useRealtimeSync inside useVisitServices()
PatchFile "$base\useVisitServices.ts" `
    "export function useVisitServices(visitId: string) {`r`n  return useQuery({" `
    "export function useVisitServices(visitId: string) {`r`n  const { activeOrgId } = useBranch()`r`n  useRealtimeSync({ table: 'visit_services', orgId: activeOrgId, queryKey: ['visit-services'] })`r`n  return useQuery({"

Write-Host "Done."
