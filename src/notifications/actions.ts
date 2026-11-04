import type { SQLiteDatabase } from 'expo-sqlite';

import { getItem, setItemDone } from '@/db/items';
import { bumpItemsRevision } from '@/db/items-events';

import { DONE_ACTION, SNOOZE_ACTION } from './constants';
import { rescheduleAll, scheduleSnooze } from './scheduler';

/**
 * Shared by the foreground response listener and the Android headless task.
 * Every branch is idempotent: repeating an action must not corrupt the data.
 */
export async function handleNotificationAction(
  db: SQLiteDatabase,
  actionIdentifier: string,
  itemId: string,
): Promise<void> {
  if (actionIdentifier === DONE_ACTION) {
    const item = await getItem(db, itemId);
    if (!item || item.type === 'class') return;
    await setItemDone(db, itemId, true);
    bumpItemsRevision();
    await rescheduleAll(db);
    return;
  }

  if (actionIdentifier === SNOOZE_ACTION) {
    await scheduleSnooze(db, itemId);
  }
}
