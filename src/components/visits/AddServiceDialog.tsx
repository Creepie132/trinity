'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddService: (service: any) => Promise<void>;
  isPending?: boolean;
}

export function AddServiceDialog({
  open,
  onOpenChange,
  onAddService,
  isPending = false,
}: AddServiceDialogProps) {
  const { t, language } = useLanguage();
  const { data: services, isLoading } = useServices();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = services?.filter((service) => {
    if (!searchQuery) return true;
    const name = language === 'he' ? service.name : (service.name_ru || service.name);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddService = async (service: any) => {
    try {
      await onAddService(service);
      toast.success(t('visits.serviceAdded') || 'השירות נוסף');
      onOpenChange(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {language === 'he' ? 'הוסף שירות' : 'Добавить услугу'}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'he' ? 'חיפוש שירות...' : 'Поиск услуги...'}
            className="pr-10"
          />
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              {language === 'he' ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : filteredServices && filteredServices.length > 0 ? (
            filteredServices.map((service) => {
              const serviceName = language === 'he' ? service.name : (service.name_ru || service.name);
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {serviceName}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>₪{service.price || 0}</span>
                      <span>{service.duration_minutes} {language === 'he' ? 'דק׳' : 'мин'}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddService(service)}
                    disabled={isPending}
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
              {language === 'he' ? 'לא נמצאו שירותים' : 'Услуги не найдены'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
