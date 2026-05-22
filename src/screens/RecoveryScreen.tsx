import ReadinessHistoryCard from '@/src/components/recovery/ReadinessHistoryCard';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildInjuryWatch } from '@/src/utils/injuryWatchUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import {
  buildReadinessTrend,
  buildWeekSummary,
  getReadinessNumber,
  isFatigueWatch,
} from '@/src/utils/trainingLogUtils';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function daysSince(dateStr: string): number {
  const then = new Date(dateStr + 'T00:00:00').getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.floor((now - then) / 86400000);
}

function getRecoveryScore(recentSortedLogs: TrainingLog[]) {
  const recent = recentSortedLogs.slice(0, 5);
  if (recent.length === 0) return 0;
  const avg = recent.reduce((sum, l) => sum + getReadinessNumber(l.readiness), 0) / recent.length;
  return Math.round((avg / 10) * 100);
}

function getProtocol(score: number) {
  if (score >= 75) {
    return {
      title: 'Maintenance Protocol',
      steps: [
        '5–10 min easy walk or light bike to flush legs.',
        'Hip flexor, calf and hamstring mobility — 15–20 min.',
        'Rehydrate. Aim for 2.5–3L across the day.',
        'Eat protein within the next meal window.',
        'Aim for 7–8 hours sleep tonight.',
      ],
    };
  }
  if (score >= 50) {
    return {
      title: 'Active Recovery Protocol',
      steps: [
        'No intensity today. Easy walk or full rest only.',
        '20–30 min mobility — hips, calves, hamstrings and shoulders.',
        'Breathing work to lower resting heart rate.',
        'Increase hydration. Aim for 3L minimum.',
        'Target 8+ hours sleep. Reduce screen time before bed.',
      ],
    };
  }
  if (score > 0) {
    return {
      title: 'Full Rest Protocol',
      steps: [
        'Complete rest today. No training of any kind.',
        'Light stretching only if needed — 10 min max.',
        'Prioritise sleep above everything else tonight.',
        'Hydrate well throughout the day.',
        'Reassess readiness tomorrow before returning to any load.',
      ],
    };
  }
  return {
    title: 'Suggested Recovery Protocol',
    steps: [
      '5 min easy walk or bike.',
      'Hip flexor, calf and hamstring mobility.',
      'Light breathing work to bring heart rate down.',
      'Rehydrate and eat protein within the next meal window.',
    ],
  };
}

