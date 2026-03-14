'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
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
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

export function CreateServiceDialog({ open, onOpenChange }: CreateServiceDialogProps) {
  const { t, language } = useLanguage();
  const createService = useCreateService();

  const [formData, setFormData] = useState({
    name: '',
    name_ru: '',
    price: '' as string | number,
    duration_minutes: '' as string | number,
    color: DEFAULT_COLORS[0],
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !(formData.name_ru || '').trim()) {
      toast.error(t('services.errors.nameRequired'));
      return;
    }

    const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    const duration = typeof formData.duration_minutes === 'string' ? parseInt(formData.duration_minutes) : formData.duration_minutes;

    if (price < 0) {
      toast.error(t('services.errors.priceInvalid'));
      return;
    }

    if (duration < 1) {
      toast.error(t('services.errors.durationInvalid'));
      return;
    }

    const serviceData: CreateServiceDTO = {
      name: formData.name,
      name_ru: formData.name_ru,
      price: price || 0,
      duration_minutes: duration || 60,
      color: formData.color,
    };

    try {
      await createService.mutateAsync(serviceData);
      toast.success(t('services.created'));
      onOpenChange(false);
      setFormData({ name: '', name_ru: '', price: '', duration_minutes: '', color: DEFAULT_COLORS[0] });
    } catch (error) {
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('services.newService')}
      width="480px"
      dir={language === 'he' ? 'rtl' : 'ltr'}
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={createService.isPending}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={createService.isPending}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {createService.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createService.isPending ? t('common.saving') : t('common.create')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
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
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="0"
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
              onChange={(e) => handleChange('duration_minutes', e.target.value)}
              placeholder="60"
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
      </div>
    </Modal>
  );
}
