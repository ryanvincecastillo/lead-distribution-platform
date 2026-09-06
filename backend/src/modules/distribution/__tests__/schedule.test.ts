import { describe, expect, it } from 'vitest';
import {
  brokerDayRange,
  evaluateAvailability,
  parseWorkingDays,
  timeToMinutes,
  type BrokerSchedule,
} from '../schedule.js';

const manila: BrokerSchedule = {
  timezone: 'Asia/Manila',
  openingTime: '09:00',
  closingTime: '18:00',
  workingDays: '1,2,3,4,5',
};

describe('timeToMinutes', () => {
  it('parses valid times', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('rejects malformed input', () => {
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('9:00')).toBeNull();
    expect(timeToMinutes('nonsense')).toBeNull();
  });
});

describe('parseWorkingDays', () => {
  it('parses, de-duplicates and sorts', () => {
    expect(parseWorkingDays('5,1,1,3')).toEqual([1, 3, 5]);
  });

  it('drops out-of-range values', () => {
    expect(parseWorkingDays('0,8,2')).toEqual([2]);
  });
});

describe('evaluateAvailability', () => {
  it('is open during business hours on a working day', () => {
    // Wednesday 2026-09-09, 10:00 Manila == 02:00 UTC
    expect(evaluateAvailability(manila, new Date('2026-09-09T02:00:00Z')).isOpen).toBe(true);
  });

  it('is closed before opening time in the broker timezone', () => {
    // 08:59 Manila
    const result = evaluateAvailability(manila, new Date('2026-09-09T00:59:00Z'));
    expect(result).toEqual({ isOpen: false, reason: 'outside_open_hours' });
  });

  it('treats closing time as exclusive', () => {
    // exactly 18:00 Manila
    expect(evaluateAvailability(manila, new Date('2026-09-09T10:00:00Z')).isOpen).toBe(false);
    // 17:59 Manila
    expect(evaluateAvailability(manila, new Date('2026-09-09T09:59:00Z')).isOpen).toBe(true);
  });

  it('is closed on a non-working day', () => {
    // Sunday 2026-09-13, 10:00 Manila
    const result = evaluateAvailability(manila, new Date('2026-09-13T02:00:00Z'));
    expect(result).toEqual({ isOpen: false, reason: 'outside_working_days' });
  });

  it('judges the day in the broker timezone, not UTC', () => {
    // 2026-09-14T00:30Z is still Sunday in UTC but already Monday 08:30 in Manila.
    const beforeOpening = evaluateAvailability(manila, new Date('2026-09-14T00:30:00Z'));
    expect(beforeOpening.reason).toBe('outside_open_hours'); // Monday, just too early

    // 2026-09-11T22:00Z is Friday in UTC but Saturday 06:00 in Manila.
    const saturdayInManila = evaluateAvailability(manila, new Date('2026-09-11T22:00:00Z'));
    expect(saturdayInManila.reason).toBe('outside_working_days');
  });

  it('supports overnight windows that cross midnight', () => {
    const nightShift: BrokerSchedule = {
      timezone: 'Asia/Manila',
      openingTime: '22:00',
      closingTime: '06:00',
      workingDays: '5', // Friday only
    };

    // Friday 23:00 Manila == Friday 15:00 UTC
    expect(evaluateAvailability(nightShift, new Date('2026-09-11T15:00:00Z')).isOpen).toBe(true);
    // Saturday 02:00 Manila — shift started Friday, so still open
    expect(evaluateAvailability(nightShift, new Date('2026-09-11T18:00:00Z')).isOpen).toBe(true);
    // Saturday 07:00 Manila — window has closed
    expect(evaluateAvailability(nightShift, new Date('2026-09-11T23:00:00Z')).isOpen).toBe(false);
  });

  it('rejects an invalid schedule instead of silently passing', () => {
    expect(evaluateAvailability({ ...manila, openingTime: '9am' }).reason).toBe('invalid_schedule');
    expect(evaluateAvailability({ ...manila, workingDays: '' }).reason).toBe('invalid_schedule');
    expect(evaluateAvailability({ ...manila, timezone: 'Mars/Olympus' }).reason).toBe(
      'invalid_schedule',
    );
  });

  it('treats a zero-length window as closed', () => {
    const result = evaluateAvailability({ ...manila, openingTime: '09:00', closingTime: '09:00' });
    expect(result.isOpen).toBe(false);
  });
});

describe('brokerDayRange', () => {
  it('bounds the broker local day, not the server day', () => {
    // Manila is UTC+8 with no DST: local midnight is 16:00 UTC the previous day.
    const { start, end } = brokerDayRange('Asia/Manila', new Date('2026-09-09T02:00:00Z'));
    expect(start.toISOString()).toBe('2026-09-08T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-09T15:59:59.999Z');
  });

  it('accounts for daylight saving time', () => {
    // New York is UTC-4 in September (EDT).
    const { start } = brokerDayRange('America/New_York', new Date('2026-09-09T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-09-09T04:00:00.000Z');

    // ...and UTC-5 in January (EST).
    const winter = brokerDayRange('America/New_York', new Date('2026-01-09T12:00:00Z'));
    expect(winter.start.toISOString()).toBe('2026-01-09T05:00:00.000Z');
  });
});
