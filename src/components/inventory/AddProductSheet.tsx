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
import { useInventory } from '@/hooks/useInventory'
import { CreateProductDTO } from '@/types/inventory'

const productSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  purchase_price: z.number().min(0).optional(),
  sell_price: z.number().min(0, 'Цена должна быть больше 0'),
  quantity: z.number().min(0).default(0),
  min_quantity: z.number().min(0).default(0),
  unit: z.string().default('шт.'),
})

interface AddProductSheetProps {
  open: boolean
  onClose: () => void
}

export default function AddProductSheet({ open, onClose }: AddProductSheetProps) {
  const [isSaving, setIsSaving] = useState(false)
  const { createProduct } = useInventory()

  const form = useForm<CreateProductDTO>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      quantity: 0,
      min_quantity: 0,
      unit: 'шт.',
    },
  })

  const onSubmit = async (data: CreateProductDTO) => {
    try {
      setIsSaving(true)
      await createProduct(data)
      onClose()
      form.reset()
    } catch (error) {
      console.error('Failed to create product:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить товар</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Артикул</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Штрихкод</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Цена закупки (₪)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        value={value || ''}
                        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sell_price"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Цена продажи (₪)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field}
                        value={value || ''}
                        onChange={e => onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Количество</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field}
                        value={value || 0}
                        onChange={e => onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_quantity"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Мин. остаток</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field}
                        value={value || 0}
                        onChange={e => onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ед. изм.</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Добавить товар'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}