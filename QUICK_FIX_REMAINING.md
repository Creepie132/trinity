# Quick Fix for Remaining Components

## Pattern to apply:

1. Add import:
```typescript
import { useQueryClient } from '@tanstack/react-query'
```

2. Add hook:
```typescript
const queryClient = useQueryClient()
```

3. After toast.success(), add:
```typescript
queryClient.invalidateQueries({ queryKey: ['<resource>'] })
```

## Remaining Components:

### Products/Inventory
- [ ] CreateProductDialog → ['products']
- [ ] AddStockDialog → ['products']
- [ ] SellProductDialog → ['products'], ['payments']
- [ ] QuickSaleDialog → ['products'], ['payments']
- [ ] ReturnProductDialog → ['products']
- [ ] ProductDetailSheet → ['products']

### Services
- [ ] CreateServiceDialog → ['services']  
- [ ] ServiceDetailSheet → ['services']

### Care Instructions
- [ ] CreateCareInstructionDialog → ['care-instructions']

### Payments
- [ ] CreateCashPaymentDialog → ['payments']
- [ ] CreatePaymentDialog → ['payments']

## Already Fixed:
✅ CreateVisitDialog
✅ CompleteVisitPaymentDialog  
✅ visits/page.tsx (integrated VisitCard)
