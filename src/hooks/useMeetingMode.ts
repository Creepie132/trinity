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
      visits: getTranslation('תורים', 'Визиты'),
      newVisit: getTranslation('ביקור חדש', 'Новый визит'),
      createVisit: getTranslation('צור ביקור', 'Создать визит'),
      startVisit: getTranslation('התחל ביקור', 'Начать визит'),
      completeVisit: getTranslation('סיים ביקור', 'Завершить визит'),
      lastVisit: getTranslation('ביקור אחרון', 'Последний визит'),
      noVisits: getTranslation('אין תורים', 'Нет визитов'),
      visitHistory: getTranslation('היסטוריית תורים', 'История визитов'),
      totalVisits: getTranslation('סך תורים', 'Всего визитов'),
      todayVisits: getTranslation('תורים היום', 'Визиты сегодня'),
      monthVisits: getTranslation('תורים החודש', 'Визиты за месяц'),
      cancelVisit: getTranslation('בטל ביקור', 'Отменить визит'),
      editVisit: getTranslation('ערוך ביקור', 'Редактировать визит'),
    }
  }
}