export default function RecoveryScreen() {
  const { logs, isLoading } = useTraining();
  const { injuryNotes } = useUser();

  const recentSorted = useMemo(
    () => [...logs].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      return b.id - a.id;
    }),
    [logs]
  );

  const recoveryScore = useMemo(() => getRecoveryScore(recentSorted), [recentSorted]);
  const trend = useMemo(() => buildReadinessTrend(logs), [logs]);
  const thisWeek = useMemo(() => buildWeekSummary(logs, 0), [logs]);
  const recoveryDebt = useMemo(() => buildRecoveryDebt(logs, injuryNotes), [logs, injuryNotes]);
  const injuryWatch = useMemo(() => buildInjuryWatch(logs, injuryNotes), [logs, injuryNotes]);

  const latestRecoveryLog = useMemo(() => recentSorted.find((l) => l.category === 'Recovery'), [recentSorted]);
  const recentFatigueLogs = useMemo(() => recentSorted.filter((l) => isFatigueWatch(l.readiness)).slice(0, 3), [recentSorted]);
  const daysSinceRecovery = useMemo(() => latestRecoveryLog ? daysSince(latestRecoveryLog.date) : null, [latestRecoveryLog]);

  const isHighFatigue = recoveryScore > 0 && recoveryScore < 50;
  const isModerate = recoveryScore >= 50 && recoveryScore < 75;
  const isPrime = recoveryScore >= 75;

  const scoreLabel = isPrime ? 'Prime' : isModerate ? 'Moderate' : recoveryScore > 0 ? 'High Fatigue' : 'No Data';
  const scoreMessage = isPrime
    ? 'Readiness is strong. You are ready for high-intensity or heavy load.'
    : isModerate
    ? 'Trainable, but avoid unnecessary max-effort work. Keep intensity controlled.'
    : recoveryScore > 0
    ? 'High fatigue detected. Prioritise recovery, mobility and rest today.'
    : 'Log a session with a readiness score to calculate your recovery status.';

  const mainCardStyle = isHighFatigue ? styles.mainCardWarning : isModerate ? styles.mainCardModerate : styles.mainCard;
  const scoreStyle = isHighFatigue ? styles.scoreWarning : styles.score;
  const badgeStyle = isHighFatigue ? styles.badgeWarning : isModerate ? styles.badgeModerate : recoveryScore > 0 ? styles.badge : styles.badgeNeutral;
  const badgeTextStyle = isHighFatigue ? styles.badgeTextWarning : isModerate ? styles.badgeTextModerate : recoveryScore > 0 ? styles.badgeText : styles.badgeTextNeutral;

  const protocol = useMemo(() => getProtocol(recoveryScore), [recoveryScore]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>[ RECOVERY CENTER ]</Text>
      <Text style={styles.title}>Recovery Center</Text>
      <View style={styles.headerRule} />

      <View style={rs.heroCard}>
        <Text style={rs.heroKicker}>[ RECOVERY: SCORE ]</Text>
        <View style={rs.heroScoreRow}>
          <Text style={[rs.heroScore, { color: isHighFatigue ? '#e05050' : isModerate ? '#ffaa44' : recoveryScore > 0 ? '#B5852C' : '#b8c0b0' }]}>
            {recoveryScore > 0 ? `${recoveryScore}` : '--'}
          </Text>
          <View style={rs.heroRight}>
            <View style={[rs.fatigueBadge, { borderColor: isHighFatigue ? '#e05050' : isModerate ? 'rgba(255,170,68,0.5)' : 'rgba(94,122,47,0.5)' }]}>
              <Text style={[rs.fatigueBadgeText, { color: isHighFatigue ? '#e05050' : isModerate ? '#ffaa44' : '#5E7A2F' }]}>
                {isHighFatigue ? '[ ⚡ FATIGUE WARNING: RED ]' : isModerate ? '[ ⚡ FATIGUE WARNING: AMBER ]' : recoveryScore > 0 ? '[ ⚡ SYSTEMS OPTIMAL ]' : '[ NO DATA ]'}
              </Text>
            </View>
            <Text style={rs.heroCapacity}>
              CAPACITY: {isHighFatigue ? 'CRITICAL' : isModerate ? 'REDUCED' : recoveryScore > 0 ? 'NOMINAL' : 'UNKNOWN'}
            </Text>
          </View>
        </View>
        <View style={rs.heroProgressTrack}>
          <View style={[rs.heroProgressFill, { width: `${recoveryScore}%` as unknown as number, backgroundColor: isHighFatigue ? '#e05050' : isModerate ? '#ffaa44' : '#B5852C' }]} />
        </View>
        <Text style={styles.scoreMessage}>{scoreMessage}</Text>
      </View>

      <View style={
        recoveryDebt.status === 'red' ? styles.debtCardRed
        : recoveryDebt.status === 'amber' ? styles.debtCardAmber
        : styles.debtCard
      }>
        <View style={styles.debtHeader}>
          <View>
            <Text style={styles.cardKicker}>RECOVERY DEBT</Text>
            <Text style={recoveryDebt.status === 'red' ? styles.debtScoreRed : styles.debtScore}>
              {recoveryDebt.status === 'no-data' ? '--' : `${recoveryDebt.score}%`}
            </Text>
          </View>
          <View style={recoveryDebt.status === 'red' ? styles.badgeWarning : recoveryDebt.status === 'amber' ? styles.badgeModerate : styles.badge}>
            <Text style={recoveryDebt.status === 'red' ? styles.badgeTextWarning : recoveryDebt.status === 'amber' ? styles.badgeTextModerate : styles.badgeText}>
              {recoveryDebt.label}
            </Text>
          </View>
        </View>
        <Text style={styles.scoreMessage}>{recoveryDebt.message}</Text>
        <Text style={styles.debtAction}>{recoveryDebt.action}</Text>
        <View style={styles.debtFactorRow}>
          {recoveryDebt.factors.slice(0, 3).map((factor) => (
            <View key={factor} style={styles.debtFactor}>
              <Text style={styles.debtFactorText}>{factor}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={
        injuryWatch.status === 'high' ? styles.debtCardRed
        : injuryWatch.status === 'monitor' ? styles.debtCardAmber
        : styles.debtCard
      }>
        <View style={styles.debtHeader}>
          <View>
            <Text style={injuryWatch.status === 'high' ? styles.debtScoreRed : styles.debtScore}>
              {injuryWatch.status === 'no-data' ? '--' : `${injuryWatch.score}%`}
            </Text>
            <Text style={styles.cardKicker}>INJURY WATCH</Text>
          </View>
          <View style={injuryWatch.status === 'high' ? styles.badgeWarning : injuryWatch.status === 'monitor' ? styles.badgeModerate : styles.badge}>
            <Text style={injuryWatch.status === 'high' ? styles.badgeTextWarning : injuryWatch.status === 'monitor' ? styles.badgeTextModerate : styles.badgeText}>
              {injuryWatch.label}
            </Text>
          </View>
        </View>
        <Text style={styles.scoreMessage}>{injuryWatch.message}</Text>
        <Text style={styles.debtAction}>{injuryWatch.action}</Text>
        <View style={styles.debtFactorRow}>
          {injuryWatch.flags.slice(0, 4).map((flag) => (
            <View key={flag} style={styles.debtFactor}>
              <Text style={styles.debtFactorText}>{flag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statKicker}>FATIGUE WATCH</Text>
          <Text style={thisWeek.fatigueWatch > 0 ? styles.statNumberWarn : styles.statNumber}>
            {thisWeek.fatigueWatch}
          </Text>
          <Text style={styles.statLabel}>
            {thisWeek.fatigueWatch === 1 ? 'session this week' : 'sessions this week'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statKicker}>READINESS TREND</Text>
          <Text style={
            trend.status === 'warning' ? styles.statNumberWarn
            : trend.status === 'good' ? styles.statNumberGood
            : styles.statNumber
          }>
            {trend.label}
          </Text>
          <Text style={styles.statLabel}>
            {trend.latest > 0 ? `Latest ${trend.latest}/10` : 'No data'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statKicker}>LAST RECOVERY</Text>
          <Text style={daysSinceRecovery !== null && daysSinceRecovery > 4 ? styles.statNumberWarn : styles.statNumber}>
            {daysSinceRecovery !== null ? `${daysSinceRecovery}d` : '--'}
          </Text>
          <Text style={styles.statLabel}>
            {latestRecoveryLog ? latestRecoveryLog.date : 'No recovery logged'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statKicker}>THIS WEEK</Text>
          <Text style={styles.statNumber}>{thisWeek.total}</Text>
          <Text style={styles.statLabel}>
            {thisWeek.total === 1 ? 'session logged' : 'sessions logged'}
          </Text>
        </View>
      </View>

      <ReadinessHistoryCard />

      {recentFatigueLogs.length > 0 ? (
        <View style={styles.fatigueCard}>
          <Text style={styles.fatigueKicker}>RECENT FATIGUE WATCH SESSIONS</Text>
          <Text style={styles.fatigueTitle}>
            {recentFatigueLogs.length} {recentFatigueLogs.length === 1 ? 'session' : 'sessions'} logged with readiness 5 or below
          </Text>
          {recentFatigueLogs.map((log) => (
            <View key={log.id} style={styles.fatigueRow}>
              <View style={styles.fatigueMeta}>
                <Text style={styles.fatigueCategory}>{log.category}</Text>
                <Text style={styles.fatigueDate}>{log.date}</Text>
              </View>
              <View style={styles.fatigueBadge}>
                <Text style={styles.fatigueBadgeText}>{log.readiness}/10</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {daysSinceRecovery !== null && daysSinceRecovery > 4 ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>No recovery session in {daysSinceRecovery} days</Text>
          <Text style={styles.alertText}>
            Add a mobility or recovery session to maintain soft tissue health and reduce injury risk.
          </Text>
        </View>
      ) : null}

      <View style={styles.protocolCard}>
        <Text style={styles.protocolKicker}>PROTOCOL</Text>
        <Text style={styles.protocolTitle}>{protocol.title}</Text>
        {protocol.steps.map((step, i) => (
          <View key={i} style={styles.protocolRow}>
            <Text style={styles.protocolNumber}>{i + 1}</Text>
            <Text style={styles.protocolText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.targetsCard}>
        <Text style={styles.targetsTitle}>Daily Targets</Text>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Sleep</Text>
          <Text style={styles.targetValue}>7–8 hours</Text>
        </View>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Hydration</Text>
          <Text style={styles.targetValue}>2.5–3 L</Text>
        </View>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Mobility</Text>
          <Text style={styles.targetValue}>15–20 min daily</Text>
        </View>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Recovery sessions</Text>
          <Text style={styles.targetValue}>1–2 per week</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050e09' },
  content: { padding: 10, paddingBottom: 120, gap: 12, maxWidth: 820, width: '100%', alignSelf: 'center' },
  kicker: { color: '#F4BD5F', fontSize: 11, fontWeight: '900', letterSpacing: 2.2 },
  headerRule: { height: 1, backgroundColor: '#B5852C', opacity: 0.55, marginVertical: 2 },
  title: { color: '#F4BD5F', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: '#d3c4b1', fontSize: 14, lineHeight: 20 },

  mainCard: { backgroundColor: '#102016', borderRadius: 6, padding: 18, borderWidth: 1, borderColor: '#2d6b3f', gap: 10 },
  mainCardModerate: { backgroundColor: '#1a1a0d', borderRadius: 6, padding: 18, borderWidth: 1, borderColor: 'rgba(26,116,212,0.25)', gap: 10 },
  mainCardWarning: { backgroundColor: '#1a0f0b', borderRadius: 6, padding: 18, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 10 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  score: { color: '#ffffff', fontSize: 58, fontWeight: '900', marginTop: 4 },
  scoreWarning: { color: '#ffaa44', fontSize: 58, fontWeight: '900', marginTop: 4 },
  badge: { backgroundColor: 'rgba(94,122,47,0.15)', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeModerate: { backgroundColor: '#2a2410', borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeNeutral: { backgroundColor: '#0c1008', borderWidth: 1, borderColor: '#3a3a3a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  badgeTextModerate: { color: '#ffaa44', fontSize: 12, fontWeight: '900' },
  badgeTextWarning: { color: '#ffaa44', fontSize: 12, fontWeight: '900' },
  badgeTextNeutral: { color: '#b8c0b0', fontSize: 12, fontWeight: '900' },
  scoreMessage: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  debtCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 10 },
  debtCardAmber: { backgroundColor: 'rgba(255,170,68,0.06)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: '#5a4a20', gap: 10 },
  debtCardRed: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 10 },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  debtScore: { color: '#ffffff', fontSize: 38, fontWeight: '900', marginTop: 3 },
  debtScoreRed: { color: '#ffaa44', fontSize: 38, fontWeight: '900', marginTop: 3 },
  debtAction: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  debtFactorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debtFactor: { backgroundColor: '#080c05', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', paddingHorizontal: 10, paddingVertical: 6 },
  debtFactorText: { color: '#b8c0b0', fontSize: 11, fontWeight: '800' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: '#0c1008', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 4 },
  statKicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  statNumber: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statNumberWarn: { color: '#ffaa44', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statNumberGood: { color: '#B5852C', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#b8c0b0', fontSize: 11, fontWeight: '800' },

  fatigueCard: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 10 },
  fatigueKicker: { color: '#ffaa44', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  fatigueTitle: { color: '#ffaa44', fontSize: 15, fontWeight: '900' },
  fatigueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#5a3a1f' },
  fatigueMeta: { gap: 3 },
  fatigueCategory: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  fatigueDate: { color: '#b8c0b0', fontSize: 12, fontWeight: '800' },
  fatigueBadge: { backgroundColor: '#3a1a0d', borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  fatigueBadgeText: { color: '#ffaa44', fontSize: 13, fontWeight: '900' },

  alertCard: { backgroundColor: 'rgba(255,170,68,0.06)', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 6 },
  alertTitle: { color: '#ffaa44', fontSize: 14, fontWeight: '900' },
  alertText: { color: '#b8c0b0', fontSize: 13, lineHeight: 19 },

  protocolCard: { backgroundColor: 'rgba(26,116,212,0.08)', borderRadius: 6, padding: 18, borderWidth: 1, borderColor: 'rgba(26,116,212,0.25)', gap: 10 },
  protocolKicker: { color: '#ffaa44', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  protocolTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  protocolRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  protocolNumber: { color: '#ffaa44', fontSize: 14, fontWeight: '900', width: 18 },
  protocolText: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, flex: 1 },

  targetsCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 10 },
  targetsTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a2c20' },
  targetLabel: { color: '#b8c0b0', fontSize: 13, fontWeight: '800' },
  targetValue: { color: '#B5852C', fontSize: 13, fontWeight: '900' },
});

const rs = StyleSheet.create({
  heroCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.22)', gap: 10 },
  heroKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  heroScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroScore: { fontSize: 56, fontWeight: '900', lineHeight: 60 },
  heroRight: { flex: 1, gap: 6 },
  fatigueBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  fatigueBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  heroCapacity: { color: '#b8c0b0', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  heroProgressTrack: { height: 3, backgroundColor: 'rgba(181,133,44,0.15)', borderRadius: 2, overflow: 'hidden' },
  heroProgressFill: { height: 3, borderRadius: 2 },
});
