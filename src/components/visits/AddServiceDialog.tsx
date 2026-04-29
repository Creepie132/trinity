'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import ModalWrapper from '@/components/ModalWrapper';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddService: (service: any) => Promise<void>;
  isPending?: boolean;
}

/**
 * Нормализует строку для поиска:
 * — trim пробелов
 * — удаляет невидимые Unicode bidi-маркеры (иврит/арабский RTL)
 * — lower case
 */
function normalizeForSearch(str: string | null | undefined): string {
  if (!str) return '';
  // Удаляем Unicode bidi-маркеры: LRM, RLM, LRE, RLE, PDF, LRO, RLO и Mongolian vowel separator
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u180E]/g, '').trim().toLowerCase();
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

  // Debounce: снижаем нагрузку при быстром вводе (особенно иврит IME)
  const debouncedQuery = useDebounce(searchQuery, 200);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    const q = normalizeForSearch(debouncedQuery);
    if (!q) return services;

    return services.filter((service) => {
      // Ищем по обоим полям — чтобы поиск работал независимо от языка интерфейса
      const nameHe = normalizeForSearch(service.name);
      const nameRu = normalizeForSearch(service.name_ru);
      return nameHe.includes(q) || nameRu.includes(q);
    });
  }, [services, debouncedQuery]);

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

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <ModalWrapper isOpen={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col max-h-[90vh] overflow-hidden" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
            {language === 'he' ? 'הוסף שירות' : 'Добавить услугу'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none ${
                dir === 'rtl' ? 'right-3' : 'left-3'
              }`}
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'he' ? 'חיפוש שירות...' : 'Поиск услуги...'}
              dir={dir}
              lang={language === 'he' ? 'he' : 'ru'}
              className={dir === 'rtl' ? 'pr-10 text-right' : 'pl-10 text-left'}
            />
          </div>

          {/* Services List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'he' ? 'טוען...' : 'Загрузка...'}
              </div>
            ) : filteredServices.length > 0 ? (
              filteredServices.map((service) => {
                // Показываем имя на языке интерфейса, с fallback на второй язык
                const serviceName =
                  language === 'he'
                    ? service.name || service.name_ru
                    : service.name_ru || service.name;
                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {serviceName}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span>₪{service.price || 0}</span>
                        <span>
                          {service.duration_minutes} {language === 'he' ? 'דק׳' : 'мин'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddService(service)}
                      disabled={isPending}
                      className={`shrink-0 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {language === 'he' ? 'הוסף' : 'Добавить'}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                {/* Явный fallback — юзер видит сообщение, не пустоту */}
                {debouncedQuery
                  ? language === 'he'
                    ? `לא נמצאו שירותים עבור "${debouncedQuery}"`
                    : `Услуги по запросу «${debouncedQuery}» не найдены`
                  : language === 'he'
                  ? 'אין שירותים זמינים'
                  : 'Нет доступных услуг'}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
