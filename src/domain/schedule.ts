import {
  eachDayOfInterval,
  set,
  startOfDay,
  subDays,
  isSameDay,
} from 'date-fns';

import {
  CLASS_LEAD_MINUTES,
  DAY_MS,
  EVENING_REMINDER_MINUTES,
  EXTRA_LOOKAHEAD_DAYS,
  HOUR_MS,
  MAX_BEFORE_OFFSET_MS,
  MAX_REPEAT_COUNT,
  MINUTE_MS,
  WEEKDAY_ORDER,
} from './constants';
import type {
  Item,
  ItemInput,
  ItemType,
  Priority,
  ReminderRule,
} from './types';

export interface FireOccurrence {
  at: number;
  kind: ReminderRule['kind'];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

/**
 * Pure scheduling engine. It never reads the clock, the database, or
 * expo-notifications: callers pass the window and get fire times back.
 */
export function computeFireTimes(item: Item, fromMs: number, toMs: number): number[] {
  return computeFireOccurrences(item, fromMs, toMs).map((occurrence) => occurrence.at);
}

/**
 * Same as {@link computeFireTimes}, but keeps the rule kind so notifications
 * can use a different title/body for an evening-before reminder.
 */
export function computeFireOccurrences(
  item: Item,
  fromMs: number,
  toMs: number,
): FireOccurrence[] {
  if (!item.enabled || item.done) return [];
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return [];

  const maxBeforeOffset = item.rules.reduce(
    (longest, rule) => (rule.kind === 'before' ? Math.max(longest, rule.offsetMs) : longest),
    0,
  );
  const anchorToMs =
    toMs + Math.max(EXTRA_LOOKAHEAD_DAYS * DAY_MS, maxBeforeOffset + DAY_MS);

  const found = new Map<number, FireOccurrence>();

  for (const rule of item.rules) {
    switch (rule.kind) {
      case 'before': {
        const safeOffset = Math.max(0, rule.offsetMs);
        for (const anchor of collectAnchors(item, fromMs, anchorToMs)) {
          addIfInside(found, anchor - safeOffset, fromMs, toMs, 'before');
        }
        break;
      }

      case 'repeat': {
        for (const at of repeatTimes(rule, fromMs, toMs)) {
          addIfInside(found, at, fromMs, toMs, 'repeat');
        }
        break;
      }

      case 'eve': {
        const atMinutes = clampMinutes(rule.atMinutes);
        for (const anchor of collectAnchors(item, fromMs, anchorToMs)) {
          const previousDay = subDays(startOfDay(new Date(anchor)), 1);
          const at = set(previousDay, {
            hours: Math.floor(atMinutes / 60),
            minutes: atMinutes % 60,
            seconds: 0,
            milliseconds: 0,
          }).getTime();
          addIfInside(found, at, fromMs, toMs, 'eve');
        }
        break;
      }

      default: {
        // Unknown rule shapes can arrive from an old JSON row; ignore them.
        break;
      }
    }
  }

  return [...found.values()].sort((a, b) => a.at - b.at);
}

function addIfInside(
  target: Map<number, FireOccurrence>,
  at: number,
  fromMs: number,
  toMs: number,
  kind: FireOccurrence['kind'],
) {
  if (!Number.isFinite(at) || at < fromMs || at > toMs) return;
  if (!target.has(at)) target.set(at, { at, kind });
}

function repeatTimes(
  rule: Extract<ReminderRule, { kind: 'repeat' }>,
  fromMs: number,
  toMs: number,
): number[] {
  const { startAt, everyMs, maxCount } = rule;
  if (!Number.isFinite(startAt) || !Number.isFinite(everyMs) || everyMs <= 0) return [];
  if (!Number.isFinite(maxCount) || maxCount <= 0) return [];

  const firstIndex = Math.max(0, Math.ceil((fromMs - startAt) / everyMs));
  const lastIndex = Math.min(maxCount - 1, Math.floor((toMs - startAt) / everyMs));
  if (lastIndex < firstIndex) return [];

  const times: number[] = [];
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    times.push(startAt + index * everyMs);
  }
  return times;
}

/**
 * Anchor times inside a range: the deadline for tasks/events, or every weekly
 * class occurrence for classes.
 */
export function collectAnchors(item: Item, fromMs: number, toMs: number): number[] {
  if (item.type === 'class') {
    if (!item.schedule) return [];
    const { weekday, startMinutes } = item.schedule;
    if (weekday < 0 || weekday > 6 || startMinutes < 0 || startMinutes > 1439) return [];

    const firstDay = startOfDay(new Date(fromMs));
    const lastDay = startOfDay(new Date(toMs));
    if (lastDay < firstDay) return [];

    return eachDayOfInterval({ start: firstDay, end: lastDay })
      .filter((day) => day.getDay() === weekday)
      .map((day) =>
        set(day, {
          hours: Math.floor(startMinutes / 60),
          minutes: startMinutes % 60,
          seconds: 0,
          milliseconds: 0,
        }).getTime(),
      );
  }

  if (item.dueAt === null || !Number.isFinite(item.dueAt)) return [];
  return item.dueAt >= fromMs && item.dueAt <= toMs ? [item.dueAt] : [];
}

