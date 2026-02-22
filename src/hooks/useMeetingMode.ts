import { useOrganization } from './useOrganization'
import { useLanguage } from '@/contexts/LanguageContext'

export function useMeetingMode() {
  const { data: organization } = useOrganization()
  const { language } = useLanguage()
  
  const meetingMode = organization?.features?.meeting_mode === true
  
  const getTranslation = (heVisit: string, ruVisit: string, heMeeting: string, ruMeeting: string): string => {
    if (meetingMode) {
      return language === 'he' ? heMeeting : ruMeeting
    }
    return language === 'he' ? heVisit : ruVisit
  }
  
  return {
    isMeetingMode: meetingMode,
    t: {
      visit: getTranslation('ביקור', 'Визит', 'פגישה', 'Встреча'),
      visits: getTranslation('ביקורים', 'Визиты', 'פגישות', 'Встречи'),
      newVisit: getTranslation('ביקור חדש', 'Новый визит', 'פגישה חדשה', 'Новая встреча'),
      createVisit: getTranslation('צור ביקור', 'Создать визит', 'צור פגישה', 'Создать встречу'),
      startVisit: getTranslation('התחל ביקור', 'Начать визит', 'התחל פגישה', 'Начать встречу'),
      completeVisit: getTranslation('סיים ביקור', 'Завершить визит', 'סיים פגישה', 'Завершить встречу'),
      lastVisit: getTranslation('ביקור אחרון', 'Последний визит', 'פגישה קודמת', 'Предыдущая встреча'),
      noVisits: getTranslation('אין ביקורים', 'Нет визитов', 'אין פגישות', 'Нет встреч'),
      visitHistory: getTranslation('היסטוריית ביקורים', 'История визитов', 'היסטוריית פגישות', 'История встреч'),
      totalVisits: getTranslation('סך ביקורים', 'Всего визитов', 'סך פגישות', 'Всего встреч'),
      todayVisits: getTranslation('ביקורים היום', 'Визиты сегодня', 'פגישות היום', 'Встречи сегодня'),
      monthVisits: getTranslation('ביקורים החודש', 'Визиты за месяц', 'פגישות החודש', 'Встречи за месяц'),
      cancelVisit: getTranslation('בטל ביקור', 'Отменить визит', 'בטל פגישה', 'Отменить встречу'),
      editVisit: getTranslation('ערוך ביקור', 'Редактировать визит', 'ערוך פגישה', 'Редактировать встречу'),
    }
  }
}
