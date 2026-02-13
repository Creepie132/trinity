# Query Invalidation Fix

This file tracks which components have been updated with proper query invalidation.

## Pattern

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// After successful operation:
queryClient.invalidateQueries({ queryKey: ['<resource>'] })
```

## Fixed Components

### Visits
- [x] CreateVisitDialog - ['visits']
- [ ] CompleteVisitPaymentDialog - ['visits'], ['payments']
- [ ] ActiveVisitCard - ['visits']

### Products/Inventory
- [ ] CreateProductDialog - ['products']
- [ ] AddStockDialog - ['products']
- [ ] SellProductDialog - ['products'], ['payments']
- [ ] QuickSaleDialog - ['products'], ['payments']
- [ ] ReturnProductDialog - ['products']
- [ ] ProductDetailSheet - ['products']

### Services
- [ ] CreateServiceDialog - ['services']
- [ ] ServiceDetailSheet - ['services']

### Care Instructions
- [ ] CreateCareInstructionDialog - ['care-instructions']

### Clients
- [ ] AddClientDialog - ['clients']
- [ ] ClientSheet - ['clients']

### Payments
- [ ] CreateCashPaymentDialog - ['payments']
- [ ] CreatePaymentDialog - ['payments']
- [ ] CreatePaymentLinkDialog - ['payments']
- [ ] CreateStripePaymentDialog - ['payments']
