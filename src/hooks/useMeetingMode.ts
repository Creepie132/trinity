import { useLanguage } from '@/contexts/LanguageContext'

export function useMeetingMode() {
  const { language } = useLanguage()
  
  const getTranslation = (heVisit: string, ruVisit: string): string => {
    return language === 'he' ? heVisit : ruVisit
  }
  
  return {
    isMeetingMode: false, // Always false - no meeting mode, only visits
    t: {
      visit: getTranslation('ביקור', 'Визит'),
      visits: getTranslation('ביקורים', 'Визиты'),
      newVisit: getTranslation('ביקור חדש', 'Новый визит'),
      createVisit: getTranslation('צור ביקור', 'Создать визит'),
      startVisit: getTranslation('התחל ביקור', 'Начать визит'),
      completeVisit: getTranslation('סיים ביקור', 'Завершить визит'),
      lastVisit: getTranslation('ביקור אחרון', 'Последний визит'),
      noVisits: getTranslation('אין ביקורים', 'Нет визитов'),
      visitHistory: getTranslation('היסטוריית ביקורים', 'История визитов'),
      totalVisits: getTranslation('סך ביקורים', 'Всего визитов'),
      todayVisits: getTranslation('ביקורים היום', 'Визиты сегодня'),
      monthVisits: getTranslation('ביקורים החודש', 'Визиты за месяц'),
      cancelVisit: getTranslation('בטל ביקור', 'Отменить визит'),
      editVisit: getTranslation('ערוך ביקור', 'Редактировать визит'),
    }
  }
}
