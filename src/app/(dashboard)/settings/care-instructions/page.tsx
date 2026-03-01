'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCareInstructions, useDeleteCareInstruction } from '@/hooks/useCareInstructions';
import { useServices } from '@/hooks/useServices';
import { CareInstruction } from '@/types/services';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, FileText, Download } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CreateCareInstructionDialog } from '@/components/care-instructions/CreateCareInstructionDialog';
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

export default function CareInstructionsPage() {
  const { t, language } = useLanguage();
  const { data: instructions, isLoading: instructionsLoading } = useCareInstructions();
  const { data: services } = useServices();
  const deleteInstruction = useDeleteCareInstruction();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [instructionToDelete, setInstructionToDelete] = useState<CareInstruction | null>(null);

  const handleDelete = async () => {
    if (!instructionToDelete) return;

    try {
      await deleteInstruction.mutateAsync(instructionToDelete.id);
      toast.success(t('careInstructions.deleted'));
      setInstructionToDelete(null);
    } catch (error) {
      console.error('Error deleting instruction:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleDownload = (instruction: CareInstruction) => {
    if (instruction.file_url) {
      // Open real PDF file
      window.open(instruction.file_url, '_blank');
    } else {
      // Download as TXT if no file
      const content = language === 'he' ? instruction.content : (instruction.content_ru || instruction.content);
      const title = language === 'he' ? instruction.title : (instruction.title_ru || instruction.title);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (instructionsLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('careInstructions.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('careInstructions.description')}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('careInstructions.newInstruction')}
        </Button>
      </div>

      {/* Instructions Table/List */}
      {instructions && instructions.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('careInstructions.instructionTitle')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('services.name')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {instructions.map((instruction) => {
                  const title = language === 'he' ? instruction.title : (instruction.title_ru || instruction.title);
                  const serviceName = instruction.services
                    ? (language === 'he' ? instruction.services.name : (instruction.services.name_ru || instruction.services.name))
                    : t('careInstructions.noService');

                  return (
                    <tr
                      key={instruction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {serviceName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(instruction)}
                            title={instruction.file_url ? t('common.download') : t('careInstructions.downloadAsTxt')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInstructionToDelete(instruction)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
            {instructions.map((instruction) => {
              const title = language === 'he' ? instruction.title : (instruction.title_ru || instruction.title);
              const serviceName = instruction.services
                ? (language === 'he' ? instruction.services.name : (instruction.services.name_ru || instruction.services.name))
                : t('careInstructions.noService');

              return (
                <div
                  key={instruction.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {serviceName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(instruction)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('common.download')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setInstructionToDelete(instruction)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('careInstructions.noInstructions')}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('careInstructions.newInstruction')}
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CreateCareInstructionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!instructionToDelete} onOpenChange={(open) => !open && setInstructionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('careInstructions.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInstruction.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteInstruction.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
