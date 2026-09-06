import { DateTime } from 'luxon';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const formatDateTime = (value: string | null | undefined): string =>
  value ? DateTime.fromISO(value).toFormat('dd LLL yyyy, HH:mm') : '—';

export const formatRelative = (value: string | null | undefined): string =>
  value ? (DateTime.fromISO(value).toRelative() ?? '—') : '—';

/** "1,2,3,4,5" -> "Mon–Fri", with non-contiguous sets listed individually. */
export const formatWorkingDays = (csv: string): string => {
  const days = csv
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((day) => day >= 1 && day <= 7)
    .sort((a, b) => a - b);

  if (days.length === 0) return '—';
  if (days.length === 7) return 'Every day';

  const contiguous = days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  if (contiguous && days.length > 2) {
    return `${WEEKDAY_LABELS[days[0] - 1]}–${WEEKDAY_LABELS[days[days.length - 1] - 1]}`;
  }

  return days.map((day) => WEEKDAY_LABELS[day - 1]).join(', ');
};

/** The broker's own local time right now, for the "is it open there?" column. */
export const localTimeIn = (timezone: string): string => {
  const now = DateTime.now().setZone(timezone);
  return now.isValid ? now.toFormat('HH:mm') : '—';
};
