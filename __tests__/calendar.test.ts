import { dayKey, daysWithItems, itemsForDay, monthGrid } from '../src/domain/calendar';
import type { Item } from '../src/domain/types';

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

describe('monthGrid', () => {
  test('starts on Monday and ends on Sunday', () => {
    const weeks = monthGrid(2026, 10); // November 2026
    expect(weeks[0][0].date.getDay()).toBe(1);
    expect(weeks.at(-1)?.at(-1)?.date.getDay()).toBe(0);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  test('includes adjacent days and marks only the current month', () => {
    const weeks = monthGrid(2026, 10);
    expect(dayKey(weeks[0][0].date)).toBe('2026-10-26');
    expect(weeks[0][0].inMonth).toBe(false);
    expect(dayKey(weeks.at(-1)?.at(-1)!.date as Date)).toBe('2026-12-06');
    expect(weeks.at(-1)?.at(-1)?.inMonth).toBe(false);
  });

  test('crosses from December into January', () => {
    const weeks = monthGrid(2026, 11);
    const last = weeks.at(-1)?.at(-1)!.date as Date;
    expect(last.getFullYear()).toBe(2027);
    expect(last.getMonth()).toBe(0);
  });

  test('handles a leap February', () => {
    const weeks = monthGrid(2028, 1);
    const days = weeks.flat().filter((cell) => cell.inMonth);
    expect(days).toHaveLength(29);
    expect(days.at(-1)?.date.getDate()).toBe(29);
  });
});

describe('daysWithItems', () => {
  test('marks every enabled class weekday in the month', () => {
    const mondayClass = makeItem({
      type: 'class',
      schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 10 * 60 },
    });
    const marks = daysWithItems([mondayClass], 2026, 10);
    expect(marks.size).toBe(5); // Nov 2, 9, 16, 23, 30
    expect(marks.has('2026-11-09')).toBe(true);
  });

  test('ignores disabled classes and items without due dates', () => {
    const disabled = makeItem({
      type: 'class',
      enabled: false,
      schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 10 * 60 },
    });
    const noDue = makeItem({ type: 'task', dueAt: null });
    expect(daysWithItems([disabled, noDue], 2026, 10).size).toBe(0);
  });

  test('marks tasks and events on their due date', () => {
    const task = makeItem({ dueAt: new Date(2026, 10, 10, 12).getTime() });
    const event = makeItem({
      id: 'e1',
      type: 'event',
      dueAt: new Date(2026, 10, 10, 8).getTime(),
    });
    expect([...daysWithItems([task, event], 2026, 10)]).toEqual(['2026-11-10']);
  });
});

describe('itemsForDay', () => {
  test('returns classes and due items in chronological order', () => {
    const monday = new Date(2026, 10, 9);
    const classItem = makeItem({
      id: 'c1',
      type: 'class',
      title: 'Matematika',
      schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 9 * 60 },
    });
    const event = makeItem({
      id: 'e1',
      type: 'event',
      title: 'Acara',
      dueAt: new Date(2026, 10, 9, 14).getTime(),
    });
    const task = makeItem({
      id: 't1',
      type: 'task',
      title: 'Tugas',
      dueAt: new Date(2026, 10, 9, 19).getTime(),
    });
    const otherDay = makeItem({
      id: 't2',
      dueAt: new Date(2026, 10, 10, 8).getTime(),
    });

    expect(itemsForDay([task, event, classItem, otherDay], monday).map((item) => item.id)).toEqual([
      'c1',
      'e1',
      't1',
    ]);
  });
});
