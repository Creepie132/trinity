'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import { useVisitServices, useAddVisitService, useRemoveVisitService, useUpdateVisitStatus } from '@/hooks/useVisitServices';
import { Visit } from '@/types/visits';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Clock, DollarSign, CheckCircle, XCircle, X } from 'lucide-react';
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
  const [showCustomServiceForm, setShowCustomServiceForm] = useState(false);
  const [customService, setCustomService] = useState({
    name: '',
    price: '',
    duration: '',
  });

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

  const handleAddCustomService = async () => {
    if (!customService.name || !customService.price || !customService.duration) {
      toast.error(t('visits.fillAllFields'));
      return;
    }

    try {
      await addService.mutateAsync({
        visit_id: visit.id,
        service_id: undefined,
        service_name: customService.name,
        service_name_ru: customService.name, // Same for custom
        price: parseFloat(customService.price),
        duration_minutes: parseInt(customService.duration),
      });

      toast.success(t('visits.addService') + ' ✓');
      setShowCustomServiceForm(false);
      setCustomService({ name: '', price: '', duration: '' });
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

  const totalPrice = (visit.price || 0) + (visitServices?.reduce((sum, s) => sum + (s.price || 0), 0) || 0);
  const totalDuration = (visit.duration_minutes || 0) + (visitServices?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0);

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
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {clientName}
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
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{clientName}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{getServiceName()}</div>
              {visitServices && visitServices.length > 0 && (
                <div className="flex gap-1 mt-1">
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
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono text-sm">
              <Clock className="w-3 h-3" />
              {elapsedTime}
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2">
          {/* Add Service Dropdown with Two Sections */}
          <div className="flex gap-1 flex-1 md:flex-initial">
            <Select 
              value={selectedServiceId} 
              onValueChange={(value) => {
                if (value === 'custom') {
                  setShowCustomServiceForm(true);
                  setSelectedServiceId('');
                } else {
                  setSelectedServiceId(value);
                }
              }}
            >
              <SelectTrigger className="h-8 text-sm bg-white dark:bg-gray-700 border-amber-300 dark:border-amber-700">
                <SelectValue placeholder={`+ ${t('visits.addService')}`} />
              </SelectTrigger>
              <SelectContent>
                {/* Section 1: Regular Services */}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t('visits.regularService')}
                </div>
                {services?.map((service) => {
                  const serviceName = language === 'he' ? service.name : (service.name_ru || service.name);
                  return (
                    <SelectItem key={service.id} value={service.id}>
                      {serviceName} - ₪{service.price?.toFixed(2) || '0.00'} • {service.duration_minutes} {t('common.minutes')}
                    </SelectItem>
                  );
                })}
                
                {/* Section 2: Custom Service */}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700">
                  {t('visits.oneTimeService')}
                </div>
                <SelectItem value="custom">
                  <span className="font-medium">✏️ {t('visits.customService')}</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddService}
              disabled={addService.isPending || !selectedServiceId}
              size="sm"
              className="h-8 px-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Finish Button */}
          <Button
            onClick={onFinish}
            size="sm"
            className="h-8 text-sm bg-green-600 hover:bg-green-700 px-3"
          >
            <CheckCircle className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">{t('visits.finishVisit')}</span>
          </Button>

          {/* Cancel Button */}
          <Button
            onClick={() => setShowCancelDialog(true)}
            size="sm"
            variant="destructive"
            className="h-8 text-sm px-3"
          >
            <XCircle className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">{t('visits.cancelVisit')}</span>
          </Button>

          {/* Mobile: Total Price */}
          <div className="md:hidden flex items-center gap-1 font-bold text-green-700 dark:text-green-400 ml-auto">
            ₪{totalPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Custom Service Form Dialog */}
      <Dialog open={showCustomServiceForm} onOpenChange={setShowCustomServiceForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('visits.addCustomService')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">{t('visits.serviceName')}</Label>
              <Input
                id="service-name"
                value={customService.name}
                onChange={(e) => setCustomService({ ...customService, name: e.target.value })}
                placeholder={t('visits.enterServiceName')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="service-price">{t('visits.price')}</Label>
                <Input
                  id="service-price"
                  type="number"
                  value={customService.price}
                  onChange={(e) => setCustomService({ ...customService, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-duration">{t('visits.duration')} ({t('common.minutes')})</Label>
                <Input
                  id="service-duration"
                  type="number"
                  value={customService.duration}
                  onChange={(e) => setCustomService({ ...customService, duration: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomServiceForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddCustomService} disabled={addService.isPending}>
              {t('visits.addService')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
