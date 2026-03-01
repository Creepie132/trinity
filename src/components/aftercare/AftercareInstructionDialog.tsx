'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateAftercareInstruction, useUpdateAftercareInstruction } from '@/hooks/useAftercareInstructions';
import type { AftercareInstruction } from '@/types/aftercare';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AftercareInstructionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instruction?: AftercareInstruction | null;
}

export function AftercareInstructionDialog({
  open,
  onOpenChange,
  instruction,
}: AftercareInstructionDialogProps) {
  const { t } = useLanguage();
  const createInstruction = useCreateAftercareInstruction();
  const updateInstruction = useUpdateAftercareInstruction();

  const [title, setTitle] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [content, setContent] = useState('');
  const [contentRu, setContentRu] = useState('');

  useEffect(() => {
    if (instruction) {
      setTitle(instruction.title);
      setTitleRu(instruction.title_ru || '');
      setContent(instruction.content);
      setContentRu(instruction.content_ru || '');
    } else {
      setTitle('');
      setTitleRu('');
      setContent('');
      setContentRu('');
    }
  }, [instruction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error(t('errors.fillRequired'));
      return;
    }

    try {
      if (instruction) {
        await updateInstruction.mutateAsync({
          id: instruction.id,
          updates: {
            title,
            title_ru: titleRu || title,
            content,
            content_ru: contentRu || content,
          },
        });
        toast.success(t('aftercareInstructions.updated'));
      } else {
        await createInstruction.mutateAsync({
          title,
          title_ru: titleRu || title,
          content,
          content_ru: contentRu || content,
        });
        toast.success(t('aftercareInstructions.created'));
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving instruction:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const isLoading = createInstruction.isPending || updateInstruction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {instruction ? t('aftercareInstructions.editInstruction') : t('aftercareInstructions.newInstruction')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Hebrew Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('aftercareInstructions.instructionTitle')} (עברית)*</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('aftercareInstructions.titlePlaceholder')}
                required
                dir="rtl"
              />
            </div>

            {/* Russian Title */}
            <div className="space-y-2">
              <Label htmlFor="titleRu">{t('aftercareInstructions.instructionTitleRu')}</Label>
              <Input
                id="titleRu"
                value={titleRu}
                onChange={(e) => setTitleRu(e.target.value)}
                placeholder={t('aftercareInstructions.titlePlaceholderRu')}
                dir="ltr"
              />
            </div>

            {/* Hebrew Content */}
            <div className="space-y-2">
              <Label htmlFor="content">{t('aftercareInstructions.instructionContent')} (עברית)*</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('aftercareInstructions.contentPlaceholder')}
                rows={6}
                required
                dir="rtl"
              />
            </div>

            {/* Russian Content */}
            <div className="space-y-2">
              <Label htmlFor="contentRu">{t('aftercareInstructions.instructionContentRu')}</Label>
              <Textarea
                id="contentRu"
                value={contentRu}
                onChange={(e) => setContentRu(e.target.value)}
                placeholder={t('aftercareInstructions.contentPlaceholderRu')}
                rows={6}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
