export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

/** Only schedule this far ahead so stale rules never linger on the device. */
export const SCHEDULE_WINDOW_DAYS = 7;

/** Look a little past the window so `before` rules can still land inside it. */
export const EXTRA_LOOKAHEAD_DAYS = 30;

/** Android has a limited number of alarms per app; stay comfortably below it. */
export const MAX_SCHEDULED_NOTIFICATIONS = 200;

/** Default anchor for all-day events. */
export const ALL_DAY_ANCHOR_MINUTES = 8 * 60;

/** Default evening-before time for classes. */
export const EVENING_REMINDER_MINUTES = 20 * 60;

/** Default time between a class reminder and class start. */
export const CLASS_LEAD_MINUTES = 30;

/** Guard rail for the repeating rule editor. */
export const MAX_REPEAT_COUNT = 100;

/** Longest supported `before` offset (also bounds anchor lookahead). */
export const MAX_BEFORE_OFFSET_MS = 30 * DAY_MS;

export const SNOOZE_MINUTES_OPTIONS = [5, 10, 15, 30, 60] as const;

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Min',
  1: 'Sen',
  2: 'Sel',
  3: 'Rab',
  4: 'Kam',
  5: 'Jum',
  6: 'Sab',
};
