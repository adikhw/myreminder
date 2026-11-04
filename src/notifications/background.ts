import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getDatabase } from '@/db/database';

import { handleNotificationAction } from './actions';
import { BACKGROUND_ACTION_TASK } from './constants';

/**
 * Scheduled notifications serialize `content.data` as a JSON string under
 * `dataString`; only the foreground listener maps it back to an object. The
 * headless task receives the raw payload, so it has to do the mapping itself.
 */
function readContentData(
  content: Notifications.NotificationContent,
): Record<string, unknown> | null {
  if (content.data && typeof content.data === 'object') {
    return content.data as Record<string, unknown>;
  }

  const dataString = (content as Notifications.NotificationContent & { dataString?: unknown })
    .dataString;
  if (typeof dataString !== 'string') return null;

  try {
    const parsed: unknown = JSON.parse(dataString);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Defined at module scope so Android can load the JS bundle and run it while
 * the app is backgrounded or terminated. `index.js` imports this module before
 * Expo Router mounts, which is the only point guaranteed to run headlessly.
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_ACTION_TASK,
  async ({ data, error }) => {
    if (error) {
      return Notifications.BackgroundNotificationTaskResult.Failed;
    }

    try {
      if (!data || typeof data !== 'object' || !('actionIdentifier' in data)) {
        return Notifications.BackgroundNotificationTaskResult.NoData;
      }

      const response = data as Notifications.NotificationResponse;
      const payload = readContentData(response.notification.request.content);
      const itemId = payload?.itemId;
      if (typeof itemId !== 'string') {
        return Notifications.BackgroundNotificationTaskResult.NoData;
      }

      const db = await getDatabase();
      await handleNotificationAction(db, response.actionIdentifier, itemId);
      return Notifications.BackgroundNotificationTaskResult.NoData;
    } catch (taskError) {
      console.error('[notifications] action task failed', taskError);
      return Notifications.BackgroundNotificationTaskResult.Failed;
    }
  },
);
