'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCareInstructions } from '@/hooks/useCareInstructions';
import { useOrganization } from '@/hooks/useOrganization';
import { CareInstruction } from '@/types/services';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Download, Send, X } from 'lucide-react';
import { generateCareInstructionsPDF, downloadPDF } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface SaleCareInstructionsProps {
  clientName?: string;
  clientPhone?: string;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function SaleCareInstructions({ clientName, clientPhone }: SaleCareInstructionsProps) {
  const { language } = useLanguage();
  const { data: organization } = useOrganization();
  const { data: instructions } = useCareInstructions();

  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<CareInstruction | null>(null);

  const getTitle = (inst: CareInstruction) =>
    language === 'he' ? inst.title : (inst.title_ru || inst.title);

  const getContent = (inst: CareInstruction) =>
    language === 'he' ? inst.content : (inst.content_ru || inst.content);

  const handleDownload = (inst: CareInstruction) => {
    if (!organization) return;
    try {
      if (inst.file_url) {
        window.open(inst.file_url, '_blank');
        toast.success('✓');
        return;
      }
      const doc = generateCareInstructionsPDF({
        organizationName: organization.name,
        clientName: clientName || '',
        instructionTitle: getTitle(inst),
        instructionContent: getContent(inst),
      });
      downloadPDF(doc, `care-${clientName || 'client'}.pdf`);
      toast.success('✓');
    } catch {
      toast.error('שגיאה');
    }
  };

  const handleWhatsApp = (inst: CareInstruction) => {
    if (!clientPhone || !organization) return;
    let message: string;
    if (inst.file_url) {
      message =
        `היי${clientName ? ` ${clientName}` : ''}! 👋\n\n` +
        `תודה שביקרת ב${organization.name}.\n\n` +
        `הוראות הטיפול שלך:\n*${getTitle(inst)}*\n\n` +
        `📄 להורדה: ${inst.file_url}\n\n` +
        `נשמח לראותך שוב! 🌟`;
    } else {
      message =
        `היי${clientName ? ` ${clientName}` : ''}! 👋\n\n` +
        `תודה שביקרת ב${organization.name}.\n\n` +
        `*${getTitle(inst)}*\n\n` +
        `${getContent(inst)}\n\n` +
        `נשמח לראותך שוב! 🌟`;
    }
    window.open(buildWhatsAppUrl(clientPhone, message), '_blank');
    toast.success('נפתח WhatsApp ✓');
  };

  const activeInstructions = instructions?.filter(i => i.is_active !== false) ?? [];

  return (
    <>
      {/* Trigger button — always visible */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
        onClick={() => setShowPicker(true)}
      >
        <FileText className="w-4 h-4" />
        {language === 'he' ? 'הוראות' : 'Инструкции'}
      </Button>

      {/* Picker dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              {language === 'he' ? 'הוראות טיפול' : 'Инструкции по уходу'}
            </DialogTitle>
          </DialogHeader>

          {/* No instructions */}
          {activeInstructions.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              {language === 'he' ? 'אין הוראות טיפול' : 'Нет инструкций по уходу'}
            </p>
          )}

          {/* List */}
          {activeInstructions.length > 0 && !selected && (
            <div className="space-y-2 mt-1">
              {activeInstructions.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setSelected(inst)}
                  className="w-full text-right p-3 rounded-lg border border-gray-200 dark:border-gray-700
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {getTitle(inst)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {inst.services
                        ? (language === 'he' ? inst.services.name : (inst.services.name_ru || inst.services.name))
                        : (language === 'he' ? 'כללי' : 'Общая')}
                    </p>
                  </div>
                  {inst.file_url && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 flex-shrink-0">PDF</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected — action buttons */}
          {selected && (
            <div className="space-y-3 mt-1">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                    {getTitle(selected)}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-blue-400 hover:text-blue-600 flex-shrink-0 ms-2"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(selected)}>
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'he' ? 'הורד PDF' : 'Скачать PDF'}
                </Button>
                {clientPhone && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleWhatsApp(selected)}>
                    <Send className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
              {!clientPhone && (
                <p className="text-xs text-gray-400 text-center">
                  {language === 'he' ? 'בחר לקוח עם טלפון לשליחה ב-WhatsApp' : 'Выберите клиента с телефоном для WhatsApp'}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
