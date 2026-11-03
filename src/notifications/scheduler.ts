import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DAY_MS,
  MAX_SCHEDULED_NOTIFICATIONS,
  MINUTE_MS,
  SCHEDULE_WINDOW_DAYS,
} from '@/domain/constants';
import { formatItemSubtitle, formatNotificationBody } from '@/domain/format';
import { computeFireOccurrences, type FireOccurrence } from '@/domain/schedule';
import type { Item } from '@/domain/types';
import { getItem, listItems } from '@/db/items';
import { loadSettings } from '@/db/settings';

import {
  CHANNEL_ID,
  CLASS_CATEGORY,
  REMINDER_CATEGORY,
} from './constants';
import {
  hasNotificationPermission,
  requestNotificationPermission,
} from './setup';

export interface RescheduleResult {
  scheduled: number;
  skipped: number;
  failed: number;
  hasPermission: boolean;
  windowStart: number;
  windowEnd: number;
}

export interface ScheduledNotificationSummary {
  id: string;
  title: string;
  body: string;
  at: number | null;
}

interface PendingFire {
  item: Item;
  occurrence: FireOccurrence;
}

let rescheduleQueue: Promise<unknown> = Promise.resolve();

/**
 * Rebuild every alarm from SQLite. It is safe to call on launch, after a save,
 * and after a notification action because the previous schedule is cancelled
 * first and the database is always the source of truth.
 */
export function rescheduleAll(db: SQLiteDatabase): Promise<RescheduleResult> {
  const next = rescheduleQueue.then(() => runReschedule(db));
  rescheduleQueue = next.catch(() => undefined);
  return next;
}

async function runReschedule(db: SQLiteDatabase): Promise<RescheduleResult> {
  const windowStart = Date.now();
  const windowEnd = windowStart + SCHEDULE_WINDOW_DAYS * DAY_MS;
  const hasPermission = await hasNotificationPermission();

  if (!hasPermission) {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    return {
      scheduled: 0,
      skipped: 0,
      failed: 0,
      hasPermission,
      windowStart,
      windowEnd,
    };
  }

  const [items, settings] = await Promise.all([listItems(db), loadSettings(db)]);
  const snoozeEligibleItemIds = new Set(
    items
      .filter(
        (item) =>
          !item.done &&
          item.enabled &&
          !(item.type === 'class' && settings.holidayMode),
      )
      .map((item) => item.id),
  );

  // A snooze is user-created and intentionally not part of the database
  // schedule, so keep it across rebuilds. Snoozes for deleted, finished, or
  // disabled items are cancelled along with the normal schedule.
  try {
    const previous = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of previous) {
      const itemId = request.content.data?.itemId;
      if (
        request.content.data?.snoozed === true &&
        typeof itemId === 'string' &&
        snoozeEligibleItemIds.has(itemId)
      ) {
        continue;
      }
      await Notifications.cancelScheduledNotificationAsync(request.identifier).catch(
        () => undefined,
      );
    }
  } catch {
    // If the old list cannot be read, clear it to avoid duplicate alarms.
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
  }

  const pending: PendingFire[] = [];

  for (const item of items) {
    if (item.type === 'class' && settings.holidayMode) continue;
    for (const occurrence of computeFireOccurrences(item, windowStart, windowEnd)) {
      if (occurrence.at <= windowStart) continue;
      pending.push({ item, occurrence });
    }
  }

  pending.sort((a, b) => a.occurrence.at - b.occurrence.at);
  const selected = pending.slice(0, MAX_SCHEDULED_NOTIFICATIONS);
  let scheduled = 0;
  let failed = 0;

  for (const entry of selected) {
    try {
      await scheduleOccurrence(entry.item, entry.occurrence);
      scheduled += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    scheduled,
    skipped: pending.length - selected.length,
    failed,
    hasPermission,
    windowStart,
    windowEnd,
  };
}

async function scheduleOccurrence(item: Item, occurrence: FireOccurrence): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: formatNotificationBody(item, occurrence.kind),
      sound: 'default',
      categoryIdentifier: categoryFor(item),
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        itemId: item.id,
        fireAt: occurrence.at,
        kind: occurrence.kind,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(occurrence.at),
      channelId: CHANNEL_ID,
    },
  });
}

export async function scheduleSnooze(
  db: SQLiteDatabase,
  itemId: string,
): Promise<string | null> {
  const item = await getItem(db, itemId);
  if (!item) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const settings = await loadSettings(db);
  const at = Date.now() + settings.snoozeMinutes * MINUTE_MS;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: `Ditunda · ${formatItemSubtitle(item)}`,
      sound: 'default',
      categoryIdentifier: categoryFor(item),
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { itemId: item.id, snoozed: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(at),
      channelId: CHANNEL_ID,
    },
  });
}

export async function scheduleTestNotification(seconds = 10): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tes notifikasi',
      body: 'Kalau ini muncul, penjadwalan berjalan dengan baik.',
      sound: 'default',
      data: { test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function listScheduledNotifications(): Promise<ScheduledNotificationSummary[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests
    .map((request) => ({
      id: request.identifier,
      title: request.content.title ?? 'Tanpa judul',
      body: request.content.body ?? '',
      at: readTriggerDate(request.trigger),
    }))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

function readTriggerDate(trigger: Notifications.NotificationTrigger | null): number | null {
  if (!trigger || typeof trigger !== 'object') return null;
  if (!('date' in trigger)) return null;
  const value = (trigger as { date?: unknown }).date;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  return null;
}

function categoryFor(item: Item): string {
  return item.type === 'class' ? CLASS_CATEGORY : REMINDER_CATEGORY;
}
