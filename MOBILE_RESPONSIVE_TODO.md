# 📱 Mobile Responsive - Remaining Tasks

## ✅ Completed (v2.21.0)
1. ✅ **Visits Page**
   - Mobile cards instead of table
   - FAB (Floating Action Button) for adding visits
   - Horizontal chip filters
   - 44px touch targets for all buttons

2. ✅ **Calendar View**
   - Single day mode on mobile (swipe navigation)
   - Vertical visit cards with colored left border
   - Full-width blocks

3. ✅ **CreateVisitDialog**
   - Fullscreen modal on mobile
   - Fixed buttons at bottom (44px height)
   - Single column layout

4. ✅ **CompleteVisitPaymentDialog**
   - Fullscreen modal on mobile
   - Large price display at top
   - Payment methods: 2-column grid with big cards
   - Fixed buttons at bottom

## ⏳ TODO (Next Sprint)

### 5. Dashboard - Mobile Layout
- [ ] Stats cards in single column (not grid)
- [ ] Charts: full width, reduced height
- [ ] Larger font sizes for readability
- [ ] Quick actions cards stacked

**Files:**
- `src/app/(dashboard)/dashboard/page.tsx`

### 6. Payments Page - Mobile Cards
- [ ] Replace table with cards on mobile
- [ ] Card structure: client, amount (large), status badge, date, payment method emoji
- [ ] Horizontal chip filters (like visits page)
- [ ] FAB for creating payment

**Files:**
- `src/app/(dashboard)/payments/page.tsx`

### 7. Analytics Page - Mobile Stacked
- [ ] Charts in single column (not side-by-side)
- [ ] PieChart and BarChart: full width
- [ ] Filters as dropdowns (not button group)
- [ ] Stats cards in column

**Files:**
- `src/app/(dashboard)/analytics/page.tsx`

### 8. Clients Page - Mobile Cards
- [ ] Replace table with cards
- [ ] Search bar full width
- [ ] FAB for adding client
- [ ] Swipe actions for edit/delete

**Files:**
- `src/app/(dashboard)/clients/page.tsx`

### 9. Settings Pages - Mobile Friendly
- [ ] Service colors: single column with horizontal color picker
- [ ] All form fields full width
- [ ] Larger touch targets

**Files:**
- `src/app/(dashboard)/settings/**/*.tsx`

### 10. General Mobile Rules (Apply Everywhere)
- [ ] No horizontal page scroll
- [ ] All modals fullscreen on mobile
- [ ] All buttons min 44px height
- [ ] Dark theme contrast (bg-gray-800, text-gray-100, border-gray-700)
- [ ] RTL for Hebrew, LTR for Russian
- [ ] Translations for all mobile-specific UI

## Implementation Guidelines

### Responsive Breakpoint
```tsx
// Use Tailwind md: breakpoint (768px)
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>
```

### Card Pattern (Mobile)
```tsx
<div className="md:hidden space-y-3">
  {items.map(item => (
    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Card content */}
    </div>
  ))}
</div>
```

### FAB Pattern
```tsx
<button
  className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg z-50"
  aria-label="Add"
>
  <Plus className="w-6 h-6" />
</button>
```

### Fullscreen Modal (Mobile)
```tsx
<DialogContent className="max-w-2xl md:max-h-[90vh] h-full md:h-auto p-0 md:p-6">
  <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 p-4 md:p-0 border-b md:border-b-0">
    {/* Header */}
  </div>
  <div className="flex-1 overflow-y-auto p-4 md:p-0">
    {/* Content */}
  </div>
  <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 md:p-0 border-t">
    {/* Fixed buttons */}
  </div>
</DialogContent>
```

### Horizontal Chip Filters
```tsx
<div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
  {filters.map(filter => (
    <button
      key={filter}
      className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
        active ? 'bg-theme-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
      }`}
    >
      {filter}
    </button>
  ))}
</div>
```

## Testing Checklist
- [ ] Test on real iOS device (Safari)
- [ ] Test on real Android device (Chrome)
- [ ] Test all touch interactions (44px targets)
- [ ] Test dark theme on all pages
- [ ] Test Hebrew (RTL) layout
- [ ] Test Russian (LTR) layout
- [ ] Test landscape orientation
- [ ] Test with large font size (accessibility)

## Performance
- [ ] Lazy load charts on mobile
- [ ] Reduce initial bundle size
- [ ] Optimize images (if any)
- [ ] Test on slow 3G connection
