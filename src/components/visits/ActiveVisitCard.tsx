'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import { useVisitServices, useAddVisitService, useRemoveVisitService, useUpdateVisitStatus } from '@/hooks/useVisitServices';
import { Visit } from '@/types/visits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

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

  const handleAddService = async () => {
    if (!selectedServiceId) {
      toast.error(t('visits.selectServiceToAdd'));
      return;
    }

    const selectedService = services?.find(s => s.id === selectedServiceId);
    if (!selectedService) return;

    try {
      await addService.mutateAsync({
        visit_id: visit.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        service_name_ru: selectedService.name_ru || selectedService.name,
        price: selectedService.price || 0,
        duration_minutes: selectedService.duration_minutes,
      });

      toast.success(t('visits.addService') + ' ✓');
      setSelectedServiceId('');
    } catch (error) {
      console.error('Error adding service:', error);
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
      console.error('Error canceling visit:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const clientName = `${visit.clients?.first_name} ${visit.clients?.last_name}`;
  const totalPrice = visit.price || 0;
  const totalDuration = visit.duration_minutes || 0;

  return (
    <>
      <Card className="border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              <span>{t('visits.activeVisit')}</span>
            </div>
            <div className="text-lg font-mono text-green-700 dark:text-green-300">
              {elapsedTime}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Client Info */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('visits.client')}</p>
            <p className="text-xl font-bold">{clientName}</p>
          </div>

          {/* Main Service */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('visits.mainService')}</p>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-semibold">{visit.service_type}</p>
            </div>
          </div>

          {/* Additional Services */}
          {visitServices && visitServices.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('visits.additionalServices')}</p>
              <div className="space-y-2">
                {visitServices.map((service) => {
                  const serviceName = language === 'he' ? service.service_name : (service.service_name_ru || service.service_name);
                  
                  return (
                    <div
                      key={service.id}
                      className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold">{serviceName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ₪{service.price.toFixed(2)} • {service.duration_minutes} {t('common.minutes')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveService(service.id)}
                        disabled={removeService.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Service */}
          <div className="flex gap-2">
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('visits.selectServiceToAdd')} />
              </SelectTrigger>
              <SelectContent>
                {services?.map((service) => {
                  const serviceName = language === 'he' ? service.name : (service.name_ru || service.name);
                  return (
                    <SelectItem key={service.id} value={service.id}>
                      {serviceName} - ₪{service.price?.toFixed(2) || '0.00'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddService}
              disabled={addService.isPending || !selectedServiceId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('visits.addService')}
            </Button>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                {t('visits.totalPrice')}
              </div>
              <div className="text-2xl font-bold">₪{totalPrice.toFixed(2)}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                {t('visits.totalDuration')}
              </div>
              <div className="text-2xl font-bold">{totalDuration} {t('common.minutes')}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onFinish}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('visits.finishVisit')}
            </Button>
            <Button
              onClick={() => setShowCancelDialog(true)}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t('visits.cancelVisit')}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}
