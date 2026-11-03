import {
  formatDuration,
  formatMinutes,
  formatNotificationBody,
  formatRule,
} from '../src/domain/format';
import { HOUR_MS, MINUTE_MS, WEEK_MS } from '../src/domain/constants';
import type { Item } from '../src/domain/types';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'task',
    title: 'Belajar',
    note: '',
    priority: 'normal',
    dueAt: new Date(2030, 0, 15, 12).getTime(),
    allDay: false,
    schedule: null,
    room: null,
    teacher: null,
    enabled: true,
    done: false,
    rules: [],
    ...overrides,
  };
}

describe('format helpers', () => {
  test('formats minutes since midnight', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(8 * 60 + 5)).toBe('08:05');
    expect(formatMinutes(1440)).toBe('24:00');
  });

  test('formats durations using the largest exact unit', () => {
    expect(formatDuration(30 * MINUTE_MS)).toBe('30 menit');
    expect(formatDuration(2 * HOUR_MS)).toBe('2 jam');
    expect(formatDuration(3 * 24 * HOUR_MS)).toBe('3 hari');
    expect(formatDuration(2 * WEEK_MS)).toBe('2 minggu');
  });

  test('describes reminder rules', () => {
    expect(formatRule({ kind: 'before', offsetMs: HOUR_MS })).toBe('1 jam sebelum');
    expect(
      formatRule({ kind: 'repeat', startAt: 0, everyMs: 30 * MINUTE_MS, maxCount: 5 }),
    ).toBe('Tiap 30 menit · 5×');
    expect(formatRule({ kind: 'eve', atMinutes: 20 * 60 })).toBe('Malam sebelumnya · 20:00');
  });

  test('builds a class evening-before notification body', () => {
    const item = makeItem({
      type: 'class',
      dueAt: null,
      room: 'R.201',
      schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 10 * 60 },
    });
    expect(formatNotificationBody(item, 'eve')).toBe('Besok 08:00 · R.201');
  });

  test('builds a task deadline notification body', () => {
    const item = makeItem();
    expect(formatNotificationBody(item, 'before')).toContain('Deadline');
  });
});
