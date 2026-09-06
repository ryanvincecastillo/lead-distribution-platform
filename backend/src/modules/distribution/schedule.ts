import { DateTime } from 'luxon';

/**
 * A broker's availability is a *wall-clock rule*, not a set of instants: "09:00–18:00,
 * Mon–Fri, Asia/Manila" means something different every day of the year once DST is in
 * play. Everything here therefore converts the evaluation instant into the broker's own
 * zone first, and only then compares against the stored strings.
 */
export interface BrokerSchedule {
  timezone: string;
  openingTime: string; // "HH:mm"
  closingTime: string; // "HH:mm"
  workingDays: string; // ISO weekdays as CSV, 1=Mon .. 7=Sun
}

export type ClosedReason = 'outside_working_days' | 'outside_open_hours' | 'invalid_schedule';

export interface AvailabilityResult {
  isOpen: boolean;
  reason?: ClosedReason;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "09:30" -> 570. Returns null for anything malformed. */
export const timeToMinutes = (value: string): number | null => {
  const match = HHMM.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** "1,2,3" -> [1,2,3]. Ignores blanks and out-of-range values. */
export const parseWorkingDays = (value: string): number[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7),
    ),
  ).sort((a, b) => a - b);

export const isValidTimezone = (timezone: string): boolean =>
  DateTime.local().setZone(timezone).isValid;

/**
 * Evaluates whether the broker is open at `at`.
 *
 * Overnight windows are supported: when the closing time is earlier than the opening
 * time (say 22:00–06:00) the shift spans midnight, and the working-day check is applied
 * to the day the shift *started* — so a Friday-night shift stays open into Saturday
 * morning even when Saturday is not a working day.
 */
export const evaluateAvailability = (
  schedule: BrokerSchedule,
  at: Date = new Date(),
): AvailabilityResult => {
  const opening = timeToMinutes(schedule.openingTime);
  const closing = timeToMinutes(schedule.closingTime);
  const workingDays = parseWorkingDays(schedule.workingDays);

  if (opening === null || closing === null || workingDays.length === 0) {
    return { isOpen: false, reason: 'invalid_schedule' };
  }

  const local = DateTime.fromJSDate(at, { zone: schedule.timezone });
  if (!local.isValid) return { isOpen: false, reason: 'invalid_schedule' };

  const minutesNow = local.hour * 60 + local.minute;
  const today = local.weekday; // luxon: 1 = Monday .. 7 = Sunday
  const yesterday = today === 1 ? 7 : today - 1;

  // Zero-length window: treated as permanently closed rather than as 24 hours.
  if (opening === closing) return { isOpen: false, reason: 'outside_open_hours' };

  if (closing > opening) {
    if (!workingDays.includes(today)) return { isOpen: false, reason: 'outside_working_days' };
    const withinHours = minutesNow >= opening && minutesNow < closing;
    return withinHours ? { isOpen: true } : { isOpen: false, reason: 'outside_open_hours' };
  }

  // Overnight window.
  if (minutesNow >= opening) {
    return workingDays.includes(today)
      ? { isOpen: true }
      : { isOpen: false, reason: 'outside_working_days' };
  }
  if (minutesNow < closing) {
    return workingDays.includes(yesterday)
      ? { isOpen: true }
      : { isOpen: false, reason: 'outside_working_days' };
  }
  return { isOpen: false, reason: 'outside_open_hours' };
};

/**
 * The UTC instants bounding the broker's *own* calendar day containing `at`.
 * The daily cap is counted inside this range, so a Manila broker rolls over at
 * Manila midnight regardless of where the server runs.
 */
export const brokerDayRange = (timezone: string, at: Date = new Date()): { start: Date; end: Date } => {
  const local = DateTime.fromJSDate(at, { zone: timezone });
  const zoned = local.isValid ? local : DateTime.fromJSDate(at, { zone: 'utc' });

  return {
    start: zoned.startOf('day').toUTC().toJSDate(),
    end: zoned.endOf('day').toUTC().toJSDate(),
  };
};
