'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdateService, useDeleteService } from '@/hooks/useServices';
import { Service, UpdateServiceDTO } from '@/types/services';
import { Edit2, Trash2, Save, X, Loader2, Clock, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
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

interface ServiceDetailSheetProps {
  service: Service | null;
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

export function ServiceDetailSheet({ service, open, onOpenChange }: ServiceDetailSheetProps) {
  const { t, language } = useLanguage();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<UpdateServiceDTO>({});

  if (!service) return null;

  const handleEdit = () => {
    setFormData({
      name: service.name,
      name_ru: service.name_ru,
      price: service.price,
      duration_minutes: service.duration_minutes,
      color: service.color,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        updates: formData,
      });

      toast.success(t('services.updated'));
      setIsEditing(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteService.mutateAsync(service.id);
      toast.success(t('services.deleted'));
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleChange = (field: keyof UpdateServiceDTO, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const serviceName = language === 'he' ? service.name : service.name_ru;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="relative">
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-11 w-11 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t('common.back')}
            >
              {language === 'he' ? (
                <ArrowRight className="h-6 w-6" />
              ) : (
                <ArrowLeft className="h-6 w-6" />
              )}
            </Button>
            <SheetTitle className="flex items-center justify-between pr-12">
              {isEditing ? t('services.editService') : serviceName}
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: service.color }}
              />
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {!isEditing ? (
              // View Mode
              <>
                {/* Service Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      {t('services.price')}
                    </div>
                    <div className="text-2xl font-bold">₪{(service.price || 0).toFixed(2)}</div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      {t('services.duration')}
                    </div>
                    <div className="text-2xl font-bold">{service.duration_minutes} {t('common.minutes')}</div>
                  </div>
                </div>

                {/* Bilingual Names */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400">{t('services.name')} (עברית)</Label>
                    <p className="text-lg font-medium mt-1">{service.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400">{t('services.nameRu')} (Русский)</Label>
                    <p className="text-lg font-medium mt-1">{service.name_ru}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleEdit} className="flex-1">
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common.delete')}
                  </Button>
                </div>
              </>
            ) : (
              // Edit Mode
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                {/* Service Name (Hebrew) */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name">{t('services.name')} (עברית)</Label>
                  <Input
                    id="edit-name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                {/* Service Name (Russian) */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name-ru">{t('services.nameRu')} (Русский)</Label>
                  <Input
                    id="edit-name-ru"
                    value={formData.name_ru || ''}
                    onChange={(e) => handleChange('name_ru', e.target.value)}
                    required
                  />
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">{t('services.price')} (₪)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price || 0}
                      onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">{t('services.duration')} ({t('common.minutes')})</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.duration_minutes || 60}
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
                    value={formData.color || service.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-full h-10 mt-2"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateService.isPending}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateService.isPending} className="flex-1">
                    {updateService.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.saving')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t('common.save')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('services.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t('services.deleteConfirmMessage')} ${serviceName}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteService.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteService.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteService.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.deleting')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
