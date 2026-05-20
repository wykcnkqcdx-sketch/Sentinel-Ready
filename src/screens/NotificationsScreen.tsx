import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  applyNotificationPrefs,
  cancelAllNotifications,
  DEFAULT_PREFS,
  getNotificationPermissionStatus,
  loadNotificationPrefs,
  NotificationPrefs,
  requestNotificationPermissions,
  saveNotificationPrefs,
  scheduleRestNudge,
} from '@/src/services/notificationService';

const MINUTE_STEPS = [0, 15, 30, 45] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimeStepper({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  function decrementHour() {
    onHourChange(hour === 0 ? 23 : hour - 1);
  }
  function incrementHour() {
    onHourChange(hour === 23 ? 0 : hour + 1);
  }
  function decrementMinute() {
    const idx = MINUTE_STEPS.indexOf(minute as typeof MINUTE_STEPS[number]);
    const prev = idx <= 0 ? MINUTE_STEPS[MINUTE_STEPS.length - 1] : MINUTE_STEPS[idx - 1];
    onMinuteChange(prev);
  }
  function incrementMinute() {
    const idx = MINUTE_STEPS.indexOf(minute as typeof MINUTE_STEPS[number]);
    const next = idx >= MINUTE_STEPS.length - 1 ? MINUTE_STEPS[0] : MINUTE_STEPS[idx + 1];
    onMinuteChange(next);
  }

  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');

  return (
    <View style={ts.row}>
      <View style={ts.stepper}>
        <TouchableOpacity style={ts.btn} onPress={decrementHour} accessibilityLabel="Decrease hour">
          <Text style={ts.btnText}>-</Text>
        </TouchableOpacity>
        <Text style={ts.value}>{hh}</Text>
        <TouchableOpacity style={ts.btn} onPress={incrementHour} accessibilityLabel="Increase hour">
          <Text style={ts.btnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={ts.colon}>:</Text>
      <View style={ts.stepper}>
        <TouchableOpacity style={ts.btn} onPress={decrementMinute} accessibilityLabel="Decrease minute">
          <Text style={ts.btnText}>-</Text>
        </TouchableOpacity>
        <Text style={ts.value}>{mm}</Text>
        <TouchableOpacity style={ts.btn} onPress={incrementMinute} accessibilityLabel="Increase minute">
          <Text style={ts.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252,76,2,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#FC4C02', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  value: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  colon: { color: '#A7ADB8', fontSize: 22, fontWeight: '900' },
});

// ---------------------------------------------------------------------------
// NotificationsScreen
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_PREFS });
  const [permStatus, setPermStatus] = useState<string>('undetermined');

  useEffect(() => {
    loadNotificationPrefs().then(setPrefs);
    getNotificationPermissionStatus().then(setPermStatus);
  }, []);

  const updatePrefs = useCallback(async (next: NotificationPrefs) => {
    setPrefs(next);
    await saveNotificationPrefs(next);
    await applyNotificationPrefs(next);
  }, []);

  async function handleGrantAccess() {
    await requestNotificationPermissions();
    const status = await getNotificationPermissionStatus();
    setPermStatus(status);
    if (status === 'granted') {
      await applyNotificationPrefs(prefs);
    }
  }

  async function handleTestNotification() {
    await scheduleRestNudge('This is a test notification from Sentinel Ready.');
    Alert.alert('Sent', 'Test notification scheduled for 60 seconds from now.');
  }

  async function handleCancelAll() {
    Alert.alert(
      'Cancel All Notifications',
      'This will cancel all scheduled notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            const reloaded = await loadNotificationPrefs();
            setPrefs(reloaded);
            Alert.alert('Done', 'All scheduled notifications have been cancelled.');
          },
        },
      ],
    );
  }

  const permDotColor =
    permStatus === 'granted' ? '#FC4C02'
    : permStatus === 'denied' ? '#ff6b6b'
    : '#F5A623';

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* Header */}
      <Text style={s.kicker}>ALERTS & REMINDERS</Text>
      <Text style={s.title}>Notifications</Text>
      <Text style={s.subtitle}>Set daily reminders and readiness nudges</Text>

      {/* Permission card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>PERMISSION</Text>
        <View style={s.rowBetween}>
          <View style={s.permRow}>
            <View style={[s.dot, { backgroundColor: permDotColor }]} />
            <Text style={s.fieldLabel}>
              Notification access{' '}
              <Text style={s.permStatus}>{permStatus}</Text>
            </Text>
          </View>
        </View>
        {permStatus !== 'granted' && (
          <TouchableOpacity style={s.grantBtn} onPress={handleGrantAccess} accessibilityRole="button">
            <Text style={s.grantBtnText}>Grant Access</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily Check-in Reminder */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>DAILY CHECK-IN</Text>
        <View style={s.rowBetween}>
          <Text style={s.fieldLabel}>Daily check-in reminder</Text>
          <Switch
            value={prefs.checkInEnabled}
            onValueChange={(v) => updatePrefs({ ...prefs, checkInEnabled: v })}
            trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(252,76,2,0.3)' }}
            thumbColor={prefs.checkInEnabled ? '#FC4C02' : '#A7ADB8'}
          />
        </View>
        {prefs.checkInEnabled && (
          <TimeStepper
            hour={prefs.checkInHour}
            minute={prefs.checkInMinute}
            onHourChange={(h) => updatePrefs({ ...prefs, checkInHour: h })}
            onMinuteChange={(m) => updatePrefs({ ...prefs, checkInMinute: m })}
          />
        )}
        <Text style={s.detailText}>
          Reminds you to log sleep quality, readiness and pain before lights out.
        </Text>
      </View>

      {/* Pre-Session Morning Prompt */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>MORNING PROMPT</Text>
        <View style={s.rowBetween}>
          <Text style={s.fieldLabel}>Morning session prompt</Text>
          <Switch
            value={prefs.preSessionEnabled}
            onValueChange={(v) => updatePrefs({ ...prefs, preSessionEnabled: v })}
            trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(252,76,2,0.3)' }}
            thumbColor={prefs.preSessionEnabled ? '#FC4C02' : '#A7ADB8'}
          />
        </View>
        {prefs.preSessionEnabled && (
          <TimeStepper
            hour={prefs.preSessionHour}
            minute={prefs.preSessionMinute}
            onHourChange={(h) => updatePrefs({ ...prefs, preSessionHour: h })}
            onMinuteChange={(m) => updatePrefs({ ...prefs, preSessionMinute: m })}
          />
        )}
        <Text style={s.detailText}>
          A morning nudge to check readiness before your planned session.
        </Text>
      </View>

      {/* Rest Day Nudge */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>REST DAY NUDGE</Text>
        <View style={s.rowBetween}>
          <Text style={s.fieldLabel}>Rest day nudge</Text>
          <Switch
            value={prefs.restNudgeEnabled}
            onValueChange={(v) => updatePrefs({ ...prefs, restNudgeEnabled: v })}
            trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(252,76,2,0.3)' }}
            thumbColor={prefs.restNudgeEnabled ? '#FC4C02' : '#A7ADB8'}
          />
        </View>
        <Text style={s.detailText}>
          Fires automatically when you save a RED readiness check-in (mood 2 or below, or stress 4 or above).
        </Text>
      </View>

      {/* Test Notification */}
      <TouchableOpacity
        style={[s.testBtn, permStatus !== 'granted' && s.testBtnDisabled]}
        onPress={handleTestNotification}
        disabled={permStatus !== 'granted'}
        accessibilityRole="button"
        accessibilityLabel="Send test notification"
        accessibilityState={{ disabled: permStatus !== 'granted' }}
      >
        <Text style={s.testBtnText}>Send Test Notification</Text>
      </TouchableOpacity>

      {/* Cancel All */}
      <TouchableOpacity
        style={s.cancelBtn}
        onPress={handleCancelAll}
        accessibilityRole="button"
        accessibilityLabel="Cancel all notifications"
      >
        <Text style={s.cancelBtnText}>Cancel All Notifications</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  content: { padding: 20, gap: 14, paddingBottom: 120 },

  kicker: { color: '#FC4C02', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#A7ADB8', fontSize: 14 },

  card: {
    backgroundColor: '#1E2229',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    color: '#FC4C02',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  fieldLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  detailText: { color: '#A7ADB8', fontSize: 13, lineHeight: 19 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  permRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  permStatus: { color: '#A7ADB8', fontWeight: '700' },

  grantBtn: {
    backgroundColor: 'rgba(252,76,2,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  grantBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  testBtn: {
    backgroundColor: 'rgba(252,76,2,0.3)',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 6,
  },
  testBtnDisabled: { backgroundColor: '#1a3a22', opacity: 0.5 },
  testBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  cancelBtn: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  cancelBtnText: { color: '#ff6b6b', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});
