'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
}

export function AddProductDialog({
  open,
  onOpenChange,
  visitId,
}: AddProductDialogProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Load products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filteredProducts = products?.filter((product) => {
    if (!searchQuery) return true;
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getQuantity = (productId: string) => quantities[productId] || 1;

  const setQuantity = (productId: string, value: number) => {
    setQuantities({ ...quantities, [productId]: Math.max(1, value) });
  };

  const handleAddProduct = async (product: any) => {
    const quantity = getQuantity(product.id);
    
    try {
      // TODO: Implement product sale logic
      // For now, just show toast
      toast.success(`${product.name} x${quantity} ${language === 'he' ? 'נוסף' : 'добавлен'}`);
      
      // Reset quantity
      setQuantities({ ...quantities, [product.id]: 1 });
      
      console.log('Add product to visit:', {
        visitId,
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price * quantity,
      });

      // Close dialog after adding
      onOpenChange(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {language === 'he' ? 'הוסף מוצר' : 'Добавить товар'}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'he' ? 'חיפוש מוצר...' : 'Поиск товара...'}
            className="pr-10"
          />
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              {language === 'he' ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const currentQuantity = getQuantity(product.id);
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      ₪{product.price || 0} {language === 'he' ? 'ליחידה' : 'за шт.'}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQuantity(product.id, currentQuantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {currentQuantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQuantity(product.id, currentQuantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Add Button */}
                  <Button
                    size="sm"
                    onClick={() => handleAddProduct(product)}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {language === 'he' ? 'הוסף' : 'Добавить'}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              {language === 'he' ? 'לא נמצאו מוצרים' : 'Товары не найдены'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
