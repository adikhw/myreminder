import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { useSettings } from '@/settings/SettingsProvider';

import { handleNotificationAction } from './actions';
import { rescheduleAll } from './scheduler';
import { hasNotificationPermission, setupNotifications } from './setup';

const MAIN_ROUTES = new Set(['/', '/schedule', '/calendar', '/settings']);

/**
 * Connects app lifecycle to the notification engine:
 * - builds the channel/categories/background task once
 * - rebuilds alarms on launch and whenever the app returns to the foreground
 * - handles the "Selesai" and "Tunda" actions in the foreground
 * - shows the battery guide once after permission is granted
 */
export function NotificationBridge() {
  const db = useDatabase();
  const { settings, refreshSettings, markGuideSeen } = useSettings();
  const pathname = usePathname();
  const guideShownRef = useRef(false);

  useEffect(() => {
    setupNotifications()
      .then(() => rescheduleAll(db))
      .catch(() => undefined);
  }, [db]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const itemId = response.notification.request.content.data?.itemId;
      if (typeof itemId !== 'string') return;
      handleNotificationAction(db, response.actionIdentifier, itemId)
        .then(() => refreshSettings())
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [db, refreshSettings]);

  const maybeShowGuide = useCallback(async () => {
    if (guideShownRef.current || settings.setupGuideSeen) return;
    if (!MAIN_ROUTES.has(pathname)) return;

    const granted = await hasNotificationPermission();
    if (!granted) return;

    guideShownRef.current = true;
    await markGuideSeen();
    router.push('/guide');
  }, [markGuideSeen, pathname, settings.setupGuideSeen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      rescheduleAll(db).catch(() => undefined);
      refreshSettings().catch(() => undefined);
      maybeShowGuide().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [db, maybeShowGuide, refreshSettings]);

  useEffect(() => {
    maybeShowGuide().catch(() => undefined);
  }, [maybeShowGuide]);

  return null;
}
