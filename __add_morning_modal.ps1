$enc = [System.Text.Encoding]::UTF8
$path = 'F:\Amber_solutions_Kira\Trinity\src\app\admin\organizations\page.tsx'
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = $enc.GetString($bytes)

$old = '      {/* ── FAB ── */}'
$new = @'
      {/* ── Morning Integration Modal ── */}
      {morningOrg && (
        <MorningIntegrationModal
          open={morningOpen}
          onClose={() => { setMorningOpen(false); setMorningOrg(null) }}
          orgId={morningOrg.id}
          orgName={morningOrg.display_name || morningOrg.name}
        />
      )}

      {/* ── FAB ── */}
'@

if ($text.Contains($old)) {
    $text = $text.Replace($old, $new)
    [System.IO.File]::WriteAllBytes($path, $enc.GetBytes($text))
    Write-Host "Morning modal added successfully"
} else {
    Write-Host "Pattern not found, trying alternative..."
    # Try finding the FAB comment by looking for the OrgsFab render
    $old2 = '      <OrgsFab onInvite={() => setInviteOpen(true)} language={language} />'
    $new2 = @'
      {morningOrg && (
        <MorningIntegrationModal
          open={morningOpen}
          onClose={() => { setMorningOpen(false); setMorningOrg(null) }}
          orgId={morningOrg.id}
          orgName={morningOrg.display_name || morningOrg.name}
        />
      )}

      <OrgsFab onInvite={() => setInviteOpen(true)} language={language} />
'@
    if ($text.Contains($old2)) {
        $text = $text.Replace($old2, $new2)
        [System.IO.File]::WriteAllBytes($path, $enc.GetBytes($text))
        Write-Host "Morning modal added via OrgsFab anchor"
    } else {
        Write-Host "ERROR: Could not find insertion point"
    }
}
