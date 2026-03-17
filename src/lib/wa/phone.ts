/**
 * Нормализует израильский номер телефона в формат Green API / Wati:
 * 972XXXXXXXXX (без + и без @c.us)
 *
 * Принимает:
 *   05XXXXXXXX   → 97255XXXXXXXX  (мобильный IL)
 *   +972XXXXXXXX → 972XXXXXXXX
 *   972XXXXXXXX  → без изменений
 *   03XXXXXXX    → 97203XXXXXXX  (городской IL)
 *
 * Возвращает null если номер невалидный.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Убираем всё кроме цифр
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 0) return null;

  // Уже международный: 972XXXXXXXXX (11-12 цифр)
  if (digits.startsWith('972') && digits.length >= 11) {
    return digits;
  }

  // Локальный израильский: 0XXXXXXXXX (10 цифр)
  if (digits.startsWith('0') && digits.length === 10) {
    return '972' + digits.slice(1);
  }

  // 9-значный без ведущего нуля (редкий случай)
  if (digits.length === 9) {
    return '972' + digits;
  }

  return null;
}
