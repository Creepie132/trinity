Get-ChildItem 'F:\Amber_solutions_Kira\Trinity\src' -Recurse | Where-Object { $_.Name -match 'wa-|WaTrigger|wa_|receipt|kvit' } | Select-Object FullName
