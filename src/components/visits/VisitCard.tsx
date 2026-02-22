'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdateVisitStatus } from '@/hooks/useVisitServices';
import { Visit } from '@/types/visits';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Play, Clock, DollarSign, User } from 'lucide-react';
import { ActiveVisitCard } from './ActiveVisitCard';
import { toast } from 'sonner';

interface VisitCardProps {
  visit: Visit;
  onComplete: (visit: Visit) => void;
}

export function VisitCard({ visit, onComplete }: VisitCardProps) {
  const { t, language } = useLanguage();
  const updateStatus = useUpdateVisitStatus(visit.id);
  const [showActive, setShowActive] = useState(false);

  const handleStartVisit = async () => {
    try {
      await updateStatus.mutateAsync('in_progress');
      toast.success(t('visits.startVisit') + ' ✓');
      setShowActive(true);
    } catch (error) {
      console.error('Error starting visit:', error);
      toast.error(t('errors.somethingWentWrong'));
    }
  };

  const handleFinish = () => {
    setShowActive(false);
    onComplete(visit);
  };

  // Show active visit card for in_progress visits
  if (visit.status === 'in_progress' || showActive) {
    return <ActiveVisitCard visit={visit} onFinish={handleFinish} />;
  }

  // Regular visit card
  const clientName = `${visit.clients?.first_name} ${visit.clients?.last_name}`;
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  const statusColor = statusColors[visit.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {clientName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {visit.service_type}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Badge className={statusColor}>
            {t(`visits.status.${visit.status}`)}
          </Badge>
          {visit.source === 'online_booking' && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs">
              {language === 'he' ? 'אונליין' : language === 'ru' ? 'Онлайн' : 'Online'}
            </Badge>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {visit.duration_minutes} {t('common.minutes')}
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          ₪{visit.price?.toFixed(2) || '0.00'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {visit.status === 'scheduled' && (
          <>
            <Button
              onClick={handleStartVisit}
              disabled={updateStatus.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {t('visits.startVisit')}
            </Button>
            <Button
              onClick={() => onComplete(visit)}
              variant="outline"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('visits.complete')}
            </Button>
          </>
        )}

        {visit.status === 'completed' && (
          <Button
            onClick={() => onComplete(visit)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {t('visits.viewDetails')}
          </Button>
        )}
      </div>

      {visit.notes && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {visit.notes}
        </p>
      )}
    </div>
  );
}
