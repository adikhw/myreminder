import { computeFireTimes } from '../src/domain/schedule';
import type { Item } from '../src/domain/types';

const MIN = 60_000;
const HOUR = 60 * MIN;

// November 2026: the 9th falls on a Monday. Month index 10 = November.
const at = (day: number, hour = 0, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 't1',
    type: 'task',
    title: 'Test',
    note: '',
    priority: 'normal',
    dueAt: at(10, 12, 0),
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

describe('computeFireTimes', () => {
  test('before rule fires at the offset before the deadline', () => {
    const item = makeItem({ rules: [{ kind: 'before', offsetMs: HOUR }] });
    expect(computeFireTimes(item, at(9), at(11))).toEqual([at(10, 11, 0)]);
  });

  test('repeat rule stops after maxCount', () => {
    const item = makeItem({
      dueAt: null,
      rules: [
        { kind: 'repeat', startAt: at(10, 8, 0), everyMs: 30 * MIN, maxCount: 3 },
      ],
    });
    expect(computeFireTimes(item, at(10), at(11))).toEqual([
      at(10, 8, 0),
      at(10, 8, 30),
      at(10, 9, 0),
    ]);
  });

  test('done item never fires', () => {
    const item = makeItem({
      done: true,
      rules: [{ kind: 'before', offsetMs: HOUR }],
    });
    expect(computeFireTimes(item, at(9), at(11))).toEqual([]);
  });

  test('disabled item never fires', () => {
    const item = makeItem({
      enabled: false,
      rules: [{ kind: 'before', offsetMs: HOUR }],
    });
    expect(computeFireTimes(item, at(9), at(11))).toEqual([]);
  });

  test('class: evening-before reminder lands on the previous day', () => {
    const item = makeItem({
      type: 'class',
      dueAt: null,
      // Monday 08:00-10:00
      schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 10 * 60 },
      rules: [
        { kind: 'eve', atMinutes: 20 * 60 },
        { kind: 'before', offsetMs: 30 * MIN },
      ],
    });
    expect(computeFireTimes(item, at(8), at(10))).toEqual([
      at(8, 20, 0), // Sunday evening
      at(9, 7, 30), // Monday, 30 minutes before the class
    ]);
  });

  test('includes both ends of the requested window', () => {
    const item = makeItem({ rules: [{ kind: 'before', offsetMs: HOUR }] });
    expect(computeFireTimes(item, at(10, 11, 0) - 1, at(10, 11, 0))).toEqual([
      at(10, 11, 0),
    ]);
    expect(computeFireTimes(item, at(10, 11, 0), at(10, 11, 0) + 1)).toEqual([
      at(10, 11, 0),
    ]);
  });

  test('deduplicates identical fire times from two rules', () => {
    const item = makeItem({
      rules: [
        { kind: 'before', offsetMs: HOUR },
        { kind: 'before', offsetMs: HOUR },
      ],
    });
    expect(computeFireTimes(item, at(9), at(11))).toEqual([at(10, 11, 0)]);
  });

  test('repeat rule skips occurrences that are already in the past', () => {
    const item = makeItem({
      dueAt: null,
      rules: [
        { kind: 'repeat', startAt: at(10, 8, 0), everyMs: 30 * MIN, maxCount: 3 },
      ],
    });
    expect(computeFireTimes(item, at(10, 8, 45), at(10, 10))).toEqual([
      at(10, 9, 0),
    ]);
  });

  test('repeat rule with a zero interval is ignored', () => {
    const item = makeItem({
      dueAt: null,
      rules: [{ kind: 'repeat', startAt: at(10, 8), everyMs: 0, maxCount: 5 }],
    });
    expect(computeFireTimes(item, at(10), at(11))).toEqual([]);
  });

  test('a before offset larger than the distance to the deadline is skipped', () => {
    const item = makeItem({
      rules: [{ kind: 'before', offsetMs: 30 * 24 * HOUR }],
    });
    expect(computeFireTimes(item, at(9), at(11))).toEqual([]);
  });

  test('Sunday class has its evening reminder on Saturday', () => {
    const item = makeItem({
      type: 'class',
      dueAt: null,
      schedule: { weekday: 0, startMinutes: 8 * 60, endMinutes: 9 * 60 },
      rules: [
        { kind: 'eve', atMinutes: 20 * 60 },
        { kind: 'before', offsetMs: 30 * MIN },
      ],
    });
    expect(computeFireTimes(item, at(7), at(9))).toEqual([
      at(7, 20, 0), // Saturday evening
      at(8, 7, 30), // Sunday morning
    ]);
  });

  test('task without a deadline has no anchor for a before rule', () => {
    const item = makeItem({
      dueAt: null,
      rules: [{ kind: 'before', offsetMs: HOUR }],
    });
    expect(computeFireTimes(item, at(9), at(11))).toEqual([]);
  });

  test('class events remain correct across a month boundary', () => {
    // December 2026 starts on a Tuesday; Monday classes are on the 7th and 14th.
    const decemberMonday = new Date(2026, 11, 7, 8, 0).getTime();
    const item = makeItem({
      type: 'class',
      dueAt: null,
      schedule: { weekday: 1, startMinutes: 8 * 60, endMinutes: 10 * 60 },
      rules: [{ kind: 'before', offsetMs: 30 * MIN }],
    });
    expect(
      computeFireTimes(
        item,
        new Date(2026, 11, 1).getTime(),
        new Date(2026, 11, 8).getTime(),
      ),
    ).toEqual([decemberMonday - 30 * MIN]);
  });
});