export function groupClassesByWeekday(items: Item[]): Record<number, Item[]> {
  const groups = Object.fromEntries(
    WEEKDAY_ORDER.map((weekday) => [weekday, [] as Item[]]),
  ) as Record<number, Item[]>;

  for (const item of items) {
    if (item.type !== 'class' || !item.schedule) continue;
    if (!groups[item.schedule.weekday]) continue;
    groups[item.schedule.weekday].push(item);
  }

  for (const weekday of WEEKDAY_ORDER) {
    groups[weekday].sort((a, b) => {
      const aStart = a.schedule?.startMinutes ?? 0;
      const bStart = b.schedule?.startMinutes ?? 0;
      return aStart - bStart || a.title.localeCompare(b.title);
    });
  }

  return groups;
}

export function sortTasks(items: Item[]): Item[] {
  return [...items]
    .filter((item) => item.type === 'task')
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;

      const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (priorityDelta !== 0) return priorityDelta;

      if (a.dueAt !== b.dueAt) {
        if (a.dueAt === null) return 1;
        if (b.dueAt === null) return -1;
        return a.dueAt - b.dueAt;
      }

      return a.title.localeCompare(b.title);
    });
}

export function defaultRulesForType(type: ItemType): ReminderRule[] {
  if (type === 'event') {
    return [{ kind: 'before', offsetMs: HOUR_MS }];
  }
  if (type === 'class') {
    return [
      { kind: 'eve', atMinutes: EVENING_REMINDER_MINUTES },
      { kind: 'before', offsetMs: CLASS_LEAD_MINUTES * MINUTE_MS },
    ];
  }
  return [];
}

export function validateItemInput(input: ItemInput): ValidationResult {
  const errors: string[] = [];
  const title = input.title.trim();

  if (!title) errors.push('Judul wajib diisi.');
  if (title.length > 120) errors.push('Judul maksimal 120 karakter.');
  if (input.note.length > 2000) errors.push('Catatan maksimal 2000 karakter.');

  if (input.priority !== 'low' && input.priority !== 'normal' && input.priority !== 'high') {
    errors.push('Prioritas tidak dikenal.');
  }

  if (input.dueAt !== null && !Number.isFinite(input.dueAt)) {
    errors.push('Waktu deadline tidak valid.');
  }

  if (input.type === 'event' && input.dueAt === null) {
    errors.push('Acara wajib punya tanggal.');
  }

  if (input.type === 'class') {
    if (!input.schedule) {
      errors.push('Hari dan jam mapel wajib diisi.');
    } else {
      const { weekday, startMinutes, endMinutes } = input.schedule;
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        errors.push('Hari mapel tidak valid.');
      }
      if (!Number.isInteger(startMinutes) || startMinutes < 0 || startMinutes > 1439) {
        errors.push('Jam mulai mapel tidak valid.');
      }
      if (!Number.isInteger(endMinutes) || endMinutes < 1 || endMinutes > 1440) {
        errors.push('Jam selesai mapel tidak valid.');
      }
      if (endMinutes <= startMinutes) {
        errors.push('Jam selesai harus setelah jam mulai.');
      }
    }
    if ((input.room?.length ?? 0) > 80) errors.push('Ruangan maksimal 80 karakter.');
    if ((input.teacher?.length ?? 0) > 80) errors.push('Nama guru maksimal 80 karakter.');
  }

  const hasAnchor =
    input.type === 'class' ? input.schedule !== null : input.dueAt !== null;

  for (const rule of input.rules) {
    switch (rule.kind) {
      case 'before':
        if (!Number.isFinite(rule.offsetMs) || rule.offsetMs <= 0) {
          errors.push('Jarak pengingat harus lebih dari 0.');
        } else if (rule.offsetMs > MAX_BEFORE_OFFSET_MS) {
          errors.push('Jarak pengingat maksimal 30 hari.');
        }
        if (!hasAnchor) {
          errors.push('Pengingat "sebelum" butuh deadline atau jadwal mapel.');
        }
        break;

      case 'repeat':
        if (!Number.isFinite(rule.startAt)) {
          errors.push('Waktu mulai pengingat berulang tidak valid.');
        }
        if (!Number.isFinite(rule.everyMs) || rule.everyMs <= 0) {
          errors.push('Interval pengingat harus lebih dari 0.');
        }
        if (
          !Number.isInteger(rule.maxCount) ||
          rule.maxCount < 1 ||
          rule.maxCount > MAX_REPEAT_COUNT
        ) {
          errors.push(`Jumlah pengulangan harus 1 sampai ${MAX_REPEAT_COUNT}.`);
        }
        break;

      case 'eve':
        if (
          !Number.isInteger(rule.atMinutes) ||
          rule.atMinutes < 0 ||
          rule.atMinutes > 1439
        ) {
          errors.push('Jam pengingat malam sebelumnya tidak valid.');
        }
        if (input.type !== 'class') {
          errors.push('Pengingat malam sebelumnya hanya untuk mapel.');
        }
        break;

      default:
        errors.push('Jenis pengingat tidak dikenal.');
        break;
    }
  }

  return { ok: errors.length === 0, errors };
}

export function isOverdue(item: Item, nowMs: number): boolean {
  return (
    item.type === 'task' &&
    !item.done &&
    item.dueAt !== null &&
    item.dueAt < nowMs
  );
}

export function isDueToday(item: Item, now: Date): boolean {
  return item.dueAt !== null && isSameDay(new Date(item.dueAt), now);
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return EVENING_REMINDER_MINUTES;
  return Math.min(1439, Math.max(0, Math.round(value)));
}
