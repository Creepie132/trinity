'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdateService, useDeleteService } from '@/hooks/useServices';
import { Service, UpdateServiceDTO } from '@/types/services';
import { Edit2, Trash2, Save, X, Loader2, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

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
  
  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  // Delete confirmation modal
  if (showDeleteDialog) {
    return (
      <Modal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t('services.deleteConfirm')}
        width="400px"
        dir={language === 'he' ? 'rtl' : 'ltr'}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteService.isPending}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteService.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {deleteService.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </>
              )}
            </button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">
          {`${t('services.deleteConfirmMessage')} ${serviceName}?`}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
            style={{ backgroundColor: service.color }}
          />
          <span>{isEditing ? t('services.editService') : serviceName}</span>
        </div>
      }
      width="480px"
      dir={language === 'he' ? 'rtl' : 'ltr'}
      footer={
        !isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Edit2 className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={updateService.isPending}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={updateService.isPending}
              className="flex-[1.5] py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {updateService.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('common.save')}
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {!isEditing ? (
        // View Mode
        <div className="space-y-6">
          {/* Service Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                {t('services.price')}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ₪{(service.price || 0).toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                {t('services.duration')}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {service.duration_minutes} {t('common.minutes')}
              </div>
            </div>
          </div>

          {/* Bilingual Names */}
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('services.name')} (עברית)
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {service.name}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('services.nameRu')} (Русский)
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {service.name_ru}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-4">
          {/* Service Name (Hebrew) */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {t('services.name')} (עברית)
            </label>
            <input
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Service Name (Russian) */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {t('services.nameRu')} (Русский)
            </label>
            <input
              value={formData.name_ru || ''}
              onChange={(e) => handleChange('name_ru', e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('services.price')} (₪)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price || 0}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                className={inputClass}
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('services.duration')} ({t('common.minutes')})
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.duration_minutes || 60}
                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 60)}
                className={inputClass}
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
              {t('services.color')}
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('color', color)}
                  className={`w-9 h-9 rounded-full border-2 transition-transform ${
                    formData.color === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-gray-200 dark:border-gray-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color || service.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-full h-10 mt-3 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
