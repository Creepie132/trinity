'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateCareInstruction } from '@/hooks/useCareInstructions';
import { useServices } from '@/hooks/useServices';
import { CreateCareInstructionDTO } from '@/types/services';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCareInstructionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCareInstructionDialog({ open, onOpenChange }: CreateCareInstructionDialogProps) {
  const { t, language } = useLanguage();
  const createInstruction = useCreateCareInstruction();
  const { data: services } = useServices();

  const [formData, setFormData] = useState<CreateCareInstructionDTO>({
    title: '',
    title_ru: '',
    content: '',
    content_ru: '',
    service_id: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error(t('common.required'));
      return;
    }

    try {
      await createInstruction.mutateAsync(formData);

      toast.success(t('careInstructions.created'));
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        title_ru: '',
        content: '',
        content_ru: '',
        service_id: undefined,
      });
    } catch (error) {
      console.error('Error creating care instruction:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleChange = (field: keyof CreateCareInstructionDTO, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('careInstructions.newInstruction')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">{t('services.name')} ({t('common.optional')})</Label>
            <Select
              value={formData.service_id || 'none'}
              onValueChange={(value) => handleChange('service_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('careInstructions.selectService')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('careInstructions.noService')}</SelectItem>
                {services?.map((service) => {
                  const serviceName = language === 'he' ? service.name : (service.name_ru || service.name);
                  return (
                    <SelectItem key={service.id} value={service.id}>
                      {serviceName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title (Hebrew) */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('careInstructions.instructionTitle')} (עברית)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="לדוגמה: הוראות טיפול לאחר תספורת"
              required
            />
          </div>

          {/* Title (Russian) */}
          <div className="space-y-2">
            <Label htmlFor="title_ru">{t('careInstructions.instructionTitleRu')} (Русский)</Label>
            <Input
              id="title_ru"
              value={formData.title_ru}
              onChange={(e) => handleChange('title_ru', e.target.value)}
              placeholder="Например: Инструкции по уходу после стрижки"
            />
          </div>

          {/* Content (Hebrew) */}
          <div className="space-y-2">
            <Label htmlFor="content">{t('careInstructions.instructionContent')} (עברית)</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="כתוב כאן את הוראות הטיפול..."
              rows={6}
              required
            />
          </div>

          {/* Content (Russian) */}
          <div className="space-y-2">
            <Label htmlFor="content_ru">{t('careInstructions.instructionContentRu')} (Русский)</Label>
            <Textarea
              id="content_ru"
              value={formData.content_ru}
              onChange={(e) => handleChange('content_ru', e.target.value)}
              placeholder="Напишите здесь инструкции по уходу..."
              rows={6}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createInstruction.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createInstruction.isPending}>
              {createInstruction.isPending ? (
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
