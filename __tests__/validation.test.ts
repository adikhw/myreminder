import {
  defaultRulesForType,
  isDueToday,
  isOverdue,
  sortTasks,
  validateItemInput,
} from '../src/domain/schedule';
import { HOUR_MS, MINUTE_MS } from '../src/domain/constants';
import type { Item, ItemInput } from '../src/domain/types';

function makeInput(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    type: 'task',
    title: 'Belajar TypeScript',
    note: '',
    priority: 'normal',
    dueAt: null,
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

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'task',
    title: 'Test',
    note: '',
    priority: 'normal',
    dueAt: null,
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

describe('validateItemInput', () => {
  test('accepts a task without a deadline or reminders', () => {
    expect(validateItemInput(makeInput())).toEqual({ ok: true, errors: [] });
  });

  test('rejects an empty title', () => {
    const result = validateItemInput(makeInput({ title: '   ' }));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Judul wajib diisi.');
  });

  test('rejects a before reminder without an anchor', () => {
    const result = validateItemInput(
      makeInput({ rules: [{ kind: 'before', offsetMs: HOUR_MS }] }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Pengingat "sebelum" butuh deadline atau jadwal mapel.');
  });

  test('accepts a before reminder with a deadline', () => {
    const result = validateItemInput(
      makeInput({
        dueAt: new Date(2026, 10, 10, 12).getTime(),
        rules: [{ kind: 'before', offsetMs: HOUR_MS }],
      }),
    );
    expect(result.ok).toBe(true);
  });

  test('requires an event date and a valid class schedule', () => {
    const event = validateItemInput(makeInput({ type: 'event', dueAt: null }));
    expect(event.errors).toContain('Acara wajib punya tanggal.');

    const klass = validateItemInput(
      makeInput({
        type: 'class',
        schedule: { weekday: 1, startMinutes: 10 * 60, endMinutes: 9 * 60 },
      }),
    );
    expect(klass.errors).toContain('Jam selesai harus setelah jam mulai.');
  });

  test('rejects an evening reminder outside classes', () => {
    const result = validateItemInput(
      makeInput({ rules: [{ kind: 'eve', atMinutes: 20 * 60 }] }),
    );
    expect(result.errors).toContain('Pengingat malam sebelumnya hanya untuk mapel.');
  });

  test('rejects repeat reminders outside the allowed bounds', () => {
    const result = validateItemInput(
      makeInput({
        rules: [
          { kind: 'repeat', startAt: Date.now(), everyMs: MINUTE_MS, maxCount: 101 },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.startsWith('Jumlah pengulangan'))).toBe(true);
  });
});

describe('defaultRulesForType', () => {
  test('classes get an evening reminder and a 30-minute reminder', () => {
    expect(defaultRulesForType('class')).toEqual([
      { kind: 'eve', atMinutes: 20 * 60 },
      { kind: 'before', offsetMs: 30 * MINUTE_MS },
    ]);
  });

  test('events get a one-hour reminder and tasks start empty', () => {
    expect(defaultRulesForType('event')).toEqual([{ kind: 'before', offsetMs: HOUR_MS }]);
    expect(defaultRulesForType('task')).toEqual([]);
  });
});

describe('sortTasks', () => {
  test('keeps open tasks first, then priority, deadline, and title', () => {
    const items = [
      makeItem({ id: 'done', title: 'Selesai', done: true }),
      makeItem({ id: 'low', title: 'Rendah', priority: 'low' }),
      makeItem({ id: 'high-late', title: 'Tinggi B', priority: 'high', dueAt: 200 }),
      makeItem({ id: 'high-early', title: 'Tinggi A', priority: 'high', dueAt: 100 }),
      makeItem({ id: 'no-due', title: 'Tanpa deadline', priority: 'normal' }),
    ];

    expect(sortTasks(items).map((item) => item.id)).toEqual([
      'high-early',
      'high-late',
      'no-due',
      'low',
      'done',
    ]);
  });
});

describe('date helpers', () => {
  const now = new Date(2026, 10, 10, 12, 0);

  test('isOverdue ignores completed tasks and tasks without a deadline', () => {
    const overdue = makeItem({ dueAt: now.getTime() - 1 });
    expect(isOverdue(overdue, now.getTime())).toBe(true);
    expect(isOverdue({ ...overdue, done: true }, now.getTime())).toBe(false);
    expect(isOverdue({ ...overdue, dueAt: null }, now.getTime())).toBe(false);
  });

  test('isDueToday compares calendar days, not exact times', () => {
    expect(isDueToday(makeItem({ dueAt: now.getTime() }), now)).toBe(true);
    expect(isDueToday(makeItem({ dueAt: now.getTime() + 24 * HOUR_MS }), now)).toBe(false);
  });
});
