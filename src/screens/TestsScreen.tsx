import dfiftJson from '@/src/data/standards/dfift-standards.json';
import { calculateReadinessPercentage, TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import type { DfiftStandards } from '@/src/types/dfift';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import { buildReadinessTrend } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const dfiftStandards = dfiftJson as DfiftStandards;

function groupByType(testLogs: TrainingLog[]): Record<string, TrainingLog[]> {
  return testLogs.reduce<Record<string, TrainingLog[]>>((acc, log) => {
    const key = log.type.trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr + 'T00:00:00').getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.floor((now - then) / 86400000);
}

function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function parseReps(str: string): number | null {
  const m = str.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseRunSeconds(_distanceLoad: string, duration: string): number | null {
  const mmss = duration.match(/(\d{1,2}):(\d{2})/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  return null;
}

function parseMm(str: string): number | null {
  const m = str.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function findLatest(grouped: Record<string, TrainingLog[]>, ...keywords: string[]): TrainingLog | null {
  for (const kw of keywords) {
    const key = Object.keys(grouped).find((k) => k.toLowerCase().includes(kw));
    if (key) return grouped[key][0];
  }
  return null;
}

const DfiftRow = memo(function DfiftRow({ label, standard, result, pass }: {
  label: string; standard: string; result: string | null; pass: boolean | null;
}) {
  return (
    <View style={styles.dfiftRow}>
      <View style={styles.dfiftRowLeft}>
        <Text style={styles.dfiftLabel}>{label}</Text>
        <Text style={styles.dfiftStandard}>{standard}</Text>
      </View>
      <View style={styles.dfiftRowRight}>
        {result !== null && pass !== null ? (
          <>
            <Text style={styles.dfiftResult}>{result}</Text>
            <View style={pass ? styles.dfiftBadgePass : styles.dfiftBadgeFail}>
              <Text style={pass ? styles.dfiftBadgeTextPass : styles.dfiftBadgeTextFail}>
                {pass ? 'PASS' : 'FAIL'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.dfiftNoData}>--</Text>
        )}
      </View>
    </View>
  );
});

export default function TestsScreen() {
  const { logs, isLoading } = useTraining();
  const { gender, testDate } = useUser();
  const router = useRouter();

  const {
    testLogs,
    grouped,
    testTypes,
    daysSinceLast,
    pushLog,
    sitLog,
    runLog,
    skinfoldLog,
  } = useMemo(() => {
    const tLogs = logs
      .filter((log) => log.category === 'Test')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.id - a.id;
      });

    const groups = groupByType(tLogs);
    const lastDate = tLogs[0]?.date ?? null;

    return {
      testLogs: tLogs,
      grouped: groups,
      testTypes: Object.keys(groups),
      lastTestDate: lastDate,
      daysSinceLast: lastDate ? daysSince(lastDate) : null,
      pushLog: findLatest(groups, 'push'),
      sitLog: findLatest(groups, 'sit'),
      runLog: findLatest(groups, '2.4', 'run'),
      skinfoldLog: findLatest(groups, 'skin', 'fold'),
    };
  }, [logs]);

  const readinessPercentage = useMemo(() => calculateReadinessPercentage(logs), [logs]);
  const trend = useMemo(() => buildReadinessTrend(logs), [logs]);

  const { pushReps, sitReps, runSeconds, skinfoldMm } = useMemo(() => ({
    pushReps: pushLog ? parseReps(pushLog.distanceLoad) : null,
    sitReps: sitLog ? parseReps(sitLog.distanceLoad) : null,
    runSeconds: runLog ? parseRunSeconds(runLog.distanceLoad, runLog.duration) : null,
    skinfoldMm: skinfoldLog ? parseMm(skinfoldLog.distanceLoad) : null,
  }), [pushLog, sitLog, runLog, skinfoldLog]);

  const { pushUps, sitUps, run, skinfold } = dfiftStandards.events;
  const pushLimit = gender === 'F' ? pushUps.female : pushUps.male;
  const sitLimit = gender === 'F' ? sitUps.female : sitUps.male;
  const runLimit = gender === 'F' ? run.femaleMaxSeconds : run.maleMaxSeconds;
  const skinfoldLimit = gender === 'F' ? skinfold.femaleMaxMm : skinfold.maleMaxMm;
  const dfiftSnapshot = useMemo(() => buildDfiftSnapshot(logs, dfiftStandards, gender), [logs, gender]);

  const daysUntilTest = useMemo(() => {
    if (!testDate) return null;
    return Math.ceil((new Date(testDate + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  }, [testDate]);

  const readinessStatus = useMemo(() => {
    if (readinessPercentage === 0) {
      return { label: 'NO DATA', color: '#b8c0b0', message: 'Log sessions with readiness scores to determine your testing readiness.', cardStyle: styles.heroCard };
    }
    if (readinessPercentage < 60) {
      return { label: 'RED', color: '#ffaa44', message: 'Fatigue is high. Testing today will not yield accurate results. Prioritise recovery first.', cardStyle: styles.heroCardWarn };
    }
    if (readinessPercentage < 80) {
      return { label: 'AMBER', color: '#ffaa44', message: 'Moderate readiness. Proceed with caution. Do not attempt max-effort testing today.', cardStyle: styles.heroCardAmber };
    }
    return { label: 'GREEN', color: '#B5852C', message: 'Fit to test. Keep warm-up controlled and avoid unnecessary fatigue before assessment.', cardStyle: styles.heroCardGood };
  }, [readinessPercentage]);

  const navigateToProfile = useCallback(() => router.push('/profile'), [router]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={ts.headerRow}>
        <Text style={styles.kicker}>[ MISSION: TESTS ]</Text>
        <View style={[ts.statusBadge, { borderColor: readinessStatus.color + '88', backgroundColor: readinessStatus.color + '22' }]}>
          <Text style={[ts.statusBadgeText, { color: readinessStatus.color }]}>[ STATUS: {readinessStatus.label} ]</Text>
        </View>
      </View>
      <View style={styles.headerRule} />

      {daysUntilTest !== null ? (
        <View style={daysUntilTest <= 14 ? styles.countdownCardUrgent : styles.countdownCard}>
          <View style={styles.countdownRow}>
            <View>
              <Text style={styles.countdownKicker}>DFIFT ASSESSMENT</Text>
              <Text style={styles.countdownDate}>{testDate}</Text>
            </View>
            <View style={styles.countdownDaysBox}>
              <Text style={daysUntilTest <= 14 ? styles.countdownNumUrgent : styles.countdownNum}>
                {daysUntilTest > 0 ? daysUntilTest : daysUntilTest === 0 ? 0 : '--'}
              </Text>
              <Text style={styles.countdownUnit}>
                {daysUntilTest > 0 ? 'days away' : daysUntilTest === 0 ? 'Today' : 'passed'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={readinessStatus.cardStyle}>
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>TEST READINESS</Text>
            <Text style={[styles.heroScore, { color: readinessStatus.color }]}>{readinessStatus.label}</Text>
            <Text style={styles.heroMessage}>{readinessStatus.message}</Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>{testLogs.length}</Text>
              <Text style={styles.heroStatLabel}>Tests</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>
                {daysSinceLast !== null ? `${daysSinceLast}d` : '--'}
              </Text>
              <Text style={styles.heroStatLabel}>Since last</Text>
            </View>
          </View>
        </View>

        {trend.status !== 'neutral' ? (
          <View style={styles.trendRow}>
            <Text style={trend.status === 'warning' ? styles.trendTextWarn : styles.trendTextGood}>
              Readiness trend: {trend.label} — Latest {trend.latest}/10, Previous {trend.previous}/10
            </Text>
          </View>
        ) : null}
      </View>

      {daysSinceLast !== null && daysSinceLast > 21 ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>No test logged in {daysSinceLast} days</Text>
          <Text style={styles.alertText}>
            Regular testing keeps performance data accurate. Log a test session when readiness is above 80%.
          </Text>
        </View>
      ) : null}

      <View style={ts.benchmarkCard}>
        <Text style={ts.benchmarkKicker}>[ BENCHMARK: STATUS ]</Text>
        <View style={ts.benchmarkRow}>
          <View style={ts.benchmarkLeft}>
            <Text style={ts.benchmarkLabel}>OVERALL READINESS</Text>
            <Text style={[ts.benchmarkBigNum, { color: readinessStatus.color }]}>
              {readinessPercentage > 0 ? `${readinessPercentage}%` : '--'}
            </Text>
            <Text style={ts.benchmarkSub}>LAST ASSESSMENT: {testLogs[0]?.date ?? 'N/A'}</Text>
          </View>
          <View style={ts.benchmarkRight}>
            <Text style={ts.benchmarkLabel}>TESTS LOGGED</Text>
            <Text style={ts.benchmarkStat}>{testLogs.length}</Text>
            <Text style={ts.benchmarkLabel}>SINCE LAST</Text>
            <Text style={ts.benchmarkStat}>{daysSinceLast !== null ? `${daysSinceLast}d` : '--'}</Text>
          </View>
        </View>
        <View style={ts.benchmarkProgressTrack}>
          <View style={[ts.benchmarkProgressFill, { width: `${Math.min(readinessPercentage, 100)}%` as any, backgroundColor: readinessStatus.color }]} />
        </View>
      </View>

      <View style={styles.dfiftSnapshotCard}>
        <View style={styles.dfiftSnapshotHeader}>
          <View>
            <Text style={styles.dfiftSnapshotKicker}>DFIFT SNAPSHOT</Text>
            <Text style={styles.dfiftSnapshotScore}>
              {dfiftSnapshot.passedEvents} / {dfiftSnapshot.rows.length} passing
            </Text>
          </View>
          <View style={dfiftSnapshot.passedEvents === dfiftSnapshot.rows.length ? styles.dfiftSnapshotBadgeGood : styles.dfiftSnapshotBadge}>
            <Text style={dfiftSnapshot.passedEvents === dfiftSnapshot.rows.length ? styles.dfiftSnapshotBadgeTextGood : styles.dfiftSnapshotBadgeText}>
              {dfiftSnapshot.loggedEvents} logged
            </Text>
          </View>
        </View>

        {dfiftSnapshot.weakPoint ? (
          <Text style={styles.dfiftSnapshotWeak}>
            Weak point: {dfiftSnapshot.weakPoint.label} {dfiftSnapshot.weakPoint.result ? `(${dfiftSnapshot.weakPoint.result})` : '(missing result)'}
          </Text>
        ) : null}
        <Text style={styles.dfiftSnapshotText}>{dfiftSnapshot.recommendation}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Test History</Text>
        <Text style={styles.sectionTag}>{testLogs.length} TOTAL</Text>
      </View>

      {testLogs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No tests logged yet</Text>
          <Text style={styles.emptyText}>
            Log a session with the Test category to start tracking performance history and results.
          </Text>
        </View>
      ) : (
        testTypes.map((type) => {
          const typeLogs = grouped[type];
          const latest = typeLogs[0];
          const previous = typeLogs[1] ?? null;
          const latestReadiness = Number(latest.readiness);
          const prevReadiness = previous ? Number(previous.readiness) : null;
          const readinessDelta = prevReadiness !== null ? latestReadiness - prevReadiness : null;

          return (
            <View key={type} style={styles.testTypeCard}>
              <View style={styles.testTypeHeader}>
                <View style={styles.testTypeLeft}>
                  <Text style={styles.testTypeName}>{type}</Text>
                  <Text style={styles.testTypeCount}>{typeLogs.length} {typeLogs.length === 1 ? 'result' : 'results'}</Text>
                </View>
                <View style={styles.testTypeRight}>
                  <Text style={styles.testTypeReadiness}>{latest.readiness}/10</Text>
                  {readinessDelta !== null ? (
                    <Text style={readinessDelta >= 0 ? styles.deltaGood : styles.deltaWarn}>
                      {readinessDelta > 0 ? '+' : ''}{readinessDelta} vs prev
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.testResultRow}>
                <View style={styles.testResultBox}>
                  <Text style={styles.testResultLabel}>LATEST RESULT</Text>
                  <Text style={styles.testResultValue}>{latest.distanceLoad}</Text>
                  <Text style={styles.testResultDate}>{latest.date}</Text>
                </View>

                {previous ? (
                  <View style={styles.testResultBox}>
                    <Text style={styles.testResultLabel}>PREVIOUS</Text>
                    <Text style={styles.testResultValueDim}>{previous.distanceLoad}</Text>
                    <Text style={styles.testResultDate}>{previous.date}</Text>
                  </View>
                ) : null}
              </View>

              {latest.notes ? (
                <Text style={styles.testNote}>{latest.notes}</Text>
              ) : null}
            </View>
          );
        })
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DFIFT Standards</Text>
        <Text style={styles.sectionTag}>REFERENCE</Text>
      </View>

      <View style={styles.dfiftCard}>
        <View style={styles.dfiftHeader}>
          <Text style={styles.dfiftKicker}>DEFENCE FORCES INDUCTION FITNESS TEST</Text>
          <TouchableOpacity
            onPress={navigateToProfile}
            accessibilityRole="button"
            accessibilityLabel="Edit profile gender setting"
          >
            <Text style={styles.dfiftProfileLink}>{gender} · Edit</Text>
          </TouchableOpacity>
        </View>

        <DfiftRow
          label="Push-ups"
          standard={`${pushLimit} reps in 60s (${gender})`}
          result={pushReps !== null ? `${pushReps} reps` : null}
          pass={pushReps !== null ? pushReps >= pushLimit : null}
        />
        <View style={styles.dfiftDivider} />
        <DfiftRow
          label="Sit-ups"
          standard={`${sitLimit} reps in 60s (${gender})`}
          result={sitReps !== null ? `${sitReps} reps` : null}
          pass={sitReps !== null ? sitReps >= sitLimit : null}
        />
        <View style={styles.dfiftDivider} />
        <DfiftRow
          label="2.4km Run"
          standard={`Under ${formatSeconds(runLimit)} (${gender})`}
          result={runSeconds !== null ? formatSeconds(runSeconds) : null}
          pass={runSeconds !== null ? runSeconds <= runLimit : null}
        />
        <View style={styles.dfiftDivider} />
        <DfiftRow
          label="Skinfold"
          standard={`Under ${skinfoldLimit}mm (${gender})`}
          result={skinfoldMm !== null ? `${skinfoldMm}mm` : null}
          pass={skinfoldMm !== null ? skinfoldMm <= skinfoldLimit : null}
        />

        <Text style={styles.dfiftFootnote}>
          Minimum induction requirements only. Verify against current official Defence Forces guidance before assessment.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Testing Rules</Text>
        <Text style={styles.sectionTag}>GUIDANCE</Text>
      </View>

      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceTitle}>Test fresh, not wrecked.</Text>
        <Text style={styles.guidanceText}>
          Complete hard training at least 24–48 hours before a formal test. Fatigue hides true performance.
        </Text>
      </View>

      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceTitle}>Record conditions.</Text>
        <Text style={styles.guidanceText}>
          Note surface, weather, footwear, load weight and sleep quality so future scores can be compared fairly.
        </Text>
      </View>

      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceTitle}>Readiness above 80% before max effort.</Text>
        <Text style={styles.guidanceText}>
          If readiness is below 80%, delay formal testing. A sub-optimal result under fatigue is not a true baseline.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080c05' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  headerRule: { height: 1, backgroundColor: '#B5852C', opacity: 0.55, marginVertical: 2 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#b8c0b0', fontSize: 15, lineHeight: 22 },

  heroCard: { backgroundColor: '#0c1008', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2d6b3b', gap: 10 },
  heroCardGood: { backgroundColor: '#0c1008', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 10 },
  heroCardAmber: { backgroundColor: 'rgba(255,170,68,0.06)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#5a4a20', gap: 10 },
  heroCardWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 10 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  heroLeft: { flex: 1, gap: 6 },
  heroLabel: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  heroScore: { fontSize: 36, fontWeight: '900' },
  heroMessage: { color: '#c6d0c2', fontSize: 13, lineHeight: 20 },
  heroStats: { gap: 12, alignItems: 'flex-end' },
  heroStat: { alignItems: 'center' },
  heroStatNumber: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  heroStatLabel: { color: '#b8c0b0', fontSize: 10, fontWeight: '800' },
  trendRow: { borderTopWidth: 1, borderTopColor: 'rgba(181,133,44,0.12)', paddingTop: 10 },
  trendTextGood: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  trendTextWarn: { color: '#ffaa44', fontSize: 12, fontWeight: '900' },

  alertCard: { backgroundColor: 'rgba(255,170,68,0.06)', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 6 },
  alertTitle: { color: '#ffaa44', fontSize: 14, fontWeight: '900' },
  alertText: { color: '#b8c0b0', fontSize: 13, lineHeight: 19 },
  dfiftSnapshotCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 10 },
  dfiftSnapshotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  dfiftSnapshotKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  dfiftSnapshotScore: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 3 },
  dfiftSnapshotBadge: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  dfiftSnapshotBadgeGood: { backgroundColor: '#141810', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  dfiftSnapshotBadgeText: { color: '#ffaa44', fontSize: 12, fontWeight: '900' },
  dfiftSnapshotBadgeTextGood: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  dfiftSnapshotWeak: { color: '#ffaa44', fontSize: 13, fontWeight: '900', lineHeight: 19 },
  dfiftSnapshotText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  sectionTag: { color: '#9ee8a5', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: '#264c32', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },

  emptyCard: { backgroundColor: '#0e1812', borderRadius: 6, padding: 18, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#b8c0b0', fontSize: 14, lineHeight: 21 },

  testTypeCard: { backgroundColor: '#0e1812', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 12 },
  testTypeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  testTypeLeft: { flex: 1, gap: 3 },
  testTypeName: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  testTypeCount: { color: '#b8c0b0', fontSize: 12, fontWeight: '800' },
  testTypeRight: { alignItems: 'flex-end', gap: 4 },
  testTypeReadiness: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  deltaGood: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  deltaWarn: { color: '#ffaa44', fontSize: 12, fontWeight: '900' },

  testResultRow: { flexDirection: 'row', gap: 10 },
  testResultBox: { flex: 1, backgroundColor: '#080c05', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1e2e22', gap: 4 },
  testResultLabel: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  testResultValue: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  testResultValueDim: { color: '#b8c0b0', fontSize: 15, fontWeight: '800' },
  testResultDate: { color: '#b8c0b0', fontSize: 11, fontWeight: '800' },
  testNote: { color: '#c4cec0', fontSize: 13, lineHeight: 19 },

  countdownCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)' },
  countdownCardUrgent: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)' },
  countdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  countdownKicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 3 },
  countdownDate: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  countdownDaysBox: { alignItems: 'flex-end' },
  countdownNum: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  countdownNumUrgent: { color: '#ffaa44', fontSize: 32, fontWeight: '900' },
  countdownUnit: { color: '#b8c0b0', fontSize: 11, fontWeight: '800' },

  dfiftCard: { backgroundColor: '#0e1410', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: '#2a3d2c', gap: 0 },
  dfiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dfiftKicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  dfiftProfileLink: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  dfiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dfiftRowLeft: { flex: 1, gap: 3 },
  dfiftLabel: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  dfiftStandard: { color: '#b8c0b0', fontSize: 12, fontWeight: '800' },
  dfiftRowRight: { alignItems: 'flex-end', gap: 4 },
  dfiftResult: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  dfiftBadgePass: { backgroundColor: '#0d2a14', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dfiftBadgeTextPass: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  dfiftBadgeFail: { backgroundColor: '#2a1008', borderWidth: 1, borderColor: '#7a3a1f', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dfiftBadgeTextFail: { color: '#ffaa44', fontSize: 11, fontWeight: '900' },
  dfiftNoData: { color: '#4a5e4a', fontSize: 14, fontWeight: '900' },
  dfiftDivider: { height: 1, backgroundColor: '#1a2c1e' },
  dfiftFootnote: { color: '#4a5e4a', fontSize: 11, lineHeight: 16, marginTop: 12 },

  guidanceCard: { backgroundColor: '#111a10', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.2)', gap: 6 },
  guidanceTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  guidanceText: { color: '#c6d0c2', fontSize: 13, lineHeight: 20 },
});

// ── Stitch TestsScreen additions ──────────────────────────────────────
const ts = StyleSheet.create({
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge:     { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  benchmarkCard: {
    backgroundColor: '#0c1008',
    borderRadius: 6,
    borderTopWidth: 2,
    borderTopColor: '#B5852C',
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.12)',
    padding: 16,
    gap: 12,
  },
  benchmarkKicker:       { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  benchmarkRow:          { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  benchmarkLeft:         { flex: 1, gap: 3 },
  benchmarkRight:        { alignItems: 'flex-end', gap: 3 },
  benchmarkLabel:        { color: '#b8c0b0', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  benchmarkBigNum:       { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  benchmarkStat:         { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  benchmarkSub:          { color: '#b8c0b0', fontSize: 10, fontWeight: '700' },
  benchmarkProgressTrack:{ height: 4, backgroundColor: 'rgba(181,133,44,0.12)', borderRadius: 2, overflow: 'hidden' },
  benchmarkProgressFill: { height: '100%', borderRadius: 2 },
});
