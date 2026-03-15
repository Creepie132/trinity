'use client';

import { useState, useEffect } from 'react';
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
import { FileText, Download, Send, ChevronRight } from 'lucide-react';
import { generateCareInstructionsPDF, downloadPDF } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface CareInstructionsButtonsProps {
  serviceType: string;
  clientName: string;
  clientPhone?: string;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function CareInstructionsButtons({
  serviceType,
  clientName,
  clientPhone,
}: CareInstructionsButtonsProps) {
  const { t, language } = useLanguage();
  const { data: organization } = useOrganization();
  const { data: instructions } = useCareInstructions();

  // All instructions that match this service (or are general)
  const [matchingInstructions, setMatchingInstructions] = useState<CareInstruction[]>([]);
  // Currently selected instruction (auto or user-picked)
  const [selected, setSelected] = useState<CareInstruction | null>(null);
  // Show picker dialog when there are multiple matches
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!instructions) return;
    const matches = instructions.filter(
      (inst) =>
        inst.services?.name === serviceType ||
        inst.services?.name_ru === serviceType ||
        !inst.service_id
    );
    setMatchingInstructions(matches);
    // Auto-select if only one match
    if (matches.length === 1) setSelected(matches[0]);
    else setSelected(null);
  }, [instructions, serviceType]);

  if (!matchingInstructions.length || !organization) return null;

  const getTitle = (inst: CareInstruction) =>
    language === 'he' ? inst.title : (inst.title_ru || inst.title);

  const getContent = (inst: CareInstruction) =>
    language === 'he' ? inst.content : (inst.content_ru || inst.content);

  // Download: open file_url or generate jsPDF
  const handleDownload = (inst: CareInstruction) => {
    try {
      if (inst.file_url) {
        window.open(inst.file_url, '_blank');
        toast.success(t('careInstructions.downloadPDF') + ' ✓');
        return;
      }
      const doc = generateCareInstructionsPDF({
        organizationName: organization.name,
        clientName,
        instructionTitle: getTitle(inst),
        instructionContent: getContent(inst),
      });
      downloadPDF(doc, `care-${clientName}.pdf`);
      toast.success(t('careInstructions.downloadPDF') + ' ✓');
    } catch {
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  // WhatsApp: link to file_url OR inline text content
  const handleWhatsApp = (inst: CareInstruction) => {
    if (!clientPhone) {
      toast.error('מספר טלפון לא זמין');
      return;
    }
    let message: string;
    if (inst.file_url) {
      message =
        `היי ${clientName}! 👋\n\n` +
        `תודה שביקרת ב${organization.name}.\n\n` +
        `הוראות הטיפול שלך לאחר הביקור:\n` +
        `${getTitle(inst)}\n\n` +
        `📄 להורדה: ${inst.file_url}\n\n` +
        `נשמח לראותך שוב! 🌟`;
    } else {
      const content = getContent(inst);
      message =
        `היי ${clientName}! 👋\n\n` +
        `תודה שביקרת ב${organization.name}.\n\n` +
        `*${getTitle(inst)}*\n\n` +
        `${content}\n\n` +
        `נשמח לראותך שוב! 🌟`;
    }
    window.open(buildWhatsAppUrl(clientPhone, message), '_blank');
    toast.success('נפתח WhatsApp ✓');
  };

  // Action buttons for a given instruction
  const ActionButtons = ({ inst }: { inst: CareInstruction }) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(inst)}>
        <Download className="w-4 h-4 mr-2" />
        {t('careInstructions.downloadPDF')}
      </Button>
      {clientPhone && (
        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleWhatsApp(inst)}>
          <Send className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
      )}
    </div>
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('careInstructions.sendInstructions')}
        </h3>
      </div>

      {/* Single instruction — show directly */}
      {matchingInstructions.length === 1 && selected && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{getTitle(selected)}</p>
          <ActionButtons inst={selected} />
        </>
      )}

      {/* Multiple instructions — show picker button */}
      {matchingInstructions.length > 1 && (
        <>
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">{getTitle(selected)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPicker(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 h-auto p-1"
                >
                  {t('careInstructions.change') || 'החלף'}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <ActionButtons inst={selected} />
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPicker(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('careInstructions.selectInstruction') || 'בחר הוראות טיפול'}
            </Button>
          )}
        </>
      )}

      {/* Picker dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('careInstructions.selectInstruction') || 'בחר הוראות טיפול'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {matchingInstructions.map((inst) => (
              <button
                key={inst.id}
                onClick={() => {
                  setSelected(inst);
                  setShowPicker(false);
                }}
                className={`w-full text-right p-3 rounded-lg border transition-colors flex items-center gap-3
                  ${selected?.id === inst.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getTitle(inst)}
                  </p>
                  {inst.services && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'he' ? inst.services.name : (inst.services.name_ru || inst.services.name)}
                    </p>
                  )}
                  {!inst.service_id && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('careInstructions.noService') || 'כללי'}
                    </p>
                  )}
                </div>
                {inst.file_url && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">PDF</span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
