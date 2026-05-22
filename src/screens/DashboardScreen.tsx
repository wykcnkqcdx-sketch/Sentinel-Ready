import { DS } from '@/constants/theme';
import { useCheckIn } from '@/src/hooks/useCheckIn';
import { calculateReadinessPercentage, useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { weeklyLoadSeries } from '@/src/utils/chartDataUtils';
import {
  buildReadinessTrend,
  buildWeekSummary,
} from '@/src/utils/trainingLogUtils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEK_TARGET = 4;

function readinessState(score: number) {
  if (score === 0) return { label: 'NO DATA', color: DS.textMuted, message: 'Log a session to calculate operational readiness.' };
  if (score < 60) return { label: 'RED', color: DS.danger, message: 'High fatigue detected. Recovery takes priority today.' };
  if (score < 75) return { label: 'AMBER', color: DS.warning, message: 'Trainable, but keep volume and load controlled.' };
  return { label: 'GREEN', color: DS.success, message: 'Systems are available for high-intensity mission profiles.' };
}

function grade(value: number, fallback = '--') {
  if (!value) return fallback;
  if (value >= 90) return 'S';
  if (value >= 80) return 'A-';
  if (value >= 70) return 'B+';
  if (value >= 60) return 'B';
  return 'C';
}

function MetricTile({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <View style={active ? styles.metricTileActive : styles.metricTile}>
      <Text style={active ? styles.metricTileLabelActive : styles.metricTileLabel}>{label}</Text>
      <Text style={styles.metricTileValue}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children, status }: { children: string; status?: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {status ? <Text style={styles.sectionStatus}>{status}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const { logs, goals, isLoading } = useTraining();
  const { injuryNotes } = useUser();
  const checkIn = useCheckIn();
  const router = useRouter();

  const trainingReadiness = useMemo(() => calculateReadinessPercentage(logs), [logs]);
  const readinessPercentage = useMemo(() => {
    if (checkIn.checkedInToday && checkIn.score !== null) {
      return trainingReadiness > 0 ? Math.round(trainingReadiness * 0.65 + checkIn.score * 0.35) : checkIn.score;
    }
    return trainingReadiness;
  }, [checkIn.checkedInToday, checkIn.score, trainingReadiness]);

  const status = useMemo(() => readinessState(readinessPercentage), [readinessPercentage]);
  const thisWeek = useMemo(() => buildWeekSummary(logs, 0), [logs]);
  const trend = useMemo(() => buildReadinessTrend(logs), [logs]);
  const missionBrief = useMemo(() => buildMissionBrief(logs, goals, { injuryNotes }), [logs, goals, injuryNotes]);
  const recoveryDebt = useMemo(() => buildRecoveryDebt(logs, injuryNotes), [logs, injuryNotes]);
  const balance = useMemo(() => buildTrainingBalance(logs), [logs]);
  const loadBars = useMemo(() => weeklyLoadSeries(logs, 7), [logs]);
  const latestRuck = useMemo(() => logs.find((log) => log.category === 'Ruck'), [logs]);
  const strengthSessions = useMemo(() => logs.filter((log) => log.category === 'Strength').length, [logs]);
  const runSessions = useMemo(() => logs.filter((log) => log.category === 'Run').length, [logs]);
  const loadProgress = Math.min(thisWeek.total / WEEK_TARGET, 1);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Ionicons name="shield-checkmark-outline" size={22} color={DS.goldSoft} />
            <Text style={styles.brand}>SENTINEL READY</Text>
          </View>
          <Text style={styles.topStatus}>[STATUS: {status.label}]</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.gridOverlay} />
          <View style={styles.readinessRing}>
            <Text style={styles.readinessScore}>{readinessPercentage > 0 ? `${readinessPercentage}%` : '--'}</Text>
            <Text style={styles.readinessLabel}>READY</Text>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: status.color }]} />
              <Text style={[styles.liveText, { color: status.color }]}>[ READINESS STATUS: {status.label} ]</Text>
            </View>
            <Text style={styles.heroTitle}>{status.label === 'GREEN' ? 'SYSTEMS FULLY OPERATIONAL' : 'MISSION STATE REVIEW'}</Text>
            <Text style={styles.heroMessage}>{status.message}</Text>
          </View>
        </View>

        {!checkIn.checkedInToday && !checkIn.isLoading ? (
          <TouchableOpacity style={styles.callout} onPress={() => router.push('/check-in')} activeOpacity={0.82}>
            <View>
              <Text style={styles.calloutLabel}>DAILY CHECK-IN</Text>
              <Text style={styles.calloutTitle}>Log sleep, soreness, stress and mood.</Text>
            </View>
            <Text style={styles.bracketAction}>[ LOG NOW ]</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.metricGrid}>
          <MetricTile label="STRENGTH" value={grade(strengthSessions * 18)} />
          <MetricTile label="CARDIO" value={grade(runSessions * 20)} />
          <MetricTile label="RUCK (S)" value={latestRuck ? grade(readinessPercentage, 'B+') : '--'} active />
          <MetricTile label="RECOVERY" value={grade(100 - recoveryDebt.score, 'B')} />
        </View>

        <View style={styles.panel}>
          <SectionLabel status={thisWeek.fatigueWatch > 0 ? 'MONITOR' : 'LOW RISK'}>[ WEEKLY LOAD RISK ]</SectionLabel>
          <View style={styles.barRow}>
            {loadBars.map((value, index) => (
              <View key={`week-load-${index}`} style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.min(100, Math.max(8, value * 20))}%`,
                      backgroundColor: index === loadBars.length - 1 ? DS.goldSoft : 'rgba(181,133,44,0.45)',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.dayRow}>
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <Text key={day} style={styles.dayText}>{day}</Text>
            ))}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${loadProgress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.missionPanel}>
          <Text style={styles.cornerTag}>NEXT SESSION</Text>
          <Text style={styles.panelEyebrow}>MISSION BRIEFING</Text>
          <Text style={styles.missionTitle}>{missionBrief.title}</Text>
          <Text style={styles.missionText}>{missionBrief.primaryAction}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/training')} activeOpacity={0.84}>
            <MaterialCommunityIcons name="play" size={18} color="#281900" />
            <Text style={styles.primaryButtonText}>EXECUTE SESSION</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertPanel}>
          <Ionicons name="information-circle" size={22} color={DS.success} />
          <View style={styles.alertCopy}>
            <Text style={styles.alertLabel}>SYSTEM ALERT</Text>
            <Text style={styles.alertText}>
              {trend.status === 'warning'
                ? `Readiness trend ${trend.label}. Latest ${trend.latest}/10 requires attention.`
                : balance.nextFocus || 'Optimal recovery window detected.'}
            </Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/ruck')}>
            <Ionicons name="map-outline" size={18} color={DS.goldSoft} />
            <Text style={styles.quickText}>RUCK HUD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/add-log')}>
            <Ionicons name="add-circle-outline" size={18} color={DS.goldSoft} />
            <Text style={styles.quickText}>LOG ENTRY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/tests')}>
            <Ionicons name="shield-outline" size={18} color={DS.goldSoft} />
            <Text style={styles.quickText}>TESTS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.bgPrimary },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 10, paddingBottom: 108, gap: 12 },
  topBar: {
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: DS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  brand: { color: DS.goldSoft, fontSize: 22, lineHeight: 26, fontWeight: '900', letterSpacing: -0.5 },
  topStatus: { color: DS.goldSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  hero: {
    backgroundColor: DS.bgCard,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 4,
    padding: 18,
    minHeight: 220,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(63,71,39,0.18)',
    opacity: 0.4,
  },
  readinessRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 12,
    borderColor: DS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.bgPrimary,
  },
  readinessScore: { color: DS.goldSoft, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  readinessLabel: { color: DS.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  heroCopy: { flex: 1, gap: 8 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: DS.goldSoft, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -1 },
  heroMessage: { color: DS.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  callout: {
    backgroundColor: DS.bgCardAlt,
    borderLeftWidth: 4,
    borderLeftColor: DS.gold,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calloutLabel: { color: DS.goldSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  calloutTitle: { color: DS.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 2 },
  bracketAction: { color: DS.goldSoft, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricTile: {
    flexGrow: 1,
    flexBasis: '23%',
    minWidth: 86,
    backgroundColor: DS.bgCard,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 2,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  metricTileActive: {
    flexGrow: 1,
    flexBasis: '23%',
    minWidth: 86,
    backgroundColor: DS.bgCard,
    borderWidth: 1,
    borderColor: DS.gold,
    borderRadius: 2,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  metricTileLabel: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  metricTileLabelActive: { color: DS.goldSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  metricTileValue: { color: DS.goldSoft, fontSize: 24, fontWeight: '900' },
  panel: { backgroundColor: DS.bgCard, borderWidth: 1, borderColor: DS.border, borderRadius: 4, padding: 12, gap: 12 },
  sectionLabelRow: {
    borderBottomWidth: 1,
    borderBottomColor: DS.border,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: { color: DS.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  sectionStatus: { color: DS.success, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  barRow: { height: 112, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 },
  barTrack: { flex: 1, height: '100%', backgroundColor: 'rgba(63,71,39,0.32)', justifyContent: 'flex-end' },
  barFill: { width: '100%' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayText: { color: DS.textSecondary, fontSize: 10, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: 'rgba(63,71,39,0.55)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: DS.goldSoft },
  missionPanel: { backgroundColor: DS.bgCard, borderWidth: 1, borderColor: DS.gold, borderRadius: 4, padding: 14, gap: 10 },
  cornerTag: {
    alignSelf: 'flex-end',
    backgroundColor: DS.goldSoft,
    color: '#281900',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  panelEyebrow: { color: DS.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.7 },
  missionTitle: { color: DS.goldSoft, fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: -0.4 },
  missionText: { color: DS.textSecondary, fontSize: 14, lineHeight: 20 },
  primaryButton: {
    minHeight: 48,
    backgroundColor: DS.goldSoft,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: '#281900', fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  alertPanel: {
    backgroundColor: DS.bgCardAlt,
    borderLeftWidth: 4,
    borderLeftColor: DS.success,
    borderRadius: 2,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  alertCopy: { flex: 1 },
  alertLabel: { color: DS.success, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  alertText: { color: DS.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', gap: 8 },
  quickAction: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.bgCard,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickText: { color: DS.goldSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
});
