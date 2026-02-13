'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import { Service } from '@/types/services';
import { Button } from '@/components/ui/button';
import { Plus, Search, Clock, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function ServicesSettingsPage() {
  const { t, language } = useLanguage();
  const { data: services, isLoading } = useServices();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Filter services based on search query
  const filteredServices = services?.filter(service => {
    const name = language === 'he' ? service.name : service.name_ru;
    const description = language === 'he' ? service.description : service.description_ru;
    const query = searchQuery.toLowerCase();
    
    return (
      name.toLowerCase().includes(query) ||
      description?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('services.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('services.description')}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('services.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('services.newService')}
        </Button>
      </div>

      {/* Services Grid/Table */}
      {filteredServices && filteredServices.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('services.color')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('services.name')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('services.price')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('services.duration')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('services.description')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredServices.map((service) => {
                  const name = language === 'he' ? service.name : service.name_ru;
                  const description = language === 'he' ? service.description : service.description_ru;

                  return (
                    <tr
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: service.color }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                          <DollarSign className="w-4 h-4" />
                          ₪{service.price.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                          <Clock className="w-4 h-4" />
                          {service.duration_minutes} {t('common.minutes')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {description || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredServices.map((service) => {
              const name = language === 'he' ? service.name : service.name_ru;
              const description = language === 'he' ? service.description : service.description_ru;

              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: service.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {name}
                        </h3>
                        {description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                            {description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <DollarSign className="w-4 h-4" />
                      ₪{service.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {service.duration_minutes} {t('common.minutes')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? t('services.noResultsFound') : t('services.noServicesYet')}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('services.createFirst')}
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateServiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <ServiceDetailSheet
        service={selectedService}
        open={!!selectedService}
        onOpenChange={(open) => !open && setSelectedService(null)}
      />
    </div>
  );
}
