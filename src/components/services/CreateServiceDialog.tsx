'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateService } from '@/hooks/useServices';
import { CreateServiceDTO } from '@/types/services';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

export function CreateServiceDialog({ open, onOpenChange }: CreateServiceDialogProps) {
  const { t } = useLanguage();
  const createService = useCreateService();

  const [formData, setFormData] = useState<CreateServiceDTO>({
    name: '',
    name_ru: '',
    price: 0,
    duration_minutes: 60,
    color: DEFAULT_COLORS[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !(formData.name_ru || '').trim()) {
      toast.error(t('services.errors.nameRequired'));
      return;
    }

    if (formData.price && formData.price < 0) {
      toast.error(t('services.errors.priceInvalid'));
      return;
    }

    if (formData.duration_minutes && formData.duration_minutes < 1) {
      toast.error(t('services.errors.durationInvalid'));
      return;
    }

    try {
      await createService.mutateAsync(formData);

      toast.success(t('services.created'));
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        name_ru: '',
        price: 0,
        duration_minutes: 60,
        color: DEFAULT_COLORS[0],
      });
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleChange = (field: keyof CreateServiceDTO, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('services.newService')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Name (Hebrew) */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('services.name')} (עברית)</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t('services.namePlaceholder')}
              required
            />
          </div>

          {/* Service Name (Russian) */}
          <div className="space-y-2">
            <Label htmlFor="name_ru">{t('services.nameRu')} (Русский)</Label>
            <Input
              id="name_ru"
              value={formData.name_ru}
              onChange={(e) => handleChange('name_ru', e.target.value)}
              placeholder={t('services.nameRuPlaceholder')}
              required
            />
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('services.price')} (₪)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">{t('services.duration')} ({t('common.minutes')})</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                step="1"
                value={formData.duration_minutes}
                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 60)}
                required
              />
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>{t('services.color')}</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('color', color)}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${
                    formData.color === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-full h-10 mt-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createService.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createService.isPending}>
              {createService.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.create')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
