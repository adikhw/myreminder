import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { Item } from './types';

export interface MonthCell {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
}

export function dayKey(value: Date | number): string {
  return format(new Date(value), 'yyyy-MM-dd');
}

/**
 * Monday-first month grid. It includes the adjacent days needed to complete
 * the first and last weeks, so the UI can render whole rows.
 */
export function monthGrid(year: number, month: number): MonthCell[][] {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: MonthCell[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    const week = days.slice(index, index + 7).map<MonthCell>((date) => ({
      date,
      key: dayKey(date),
      inMonth: isSameMonth(date, monthStart),
      isToday: isToday(date),
    }));
    weeks.push(week);
  }
  return weeks;
}

/** All day keys in a month that should show a dot on the calendar. */
export function daysWithItems(items: Item[], year: number, month: number): Set<string> {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);
  const result = new Set<string>();

  for (const item of items) {
    if (!item.enabled) continue;

    if (item.type === 'class') {
      if (!item.schedule) continue;
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      for (const day of days) {
        if (day.getDay() === item.schedule.weekday) {
          result.add(dayKey(day));
        }
      }
      continue;
    }

    if (item.dueAt === null) continue;
    const due = new Date(item.dueAt);
    if (due >= monthStart && due <= monthEnd) {
      result.add(dayKey(due));
    }
  }

  return result;
}

/**
 * Items shown when a calendar day is selected. Classes are projected from
 * their weekly slot; tasks and events use their due timestamp.
 */
export function itemsForDay(items: Item[], day: Date): Item[] {
  const matching = items.filter((item) => {
    if (!item.enabled) return false;
    if (item.type === 'class') {
      return item.schedule !== null && item.schedule.weekday === day.getDay();
    }
    return item.dueAt !== null && isSameDay(new Date(item.dueAt), day);
  });

  return matching.sort((a, b) => daySortValue(a) - daySortValue(b));
}

function daySortValue(item: Item): number {
  if (item.type === 'class') return item.schedule?.startMinutes ?? 0;
  if (item.allDay) return 0;
  if (item.dueAt === null) return Number.MAX_SAFE_INTEGER;
  const due = new Date(item.dueAt);
  return due.getHours() * 60 + due.getMinutes();
}
