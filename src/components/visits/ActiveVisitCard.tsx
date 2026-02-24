'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import { useVisitServices, useAddVisitService, useRemoveVisitService, useUpdateVisitStatus } from '@/hooks/useVisitServices';
import { Visit } from '@/types/visits';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, DollarSign, CheckCircle, XCircle, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { CreateTaskSheet } from '@/components/diary/CreateTaskSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddServiceDialog } from './AddServiceDialog';
import { AddProductDialog } from './AddProductDialog';

interface ActiveVisitCardProps {
  visit: Visit;
  onFinish: () => void;
}

export function ActiveVisitCard({ visit, onFinish }: ActiveVisitCardProps) {
  const { t, language } = useLanguage();
  const { data: services } = useServices();
  const { data: visitServices, isLoading: loadingServices } = useVisitServices(visit.id);
  const addService = useAddVisitService(visit.id);
  const removeService = useRemoveVisitService(visit.id);
  const updateStatus = useUpdateVisitStatus(visit.id);

  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTaskSheet, setShowTaskSheet] = useState(false);

  // Timer effect
  useEffect(() => {
    if (!visit.started_at) return;

    const startTime = new Date(visit.started_at).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [visit.started_at]);

  const handleAddService = async (service: any) => {
    try {
      await addService.mutateAsync({
        visit_id: visit.id,
        service_id: service.id,
        service_name: service.name,
        service_name_ru: service.name_ru || service.name,
        price: service.price || 0,
        duration_minutes: service.duration_minutes,
      });
    } catch (error) {
      console.error('Error adding custom service:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    try {
      await removeService.mutateAsync(serviceId);
      toast.success(t('visits.removeService') + ' ✓');
    } catch (error) {
      console.error('Error removing service:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleCancelVisit = async () => {
    try {
      await updateStatus.mutateAsync('cancelled');
      toast.success(t('visits.cancelVisit') + ' ✓');
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Error cancelling visit:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  // Calculate total from visitServices only (visit.price is already included if service was added)
  const totalPrice = visitServices?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
  const totalDuration = visitServices?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;

  const clientName = `${visit.clients?.first_name} ${visit.clients?.last_name}`;
  
  // Get service name from services table or fallback to service_type
  const getServiceName = () => {
    if (visit.services) {
      return language === 'he' ? visit.services.name : (visit.services.name_ru || visit.services.name);
    }
    return visit.service_type || '';
  };

  return (
    <>
      {/* Compact Active Visit Card */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-r-4 border-amber-500 p-4 space-y-3">
        {/* Desktop: Single row layout */}
        <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
          {/* Left: Client, Service, Timer */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {clientName}
              </div>
              {visit.source === 'online_booking' && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs">
                  {language === 'he' ? 'אונליין' : language === 'ru' ? 'Онлайн' : 'Online'}
                </Badge>
              )}
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              {getServiceName()}
            </div>
            
            {/* Additional Services as chips */}
            {visitServices && visitServices.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {visitServices.map((service) => {
                  const serviceName = language === 'he' ? service.service_name : (service.service_name_ru || service.service_name);
                  return (
                    <Badge
                      key={service.id}
                      variant="secondary"
                      className="text-xs h-5 px-2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"
                    >
                      {serviceName}
                      <button
                        onClick={() => handleRemoveService(service.id)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono font-semibold">
              <Clock className="w-4 h-4" />
              {elapsedTime}
            </div>
          </div>

          {/* Right: Total Price */}
          <div className="flex items-center gap-1 text-xl font-bold text-green-700 dark:text-green-400">
            <DollarSign className="w-5 h-5" />
            ₪{totalPrice.toFixed(2)}
          </div>
        </div>

        {/* Mobile: Two rows layout */}
        <div className="md:hidden space-y-2">
          {/* Row 1: Info */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{clientName}</div>
                {visit.source === 'online_booking' && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs shrink-0">
                    {language === 'he' ? 'אונליין' : language === 'ru' ? 'Онлайн' : 'Online'}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{getServiceName()}</div>
              {visitServices && visitServices.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {visitServices.map((service) => {
                    const serviceName = language === 'he' ? service.service_name : (service.service_name_ru || service.service_name);
                    return (
                      <Badge
                        key={service.id}
                        variant="secondary"
                        className="text-xs h-5 px-1"
                      >
                        {serviceName}
                        <button onClick={() => handleRemoveService(service.id)} className="ml-1">
                          <X className="w-2 h-2" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono text-sm">
                <Clock className="w-3 h-3" />
                {elapsedTime}
              </div>
              <div className="flex items-center gap-1 font-bold text-green-700 dark:text-green-400 text-base">
                ₪{totalPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Service Button */}
          <Button
            onClick={() => setShowAddService(true)}
            size="sm"
            className="h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-initial"
          >
            <Plus className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">{language === 'he' ? 'הוסף שירות' : 'Добавить услугу'}</span>
          </Button>

          {/* Add Product Button */}
          <Button
            onClick={() => setShowAddProduct(true)}
            size="sm"
            className="h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white flex-1 md:flex-initial"
          >
            <Plus className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">{language === 'he' ? 'הוסף מוצר' : 'Добавить товар'}</span>
          </Button>

          {/* Add Task Button */}
          <Button
            onClick={() => setShowTaskSheet(true)}
            size="sm"
            variant="outline"
            className="h-9 text-sm flex-1 md:flex-initial"
          >
            <BookOpen className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">{language === 'he' ? 'משימה' : 'Задача'}</span>
          </Button>

          {/* Finish Button */}
          <Button
            onClick={onFinish}
            size="sm"
            className="h-9 text-sm bg-green-600 hover:bg-green-700 px-3 md:flex-1"
          >
            <CheckCircle className="w-4 h-4 md:mr-1" />
            <span className="hidden sm:inline">{t('visits.finishVisit')}</span>
          </Button>

          {/* Cancel Button */}
          <Button
            onClick={() => setShowCancelDialog(true)}
            size="sm"
            variant="destructive"
            className="h-9 text-sm px-3"
          >
            <XCircle className="w-4 h-4 md:mr-1" />
            <span className="hidden sm:inline">{t('visits.cancelVisit')}</span>
          </Button>
        </div>
      </div>

      {/* Add Service Dialog */}
      <AddServiceDialog
        open={showAddService}
        onOpenChange={setShowAddService}
        onAddService={handleAddService}
        isPending={addService.isPending}
      />

      {/* Add Product Dialog */}
      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        visitId={visit.id}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('visits.cancelVisit')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('visits.cancelVisitConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelVisit} className="bg-red-600 hover:bg-red-700">
              {t('visits.cancelVisit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Task Sheet */}
      <CreateTaskSheet
        isOpen={showTaskSheet}
        onClose={() => setShowTaskSheet(false)}
        onCreated={() => {
          setShowTaskSheet(false)
          toast.success(language === 'he' ? 'משימה נוצרה בהצלחה' : 'Задача создана успешно')
        }}
        locale={language === 'he' ? 'he' : 'ru'}
        prefill={{
          visit_id: visit.id,
          client_id: visit.client_id,
          contact_phone: visit.clients?.phone || '',
          description: language === 'he'
            ? `משימה נפתחה במהלך ביקור #${visit.id.slice(0, 8)}, במהלך מתן שירות "${getServiceName()}" ללקוח ${visit.clients ? `${visit.clients.first_name} ${visit.clients.last_name}` : ''}`
            : `Задача открыта во время визита #${visit.id.slice(0, 8)}, во время оказания услуг "${getServiceName()}" для ${visit.clients ? `${visit.clients.first_name} ${visit.clients.last_name}` : ''}`,
        }}
      />
    </>
  );
}
