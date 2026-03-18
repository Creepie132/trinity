$base = 'F:\Amber_solutions_Kira\Trinity\src\hooks'
$out  = 'F:\Amber_solutions_Kira\Trinity\__patch_out.txt'
"Patching hooks..." | Out-File $out -Encoding UTF8

function ReadHook($name) {
    $file = "$base\$name.ts"
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $skip = 0
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { $skip = 2 }
    return [System.Text.Encoding]::UTF8.GetString($bytes, $skip, $bytes.Length - $skip)
}

function WriteHook($name, $content) {
    $file = "$base\$name.ts"
    $cleanBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    [System.IO.File]::WriteAllBytes($file, $cleanBytes)
}

$realtimeImport = "import { useRealtimeSync } from '@/hooks/useRealtimeSync'"

# ─── useSales.ts ───────────────────────────────────────────────────────────────
$c = ReadHook 'useSales'
if ($c -notmatch 'useRealtimeSync') {
    # Add import after the existing imports block (after useBranch import)
    $c = $c.Replace(
        "import { useBranch } from '@/contexts/BranchContext'",
        "import { useBranch } from '@/contexts/BranchContext'`n$realtimeImport"
    )
    # Add hook call after activeOrgId destructure in useSales()
    $c = $c.Replace(
        "export function useSales(filters?: SalesFilters) {`n  const { activeOrgId } = useBranch()",
        "export function useSales(filters?: SalesFilters) {`n  const { activeOrgId } = useBranch()`n  useRealtimeSync({ table: 'sales', orgId: activeOrgId, queryKey: ['sales'] })"
    )
    WriteHook 'useSales' $c
    "useSales.ts patched" | Out-File $out -Encoding UTF8 -Append
} else { "useSales.ts already has realtime, skipped" | Out-File $out -Encoding UTF8 -Append }

# ─── useProducts.ts ────────────────────────────────────────────────────────────
$c = ReadHook 'useProducts'
if ($c -notmatch 'useRealtimeSync') {
    $c = $c.Replace(
        "import { useBranch } from '@/contexts/BranchContext'",
        "import { useBranch } from '@/contexts/BranchContext'`n$realtimeImport"
    )
    $c = $c.Replace(
        "export function useProducts(searchQuery?: string) {`n  const { activeOrgId } = useBranch()",
        "export function useProducts(searchQuery?: string) {`n  const { activeOrgId } = useBranch()`n  useRealtimeSync({ table: 'products', orgId: activeOrgId, queryKey: ['products'] })"
    )
    WriteHook 'useProducts' $c
    "useProducts.ts patched" | Out-File $out -Encoding UTF8 -Append
} else { "useProducts.ts already has realtime, skipped" | Out-File $out -Encoding UTF8 -Append }

# ─── useInventory.ts ───────────────────────────────────────────────────────────
$c = ReadHook 'useInventory'
if ($c -notmatch 'useRealtimeSync') {
    $c = $c.Replace(
        "import { useBranch } from '@/contexts/BranchContext'",
        "import { useBranch } from '@/contexts/BranchContext'`n$realtimeImport"
    )
    $c = $c.Replace(
        "export function useInventoryTransactions(productId?: string) {`n  const { activeOrgId } = useBranch()",
        "export function useInventoryTransactions(productId?: string) {`n  const { activeOrgId } = useBranch()`n  useRealtimeSync({ table: 'inventory_transactions', orgId: activeOrgId, queryKey: ['inventory-transactions'] })"
    )
    WriteHook 'useInventory' $c
    "useInventory.ts patched" | Out-File $out -Encoding UTF8 -Append
} else { "useInventory.ts already has realtime, skipped" | Out-File $out -Encoding UTF8 -Append }

# ─── useExpenses.ts ────────────────────────────────────────────────────────────
$c = ReadHook 'useExpenses'
if ($c -notmatch 'useRealtimeSync') {
    # Add imports after existing import block
    $c = $c.Replace(
        "import { toast } from 'sonner'",
        "import { toast } from 'sonner'`nimport { useBranch } from '@/contexts/BranchContext'`n$realtimeImport"
    )
    # Patch useExpenses — add orgId + realtime before return useQuery
    $c = $c.Replace(
        "export function useExpenses(month?: string, category?: string) {`n  return useQuery<Expense[]>({",
        "export function useExpenses(month?: string, category?: string) {`n  const { activeOrgId } = useBranch()`n  useRealtimeSync({ table: 'expenses', orgId: activeOrgId, queryKey: ['expenses'] })`n  return useQuery<Expense[]>({"
    )
    # Patch useExpensesStats — add orgId + realtime
    $c = $c.Replace(
        "export function useExpensesStats(month?: string) {`n  return useQuery<ExpensesStats>({",
        "export function useExpensesStats(month?: string) {`n  const { activeOrgId } = useBranch()`n  useRealtimeSync({ table: 'expenses', orgId: activeOrgId, queryKey: ['expenses-stats'] })`n  return useQuery<ExpensesStats>({"
    )
    WriteHook 'useExpenses' $c
    "useExpenses.ts patched" | Out-File $out -Encoding UTF8 -Append
} else { "useExpenses.ts already has realtime, skipped" | Out-File $out -Encoding UTF8 -Append }

# ─── useServices.ts ────────────────────────────────────────────────────────────
$c = ReadHook 'useServices'
if ($c -notmatch 'useRealtimeSync') {
    # Add 'use client' + new imports at the top
    $c = $c.Replace(
        "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'",
        "'use client'`n`nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'`nimport { useAuth } from '@/hooks/useAuth'`n$realtimeImport"
    )
    # Patch useServices — add orgId + realtime
    $c = $c.Replace(
        "export function useServices() {`n  return useQuery({",
        "export function useServices() {`n  const { orgId } = useAuth()`n  useRealtimeSync({ table: 'services', orgId, queryKey: ['services'] })`n  return useQuery({"
    )
    WriteHook 'useServices' $c
    "useServices.ts patched" | Out-File $out -Encoding UTF8 -Append
} else { "useServices.ts already has realtime, skipped" | Out-File $out -Encoding UTF8 -Append }

# ─── useVisitServices.ts ───────────────────────────────────────────────────────
$c = ReadHook 'useVisitServices'
if ($c -notmatch 'useRealtimeSync') {
    $c = $c.Replace(
        "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'",
        "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'`nimport { useBranch } from '@/contexts/BranchContext'`n$realtimeImport"
    )
    $c = $c.Replace(
        "export function useVisitServices(visitId: string) {`n  return useQuery({",
        "export function useVisitServices(visitId: string) {`n  const { activeOrgId } = useBranch()`n  useRealtimeSync({ table: 'visit_services', orgId: activeOrgId, queryKey: ['visit-services'] })`n  return useQuery({"
    )
    WriteHook 'useVisitServices' $c
    "useVisitServices.ts patched" | Out-File $out -Encoding UTF8 -Append
} else { "useVisitServices.ts already has realtime, skipped" | Out-File $out -Encoding UTF8 -Append }

"Done." | Out-File $out -Encoding UTF8 -Append
