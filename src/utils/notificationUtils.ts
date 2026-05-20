import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { TrainingLog } from '@/src/screens/TrainingContext';
import { buildReadinessTrend, buildWeekSummary } from '@/src/utils/trainingLogUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function buildWeeklyReportBody(logs: TrainingLog[]): string {
  const week = buildWeekSummary(logs, 0);
  const trend = buildReadinessTrend(logs);

  const parts: string[] = [];
  parts.push(`${week.total} sessions logged this week.`);

  if (trend.status === 'good') {
    parts.push(`Readiness trending up — latest ${trend.latest}/10.`);
  } else if (trend.status === 'warning') {
    parts.push(`Readiness dropping — latest ${trend.latest}/10. Prioritise recovery.`);
  }

  if (week.fatigueWatch > 0) {
    parts.push(`${week.fatigueWatch} fatigue-watch session${week.fatigueWatch > 1 ? 's' : ''} recorded.`);
  }

  if (week.total === 0) {
    return 'No sessions logged this week. Open Sentinel Ready to log your training.';
  }

  return parts.join(' ');
}

const WEEKLY_NOTIF_ID = 'sentinel-weekly-report';

export async function scheduleWeeklySundayReport(logs: TrainingLog[]): Promise<void> {
  const granted = await requestPermission();
  if (!granted) return;

  // Cancel any existing weekly notification before rescheduling
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIF_ID).catch(() => undefined);

  const body = buildWeeklyReportBody(logs);

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_NOTIF_ID,
    content: {
      title: 'Weekly Training Report',
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday (1 = Sunday in Expo's notation)
      hour: 19,
      minute: 0,
    },
  });
}

export async function cancelWeeklyReport(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIF_ID).catch(() => undefined);
}

const TEST_REMINDER_7D_ID = 'sentinel-test-reminder-7d';
const TEST_REMINDER_1D_ID = 'sentinel-test-reminder-1d';

export async function scheduleTestDateReminders(testDate: string | null): Promise<void> {
  // Always clear old reminders first
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(TEST_REMINDER_7D_ID).catch(() => undefined),
    Notifications.cancelScheduledNotificationAsync(TEST_REMINDER_1D_ID).catch(() => undefined),
  ]);

  if (!testDate) return;

  const granted = await requestPermission();
  if (!granted) return;

  const testMs = new Date(testDate + 'T08:00:00').getTime();
  const now = Date.now();
  const sevenDayMs = testMs - 7 * 86_400_000;
  const oneDayMs = testMs - 86_400_000;

  if (sevenDayMs > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: TEST_REMINDER_7D_ID,
      content: {
        title: 'DFIFT in 7 days',
        body: 'One week until your assessment. Keep training controlled and prioritise sleep and recovery this week.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(sevenDayMs),
      },
    });
  }

  if (oneDayMs > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: TEST_REMINDER_1D_ID,
      content: {
        title: 'DFIFT tomorrow',
        body: 'Assessment day is tomorrow. Rest today, stay hydrated and keep warm-up light in the morning.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(oneDayMs),
      },
    });
  }
}
