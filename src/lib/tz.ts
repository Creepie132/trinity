/**
 * Israel timezone utilities — DST-aware (UTC+2 winter / UTC+3 summer).
 */

/**
 * Convert an Israel local date + time (user input) to UTC ISO string.
 * Uses Intl to resolve the correct offset for the given date,
 * handling DST transitions automatically.
 *
 * @param dateStr - 'YYYY-MM-DD'
 * @param timeStr - 'HH:MM'
 */
export function israelLocalToUTC(dateStr: string, timeStr: string): string {
  // Determine Israel's UTC offset for this specific date using noon as anchor
  // (avoids DST-edge-case ambiguity at midnight)
  const noonUTC = new Date(`${dateStr}T12:00:00.000Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    timeZoneName: 'shortOffset',
  }).formatToParts(noonUTC)
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+2'
  const match = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
  const offset = match
    ? `${match[1]}${match[2].padStart(2, '0')}:${(match[3] ?? '00').padStart(2, '0')}`
    : '+02:00'

  return new Date(`${dateStr}T${timeStr}:00${offset}`).toISOString()
}
