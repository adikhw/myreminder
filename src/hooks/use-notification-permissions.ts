import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  hasExactAlarmPermission,
  hasNotificationPermission,
  requestExactAlarmPermission,
  requestNotificationPermission,
} from '@/notifications/setup';

export function useNotificationPermissions() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [exactAlarm, setExactAlarm] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const [notification, exact] = await Promise.all([
      hasNotificationPermission(),
      hasExactAlarmPermission(),
    ]);
    setGranted(notification);
    setExactAlarm(exact);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    const result = await requestNotificationPermission();
    await refresh();
    return result;
  }, [refresh]);

  const requestExact = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const result = await requestExactAlarmPermission();
    await refresh();
    return result;
  }, [refresh]);

  return {
    granted,
    exactAlarm,
    loading: granted === null,
    refresh,
    request,
    requestExact,
  };
}
