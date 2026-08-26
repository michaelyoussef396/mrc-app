import { describe, expect, it } from 'vitest';

import {
  buildHourOptions,
  buildMinuteOptions,
  buildPeriodOptions,
  clampToRange,
  formatTimeLabel,
  formatTimeOfDay,
  fromMinutes,
  parseTimeOfDay,
  toMinutes,
} from '../timeOfDay';

/** MRC operating hours: 7:00 AM – 7:00 PM. */
const OPENING_MINUTES = 7 * 60;
const CLOSING_MINUTES = 19 * 60;

const EVERY_MINUTE = Array.from({ length: 60 }, (_, minute) => minute);

describe('toMinutes', () => {
  it('should return minutes since midnight for an arbitrary-minute time', () => {
    expect(toMinutes('09:07')).toBe(547);
  });

  it('should return null when the minute component is out of range', () => {
    expect(toMinutes('09:99')).toBeNull();
  });

  it('should return null when the hour component exceeds 23', () => {
    expect(toMinutes('24:00')).toBeNull();
  });

  it('should return null for a band label', () => {
    expect(toMinutes('Morning (8am–12pm)')).toBeNull();
  });
});

describe('fromMinutes', () => {
  it('should zero-pad single-digit hours and minutes', () => {
    expect(fromMinutes(547)).toBe('09:07');
  });
});

describe('round-tripping a value', () => {
  it('should preserve a morning arbitrary-minute time', () => {
    expect(formatTimeOfDay(parseTimeOfDay('09:07')!)).toBe('09:07');
  });

  it('should preserve a late-afternoon arbitrary-minute time', () => {
    expect(formatTimeOfDay(parseTimeOfDay('17:43')!)).toBe('17:43');
  });
});

describe('midnight and noon conversion', () => {
  it('should map 12:00 AM to 00:00', () => {
    expect(formatTimeOfDay({ hour12: 12, minute: 0, period: 'AM' })).toBe('00:00');
  });

  it('should map 12:00 PM to 12:00', () => {
    expect(formatTimeOfDay({ hour12: 12, minute: 0, period: 'PM' })).toBe('12:00');
  });

  it('should parse 00:00 as twelve AM', () => {
    expect(parseTimeOfDay('00:00')).toEqual({ hour12: 12, minute: 0, period: 'AM' });
  });

  it('should parse 12:00 as twelve PM', () => {
    expect(parseTimeOfDay('12:00')).toEqual({ hour12: 12, minute: 0, period: 'PM' });
  });
});

describe('buildMinuteOptions', () => {
  it('should offer every minute at the default interval', () => {
    expect(buildMinuteOptions(9, 'AM', OPENING_MINUTES, CLOSING_MINUTES)).toEqual(EVERY_MINUTE);
  });

  it('should offer four options at a fifteen-minute interval', () => {
    expect(buildMinuteOptions(9, 'AM', OPENING_MINUTES, CLOSING_MINUTES, 15)).toEqual([
      0, 15, 30, 45,
    ]);
  });

  it('should offer every minute of the opening hour', () => {
    expect(buildMinuteOptions(7, 'AM', OPENING_MINUTES, CLOSING_MINUTES)).toEqual(EVERY_MINUTE);
  });

  it('should offer only the top of the hour at the closing bound', () => {
    expect(buildMinuteOptions(7, 'PM', OPENING_MINUTES, CLOSING_MINUTES)).toEqual([0]);
  });
});

describe('buildHourOptions', () => {
  it('should exclude morning hours before the opening bound', () => {
    expect(buildHourOptions('AM', OPENING_MINUTES, CLOSING_MINUTES)).toEqual([7, 8, 9, 10, 11]);
  });

  it('should list afternoon hours from noon to the closing bound', () => {
    expect(buildHourOptions('PM', OPENING_MINUTES, CLOSING_MINUTES)).toEqual([
      12, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });
});

describe('buildPeriodOptions', () => {
  it('should offer both periods across a full business day', () => {
    expect(buildPeriodOptions(OPENING_MINUTES, CLOSING_MINUTES)).toEqual(['AM', 'PM']);
  });

  it('should offer only the afternoon when the window opens after noon', () => {
    expect(buildPeriodOptions(13 * 60, 17 * 60)).toEqual(['PM']);
  });
});

describe('clampToRange', () => {
  it('should raise a time below the opening bound', () => {
    expect(clampToRange(6 * 60, OPENING_MINUTES, CLOSING_MINUTES)).toBe(OPENING_MINUTES);
  });

  it('should lower a time above the closing bound', () => {
    expect(clampToRange(20 * 60, OPENING_MINUTES, CLOSING_MINUTES)).toBe(CLOSING_MINUTES);
  });

  it('should leave an in-range arbitrary-minute time untouched', () => {
    expect(clampToRange(547, OPENING_MINUTES, CLOSING_MINUTES)).toBe(547);
  });

  it('should snap an in-range time onto a coarser interval grid', () => {
    expect(clampToRange(547, OPENING_MINUTES, CLOSING_MINUTES, 15)).toBe(9 * 60);
  });
});

describe('formatTimeLabel', () => {
  it('should render an arbitrary minute in twelve-hour form', () => {
    expect(formatTimeLabel('14:05')).toBe('2:05 PM');
  });

  it('should render midnight as twelve AM', () => {
    expect(formatTimeLabel('00:00')).toBe('12:00 AM');
  });

  it('should render noon as twelve PM', () => {
    expect(formatTimeLabel('12:00')).toBe('12:00 PM');
  });

  it('should return a band label unchanged', () => {
    expect(formatTimeLabel('Morning (8am–12pm)')).toBe('Morning (8am–12pm)');
  });

  it('should return an empty string for a null value', () => {
    expect(formatTimeLabel(null)).toBe('');
  });
});
