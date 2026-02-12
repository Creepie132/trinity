# 🔄 Loading Animation - Remaining Tasks

## ✅ Completed
1. ✅ LoadingScreen component created
2. ✅ LoadingSpinner component created
3. ✅ visits/page.tsx updated
4. ✅ clients/page.tsx updated
5. ✅ CSS animations added (fade-in)

## ⏳ TODO - Add LoadingScreen to remaining pages

### Dashboard Pages
- [ ] `src/app/(dashboard)/dashboard/page.tsx`
- [ ] `src/app/(dashboard)/payments/page.tsx`
- [ ] `src/app/(dashboard)/analytics/page.tsx`
- [ ] `src/app/(dashboard)/sms/page.tsx`
- [ ] `src/app/(dashboard)/stats/page.tsx`
- [ ] `src/app/(dashboard)/partners/page.tsx`

### Admin Pages
- [ ] `src/app/admin/organizations/page.tsx`
- [ ] `src/app/admin/billing/page.tsx`
- [ ] `src/app/admin/ads/page.tsx`

### Layout
- [ ] `src/app/(dashboard)/layout.tsx` - show LoadingScreen during initial auth check

## Pattern to Follow

```tsx
// 1. Import LoadingScreen
import { LoadingScreen } from '@/components/ui/LoadingScreen'

// 2. Add early return for loading state
if (isLoading) {
  return <LoadingScreen />
}

// 3. Remove old loading checks from JSX
// REMOVE:
{isLoading ? (
  <div>Loading...</div>
) : data.length > 0 ? (
  // content
) : (
  // empty state
)}

// KEEP ONLY:
{data.length > 0 ? (
  // content
) : (
  // empty state
)}
```

## LoadingSpinner Usage (for inline loading)

```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// In buttons or inline contexts:
<Button disabled={isSubmitting}>
  {isSubmitting ? <LoadingSpinner size="sm" /> : 'Submit'}
</Button>

// In table cells:
<TableCell>
  {isLoading ? <LoadingSpinner size="sm" /> : data}
</TableCell>
```

## Important Rules
1. **LoadingScreen** = full page loading (first data fetch)
2. **Empty State** = no data available (show message + action button)
3. **LoadingSpinner** = inline/partial loading (button submits, table updates)
4. Always distinguish: loading ≠ empty

## Testing Checklist
- [ ] Loading shows branded Trinity logo
- [ ] Dark mode works correctly
- [ ] Mobile responsive
- [ ] Empty state distinct from loading
- [ ] Smooth transitions
