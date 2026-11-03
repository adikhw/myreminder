import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import {
  BACKGROUND_ACTION_TASK,
  CHANNEL_ID,
  CLASS_CATEGORY,
  DONE_ACTION,
  REMINDER_CATEGORY,
  SNOOZE_ACTION,
} from './constants';

let setupPromise: Promise<void> | null = null;

// Must be registered as early as possible so foreground notifications show.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function setupNotifications(): Promise<void> {
  if (!setupPromise) {
    setupPromise = configure().catch((error: unknown) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

async function configure(): Promise<void> {
  await ensureChannel();
  await ensureCategories();
  await registerBackgroundTask();
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pengingat',
    description: 'Pengingat tugas, acara, dan jadwal mapel',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#4F46E5',
    enableVibrate: true,
  });
}

export async function ensureCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: DONE_ACTION,
      buttonTitle: 'Selesai',
      options: { opensAppToForeground: false },
    },
    {
      identifier: SNOOZE_ACTION,
      buttonTitle: 'Tunda',
      options: { opensAppToForeground: false },
    },
  ]);

  // A class repeats every week. "Selesai" would hide the rest of the term,
  // so class notifications only offer "Tunda".
  await Notifications.setNotificationCategoryAsync(CLASS_CATEGORY, [
    {
      identifier: SNOOZE_ACTION,
      buttonTitle: 'Tunda',
      options: { opensAppToForeground: false },
    },
  ]);
}

async function registerBackgroundTask(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ACTION_TASK);
    if (!registered) {
      await Notifications.registerTaskAsync(BACKGROUND_ACTION_TASK);
    }
  } catch {
    // Registration can fail on a device that has not granted notification
    // permission yet. The foreground response listener still handles actions.
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.granted;
}

export async function hasExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const permission = await Notifications.getExactAlarmPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}

export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const permission = await Notifications.requestExactAlarmPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}
