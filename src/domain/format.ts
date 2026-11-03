import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  WEEKDAY_LABELS,
  WEEK_MS,
} from './constants';
import type { ClassSchedule, Item, ReminderRule } from './types';

export function formatTime(value: number): string {
  return format(new Date(value), 'HH:mm');
}

export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.min(1440, Math.round(minutes)));
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function formatMonthTitle(year: number, month: number): string {
  return format(new Date(year, month, 1), 'MMMM yyyy', { locale: localeId });
}

export function formatFullDate(value: Date | number): string {
  return format(new Date(value), 'EEEE, d MMMM yyyy', { locale: localeId });
}

export function formatShortDate(value: Date | number): string {
  return format(new Date(value), 'd MMM yyyy', { locale: localeId });
}

export function formatWeekday(value: Date | number): string {
  return format(new Date(value), 'EEEE', { locale: localeId });
}

export function formatTodayTitle(value: Date = new Date()): string {
  return format(value, 'EEEE, d MMMM', { locale: localeId });
}

export function formatDayLabel(value: Date | number): string {
  const date = new Date(value);
  if (isToday(date)) return 'Hari ini';
  if (isTomorrow(date)) return 'Besok';
  if (isYesterday(date)) return 'Kemarin';
  return format(date, 'd MMM', { locale: localeId });
}

export function formatDue(value: number | null, allDay = false): string {
  if (value === null) return 'Tanpa deadline';
  if (allDay) return `${formatDayLabel(value)} · Seharian`;
  return `${formatDayLabel(value)} · ${formatTime(value)}`;
}

export function formatClassSchedule(schedule: ClassSchedule | null): string {
  if (!schedule) return 'Jadwal belum diisi';
  return `${WEEKDAY_LABELS[schedule.weekday] ?? 'Hari'} · ${formatMinutes(
    schedule.startMinutes,
  )}–${formatMinutes(schedule.endMinutes)}`;
}

export function formatDuration(ms: number): string {
  if (ms >= WEEK_MS && ms % WEEK_MS === 0) {
    const weeks = ms / WEEK_MS;
    return `${weeks} minggu`;
  }
  if (ms >= DAY_MS && ms % DAY_MS === 0) {
    const days = ms / DAY_MS;
    return `${days} hari`;
  }
  if (ms >= HOUR_MS && ms % HOUR_MS === 0) {
    const hours = ms / HOUR_MS;
    return `${hours} jam`;
  }
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  return `${minutes} menit`;
}

export function formatRule(rule: ReminderRule): string {
  switch (rule.kind) {
    case 'before':
      return `${formatDuration(rule.offsetMs)} sebelum`;
    case 'repeat':
      return `Tiap ${formatDuration(rule.everyMs)} · ${rule.maxCount}×`;
    case 'eve':
      return `Malam sebelumnya · ${formatMinutes(rule.atMinutes)}`;
    default:
      return 'Pengingat';
  }
}

export function formatNotificationBody(item: Item, kind: ReminderRule['kind']): string {
  if (item.type === 'class' && item.schedule) {
    const time = formatMinutes(item.schedule.startMinutes);
    const room = item.room ? ` · ${item.room}` : '';
    if (kind === 'eve') return `Besok ${time}${room}`;
    return `Mulai ${time}${room}`;
  }

  if (kind === 'eve') return 'Pengingat malam sebelumnya';

  if (item.allDay) {
    return item.dueAt ? `${formatDayLabel(item.dueAt)} · Seharian` : 'Acara seharian';
  }

  if (item.dueAt) {
    if (kind === 'before') return `Deadline ${formatDayLabel(item.dueAt)} · ${formatTime(item.dueAt)}`;
    return `${formatDayLabel(item.dueAt)} · ${formatTime(item.dueAt)}`;
  }

  return 'Pengingat';
}

export function formatItemSubtitle(item: Item): string {
  if (item.type === 'class') {
    const room = item.room ? ` · ${item.room}` : '';
    const teacher = item.teacher ? ` · ${item.teacher}` : '';
    return `${formatClassSchedule(item.schedule)}${room}${teacher}`;
  }
  return formatDue(item.dueAt, item.allDay);
}
