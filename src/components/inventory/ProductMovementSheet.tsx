'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTransaction } from '@/hooks/useInventory'
import { Product, CreateInventoryTransactionDTO, InventoryTransactionType } from '@/types/inventory'

const movementSchema = z.object({
  type: z.enum(['purchase', 'sale', 'return', 'adjustment', 'write_off']),
  quantity: z.number().min(0.01, 'Количество должно быть больше 0'),
  price_per_unit: z.number().min(0).optional(),
  notes: z.string().optional(),
})

const movementTypes: { value: InventoryTransactionType; label: string }[] = [
  { value: 'purchase', label: 'Приход' },
  { value: 'sale', label: 'Продажа' },
  { value: 'return', label: 'Возврат' },
  { value: 'adjustment', label: 'Коррекция' },
  { value: 'write_off', label: 'Списание' },
]

interface ProductMovementSheetProps {
  product: Product
  open: boolean
  onClose: () => void
}

export default function ProductMovementSheet({ product, open, onClose }: ProductMovementSheetProps) {
  const [isSaving, setIsSaving] = useState(false)
  const { mutate: createTransaction } = useCreateTransaction()

  const form = useForm<CreateInventoryTransactionDTO>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: product.id,
      quantity: 1,
      price_per_unit: product.sell_price,
    },
  })

  const selectedType = form.watch('type')
  const quantity = form.watch('quantity') || 0
  const pricePerUnit = form.watch('price_per_unit') || 0

  const onSubmit = async (data: CreateInventoryTransactionDTO) => {
    try {
      setIsSaving(true)
      await createTransaction({
        ...data,
        product_id: product.id,
        total_price: (data.price_per_unit || 0) * data.quantity,
      })
      onClose()
      form.reset()
    } catch (error) {
      console.error('Failed to create transaction:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Движение товара: {product.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип операции</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {movementTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Количество</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={value || ''}
                        onChange={e => onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType !== 'adjustment' && (
                <FormField
                  control={form.control}
                  name="price_per_unit"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedType === 'purchase' ? 'Цена закупки' : 'Цена'} (₪)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={value || ''}
                          onChange={e => onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {selectedType !== 'adjustment' && quantity && pricePerUnit ? (
              <div className="text-sm text-muted-foreground">
                Итого: {(quantity * pricePerUnit).toFixed(2)}₪
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарий</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}