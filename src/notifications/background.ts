import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getDatabase } from '@/db/database';

import { handleNotificationAction } from './actions';
import { BACKGROUND_ACTION_TASK } from './constants';

/**
 * Defined at module scope so Android can load the JS bundle and run it while
 * the app is backgrounded or terminated. `src/notifications/index.ts` imports
 * this module before the app calls `setupNotifications()`.
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
      const itemId = response.notification.request.content.data?.itemId;
      if (typeof itemId !== 'string') {
        return Notifications.BackgroundNotificationTaskResult.NoData;
      }

      const db = await getDatabase();
      await handleNotificationAction(db, response.actionIdentifier, itemId);
      return Notifications.BackgroundNotificationTaskResult.NoData;
    } catch {
      return Notifications.BackgroundNotificationTaskResult.Failed;
    }
  },
);
