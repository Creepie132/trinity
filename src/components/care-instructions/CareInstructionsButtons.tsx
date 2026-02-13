'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCareInstructions } from '@/hooks/useCareInstructions';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { FileText, Download, Send } from 'lucide-react';
import { generateCareInstructionsPDF, downloadPDF, getWhatsAppMessage, openWhatsAppWithMessage } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface CareInstructionsButtonsProps {
  serviceType: string;
  clientName: string;
  clientPhone?: string;
}

export function CareInstructionsButtons({ serviceType, clientName, clientPhone }: CareInstructionsButtonsProps) {
  const { t, language } = useLanguage();
  const { data: organization } = useOrganization();
  const { data: instructions } = useCareInstructions();
  const [matchingInstruction, setMatchingInstruction] = useState<any>(null);

  useEffect(() => {
    if (!instructions) return;

    // Find instruction that matches service_type or is general (no service_id)
    const match = instructions.find(
      (inst) => inst.services?.name === serviceType || inst.services?.name_ru === serviceType || !inst.service_id
    );

    setMatchingInstruction(match);
  }, [instructions, serviceType]);

  if (!matchingInstruction || !organization) {
    return null;
  }

  const instructionTitle = language === 'he' ? matchingInstruction.title : (matchingInstruction.title_ru || matchingInstruction.title);
  const instructionContent = language === 'he' ? matchingInstruction.content : (matchingInstruction.content_ru || matchingInstruction.content);

  const handleDownloadPDF = () => {
    try {
      const doc = generateCareInstructionsPDF({
        organizationName: organization.name,
        clientName,
        instructionTitle,
        instructionContent,
      });

      downloadPDF(doc, `care-instructions-${clientName}.pdf`);
      toast.success(t('careInstructions.downloadPDF') + ' ✓');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleSendWhatsApp = () => {
    if (!clientPhone) {
      toast.error('מספר טלפון לא זמין');
      return;
    }

    try {
      const message = getWhatsAppMessage(organization.name, instructionTitle);
      openWhatsAppWithMessage(clientPhone, message);
      toast.success('נפתח WhatsApp');
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('careInstructions.sendInstructions')}
        </h3>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {instructionTitle}
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('careInstructions.downloadPDF')}
        </Button>
        
        {clientPhone && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendWhatsApp}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            {t('careInstructions.sendWhatsApp')}
          </Button>
        )}
      </div>
    </div>
  );
}
