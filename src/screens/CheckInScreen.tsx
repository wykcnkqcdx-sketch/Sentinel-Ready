import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { ReadinessLog } from '@/src/types/map';
import { saveReadinessLog, getLatestReadinessLog } from '@/src/services/readinessService';
import { scheduleRestNudge, loadNotificationPrefs } from '@/src/services/notificationService';

// ---------------------------------------------------------------------------
// ScaleRow
// ---------------------------------------------------------------------------

function ScaleRow({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  labels?: [string, string];
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <TouchableOpacity
            key={n}
            style={[scaleStyles.pip, value === n && scaleStyles.pipActive]}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} of 5`}
            accessibilityState={{ selected: value === n }}
          >
            <Text style={[scaleStyles.pipText, value === n && scaleStyles.pipTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {labels && (
        <View style={scaleStyles.labelRow}>
          <Text style={scaleStyles.labelLeft}>{labels[0]}</Text>
          <Text style={scaleStyles.labelRight}>{labels[1]}</Text>
        </View>
      )}
    </View>
  );
}

const scaleStyles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  labelLeft: { color: '#7db88a', fontSize: 12 },
  labelRight: { color: '#7db88a', fontSize: 12 },
  pip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pipActive: { backgroundColor: 'rgba(181,133,44,0.3)', borderColor: 'rgba(181,133,44,0.3)' },
  pipText: { color: '#8FAEC8', fontSize: 13, fontWeight: '900' },
  pipTextActive: { color: '#FFFFFF' },
});

// ---------------------------------------------------------------------------
// StarRating (sleep quality)
// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
            accessibilityState={{ selected: value >= n }}
            style={starStyles.star}
          >
            <Text style={[starStyles.starText, value >= n && starStyles.starActive]}>
              {'★'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={starStyles.label}>Poor</Text>
        <Text style={starStyles.label}>Great</Text>
      </View>
    </View>
  );
}

const starStyles = StyleSheet.create({
  star: { flex: 1, alignItems: 'center' },
  starText: { fontSize: 26, color: '#2a4a33' },
  starActive: { color: '#B5852C' },
  label: { color: '#7db88a', fontSize: 12 },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const PAIN_AREAS: ReadinessLog['painArea'][] = [
  'Knee', 'Back', 'Shoulder', 'Hip', 'Ankle', 'Other',
];

// ---------------------------------------------------------------------------
// CheckInScreen
// ---------------------------------------------------------------------------

export default function CheckInScreen() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [soreness, setSoreness] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [stress, setStress] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [hydration, setHydration] = useState<'Poor' | 'Adequate' | 'Optimal'>('Adequate');
  const [hasPain, setHasPain] = useState(false);
  const [pain, setPain] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [painArea, setPainArea] = useState<ReadinessLog['painArea']>('Other');
  const [limitsTraining, setLimitsTraining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);

  useEffect(() => {
    getLatestReadinessLog().then((log) => {
      if (!log) return;
      if (log.date === today) setAlreadyLoggedToday(true);
      if (log.sleepHours !== undefined) setSleepHours(log.sleepHours);
      if (log.sleepQuality) setSleepQuality(log.sleepQuality);
      if (log.soreness) setSoreness(log.soreness);
      if (log.stress) setStress(log.stress);
      if (log.mood) setMood(log.mood);
      if (log.hydration) setHydration(log.hydration);
      if (log.pain !== undefined) {
        setHasPain(true);
        setPain(log.pain);
      }
      if (log.painArea) setPainArea(log.painArea);
      if (log.limitsTraining !== undefined) setLimitsTraining(log.limitsTraining);
    });
  }, [today]);

  async function handleSave() {
    setSaving(true);
    try {
      const log: ReadinessLog = {
        id: `checkin-${today}`,
        date: today,
        sleepHours,
        sleepQuality,
        soreness,
        stress,
        mood,
        hydration,
        pain: hasPain ? pain : undefined,
        painArea: hasPain ? painArea : undefined,
        limitsTraining: hasPain ? limitsTraining : undefined,
        updatedAt: new Date().toISOString(),
      };
      await saveReadinessLog(log);
      try {
        const notifPrefs = await loadNotificationPrefs();
        const mood = log.mood ?? 3;
        const stress = log.stress ?? 3;
        const sleepHours = log.sleepHours ?? 7;
        const sleepQuality = log.sleepQuality ?? 3;
        const isRedReadiness = mood <= 2 || stress >= 4 || (sleepHours < 5.5 && sleepQuality <= 2);
        if (notifPrefs.restNudgeEnabled && isRedReadiness) {
          await scheduleRestNudge();
        }
      } catch {
        // notification scheduling is non-critical — don't block save
      }
      router.back();
    } catch {
      Alert.alert('Save failed', 'Could not save check-in. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function adjustSleep(delta: number) {
    setSleepHours((h) => Math.round(Math.min(10, Math.max(4, h + delta)) * 2) / 2);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>

      {/* Header */}
      <Text style={s.kicker}>DAILY CHECK-IN</Text>
      <Text style={s.title}>How are you today?</Text>
      <Text style={s.subtitle}>{formatDate(today)}</Text>

      {alreadyLoggedToday && (
        <View style={s.amberBanner}>
          <Text style={s.amberBannerText}>
            Already logged today — editing your entry.
          </Text>
        </View>
      )}

      {/* Sleep card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>SLEEP</Text>

        <View style={s.rowBetween}>
          <Text style={s.fieldLabel}>Hours slept</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              style={s.stepBtn}
              onPress={() => adjustSleep(-0.5)}
              accessibilityRole="button"
              accessibilityLabel="Decrease sleep hours"
            >
              <Text style={s.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={s.stepValue}>{sleepHours}h</Text>
            <TouchableOpacity
              style={s.stepBtn}
              onPress={() => adjustSleep(0.5)}
              accessibilityRole="button"
              accessibilityLabel="Increase sleep hours"
            >
              <Text style={s.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.fieldLabel}>Sleep quality</Text>
        <StarRating value={sleepQuality} onChange={setSleepQuality} />
      </View>

      {/* Recovery card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>RECOVERY</Text>

        <Text style={s.fieldLabel}>Muscle soreness</Text>
        <ScaleRow value={soreness} onChange={setSoreness} labels={['None', 'Severe']} />

        <Text style={[s.fieldLabel, { marginTop: 14 }]}>Hydration</Text>
        <View style={s.pillRow}>
          {(['Poor', 'Adequate', 'Optimal'] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.pill, hydration === opt && s.pillActive]}
              onPress={() => setHydration(opt)}
              accessibilityRole="radio"
              accessibilityState={{ selected: hydration === opt }}
            >
              <Text style={[s.pillText, hydration === opt && s.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Readiness card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>READINESS</Text>

        <Text style={s.fieldLabel}>Stress level</Text>
        <ScaleRow value={stress} onChange={setStress} labels={['None', 'High']} />

        <Text style={[s.fieldLabel, { marginTop: 14 }]}>Mood</Text>
        <ScaleRow value={mood} onChange={setMood} labels={['Low', 'High']} />
      </View>

      {/* Pain card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>PAIN / INJURY</Text>

        <View style={s.rowBetween}>
          <Text style={s.fieldLabel}>Any pain today?</Text>
          <Switch
            value={hasPain}
            onValueChange={setHasPain}
            trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(181,133,44,0.3)' }}
            thumbColor={hasPain ? '#B5852C' : '#8FAEC8'}
          />
        </View>

        {hasPain && (
          <>
            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Pain level</Text>
            <ScaleRow value={pain} onChange={setPain} labels={['Mild', 'Severe']} />

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Pain area</Text>
            <View style={s.pillRow}>
              {PAIN_AREAS.map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[s.pill, painArea === area && s.pillActive]}
                  onPress={() => setPainArea(area)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: painArea === area }}
                >
                  <Text style={[s.pillText, painArea === area && s.pillTextActive]}>{area}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[s.rowBetween, { marginTop: 14 }]}>
              <Text style={s.fieldLabel}>Limits training?</Text>
              <Switch
                value={limitsTraining}
                onValueChange={setLimitsTraining}
                trackColor={{ false: 'rgba(255,255,255,0.08)', true: 'rgba(181,133,44,0.3)' }}
                thumbColor={limitsTraining ? '#B5852C' : '#8FAEC8'}
              />
            </View>
          </>
        )}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[s.saveBtn, saving && s.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save check-in"
        accessibilityState={{ disabled: saving }}
      >
        <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'SAVE CHECK-IN'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000D1A' },
  content: { padding: 20, gap: 14, paddingBottom: 120 },

  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#8FAEC8', fontSize: 14 },

  amberBanner: {
    backgroundColor: 'rgba(212,160,26,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,160,26,0.3)',
    padding: 12,
  },
  amberBannerText: { color: '#D4A01A', fontSize: 13, fontWeight: '800' },

  card: {
    backgroundColor: '#00253D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    color: '#B5852C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  fieldLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: '#B5852C', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  stepValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', minWidth: 36, textAlign: 'center' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: { backgroundColor: 'rgba(181,133,44,0.3)', borderColor: 'rgba(181,133,44,0.3)' },
  pillText: { color: '#8FAEC8', fontSize: 12, fontWeight: '900' },
  pillTextActive: { color: '#FFFFFF' },

  saveBtn: {
    backgroundColor: 'rgba(181,133,44,0.3)',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnDisabled: { backgroundColor: '#1a3a22', opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
