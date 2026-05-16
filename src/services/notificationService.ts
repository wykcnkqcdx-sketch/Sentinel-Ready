import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'sentinel_notification_prefs';
const CHECK_IN_NOTIF_ID_KEY = 'sentinel_checkin_notif_id';
const REST_NUDGE_NOTIF_ID_KEY = 'sentinel_rest_nudge_notif_id';
const PRE_SESSION_NOTIF_ID_KEY = 'sentinel_presession_notif_id';

export type NotificationPrefs = {
  checkInEnabled: boolean;
  checkInHour: number;
  checkInMinute: number;
  restNudgeEnabled: boolean;
  preSessionEnabled: boolean;
  preSessionHour: number;
  preSessionMinute: number;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  checkInEnabled: true,
  checkInHour: 20,
  checkInMinute: 0,
  restNudgeEnabled: true,
  preSessionEnabled: false,
  preSessionHour: 6,
  preSessionMinute: 30,
};

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function scheduleCheckInReminder(prefs: NotificationPrefs): Promise<void> {
  const oldId = await AsyncStorage.getItem(CHECK_IN_NOTIF_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId);
    await AsyncStorage.removeItem(CHECK_IN_NOTIF_ID_KEY);
  }
  if (!prefs.checkInEnabled) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sentinel Ready',
      body: 'Daily check-in — log sleep, readiness and any pain before lights out.',
    },
    trigger: {
      hour: prefs.checkInHour,
      minute: prefs.checkInMinute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
  await AsyncStorage.setItem(CHECK_IN_NOTIF_ID_KEY, id);
}

export async function schedulePreSessionReminder(prefs: NotificationPrefs): Promise<void> {
  const oldId = await AsyncStorage.getItem(PRE_SESSION_NOTIF_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId);
    await AsyncStorage.removeItem(PRE_SESSION_NOTIF_ID_KEY);
  }
  if (!prefs.preSessionEnabled) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pre-Session Check',
      body: 'Quick readiness check before your session. Are you good to train?',
    },
    trigger: {
      hour: prefs.preSessionHour,
      minute: prefs.preSessionMinute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
  await AsyncStorage.setItem(PRE_SESSION_NOTIF_ID_KEY, id);
}

export async function scheduleRestNudge(message?: string): Promise<void> {
  const oldId = await AsyncStorage.getItem(REST_NUDGE_NOTIF_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId);
    await AsyncStorage.removeItem(REST_NUDGE_NOTIF_ID_KEY);
  }
  const seconds = __DEV__ ? 5 : 60;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recovery Priority',
      body: message ?? 'Readiness is low. Consider rest, mobility and hydration before your next hard session.',
    },
    trigger: {
      seconds,
      repeats: false,
    } as Notifications.TimeIntervalTriggerInput,
  });
  await AsyncStorage.setItem(REST_NUDGE_NOTIF_ID_KEY, id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove([
    CHECK_IN_NOTIF_ID_KEY,
    PRE_SESSION_NOTIF_ID_KEY,
    REST_NUDGE_NOTIF_ID_KEY,
  ]);
}

export async function applyNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await scheduleCheckInReminder(prefs);
  await schedulePreSessionReminder(prefs);
}
