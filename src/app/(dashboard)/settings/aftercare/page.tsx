'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAftercareInstructions, useDeleteAftercareInstruction } from '@/hooks/useAftercareInstructions';
import { AftercareInstruction } from '@/types/aftercare';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AftercareInstructionDialog } from '@/components/aftercare/AftercareInstructionDialog';
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

export default function AftercareInstructionsPage() {
  const { t, language } = useLanguage();
  const { data: instructions, isLoading } = useAftercareInstructions();
  const deleteInstruction = useDeleteAftercareInstruction();

  const [showDialog, setShowDialog] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<AftercareInstruction | null>(null);
  const [instructionToDelete, setInstructionToDelete] = useState<AftercareInstruction | null>(null);

  const handleEdit = (instruction: AftercareInstruction) => {
    setEditingInstruction(instruction);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingInstruction(null);
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!instructionToDelete) return;

    try {
      await deleteInstruction.mutateAsync(instructionToDelete.id);
      toast.success(t('aftercareInstructions.deleted'));
      setInstructionToDelete(null);
    } catch (error) {
      console.error('Error deleting instruction:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('aftercareInstructions.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('aftercareInstructions.description')}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-end mb-6">
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('aftercareInstructions.newInstruction')}
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
                    {t('aftercareInstructions.instructionTitle')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('aftercareInstructions.instructionContent')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {instructions.map((instruction) => {
                  const title = language === 'he' ? instruction.title : (instruction.title_ru || instruction.title);
                  const content = language === 'he' ? instruction.content : (instruction.content_ru || instruction.content);
                  const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;

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
                          {preview}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(instruction)}
                          >
                            <Edit2 className="w-4 h-4" />
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
              const content = language === 'he' ? instruction.content : (instruction.content_ru || instruction.content);
              const preview = content.length > 150 ? content.substring(0, 150) + '...' : content;

              return (
                <div
                  key={instruction.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {preview}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(instruction)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('common.edit')}
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
            {t('aftercareInstructions.noInstructions')}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t('aftercareInstructions.newInstruction')}
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AftercareInstructionDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingInstruction(null);
        }}
        instruction={editingInstruction}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!instructionToDelete} onOpenChange={(open) => !open && setInstructionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('aftercareInstructions.deleteConfirm')}</AlertDialogTitle>
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
