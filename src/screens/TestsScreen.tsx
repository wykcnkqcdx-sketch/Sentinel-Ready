import type { DfiftStandards } from '@/src/types/dfift';
import dfiftJson from '@/src/data/standards/dfift-standards.json';
import { calculateReadinessPercentage, TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';

const dfiftStandards = dfiftJson as DfiftStandards;
import { useUser } from '@/src/screens/UserContext';
import { buildReadinessTrend, getDateValue } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

function DfiftRow({ label, standard, result, pass }: {
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
}

export default function TestsScreen() {
  const { logs, isLoading } = useTraining();
  const { gender, testDate } = useUser();
  const router = useRouter();
  if (isLoading) return <View style={styles.screen} />;

  const testLogs = [...logs.filter((log) => log.category === 'Test')]
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);

  const readinessPercentage = calculateReadinessPercentage(logs);
  const trend = buildReadinessTrend(logs);

  const grouped = groupByType(testLogs);
  const testTypes = Object.keys(grouped);

  const lastTestDate = testLogs[0]?.date ?? null;
  const daysSinceLast = lastTestDate ? daysSince(lastTestDate) : null;

  // DFIFT matching — find latest logged result for each event by type keyword
  const pushLog = findLatest(grouped, 'push');
  const sitLog = findLatest(grouped, 'sit');
  const runLog = findLatest(grouped, '2.4', 'run');
  const skinfoldLog = findLatest(grouped, 'skin', 'fold');

  const pushReps = pushLog ? parseReps(pushLog.distanceLoad) : null;
  const sitReps = sitLog ? parseReps(sitLog.distanceLoad) : null;
  const runSeconds = runLog ? parseRunSeconds(runLog.distanceLoad, runLog.duration) : null;
  const skinfoldMm = skinfoldLog ? parseMm(skinfoldLog.distanceLoad) : null;

  const { pushUps, sitUps, run, skinfold } = dfiftStandards.events;
  const pushLimit = gender === 'F' ? pushUps.female : pushUps.male;
  const sitLimit = gender === 'F' ? sitUps.female : sitUps.male;
  const runLimit = gender === 'F' ? run.femaleMaxSeconds : run.maleMaxSeconds;
  const skinfoldLimit = gender === 'F' ? skinfold.femaleMaxMm : skinfold.maleMaxMm;
  const dfiftSnapshot = buildDfiftSnapshot(logs, dfiftStandards, gender);

  const daysUntilTest = testDate
    ? Math.ceil((new Date(testDate + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
    : null;

  let readinessLabel = 'GREEN';
  let readinessColor = '#91e6a3';
  let readinessMessage = 'Fit to test. Keep warm-up controlled and avoid unnecessary fatigue before assessment.';

  if (readinessPercentage === 0) {
    readinessLabel = 'NO DATA';
    readinessColor = '#8fbf8f';
    readinessMessage = 'Log sessions with readiness scores to determine your testing readiness.';
  } else if (readinessPercentage < 60) {
    readinessLabel = 'RED';
    readinessColor = '#ffb86b';
    readinessMessage = 'Fatigue is high. Testing today will not yield accurate results. Prioritise recovery first.';
  } else if (readinessPercentage < 80) {
    readinessLabel = 'AMBER';
    readinessColor = '#f3d36b';
    readinessMessage = 'Moderate readiness. Proceed with caution. Do not attempt max-effort testing today.';
  }

  const isReadyToTest = readinessPercentage >= 80;
  const heroCardStyle = isReadyToTest
    ? styles.heroCardGood
    : readinessPercentage > 0 && readinessPercentage < 60
      ? styles.heroCardWarn
      : readinessPercentage >= 60 && readinessPercentage < 80
        ? styles.heroCardAmber
        : styles.heroCard;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Fitness Test Centre</Text>
      <Text style={styles.subtitle}>
        Track test results, monitor readiness for assessment and review performance history by test type.
      </Text>

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

      <View style={heroCardStyle}>
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>TEST READINESS</Text>
            <Text style={[styles.heroScore, { color: readinessColor }]}>{readinessLabel}</Text>
            <Text style={styles.heroMessage}>{readinessMessage}</Text>
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
            onPress={() => router.push('/profile')}
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
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#f4f7f1', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#c6d0c2', fontSize: 15, lineHeight: 22 },

  heroCard: { backgroundColor: '#102018', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2d6b3b', gap: 10 },
  heroCardGood: { backgroundColor: '#0d1812', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2f6b3c', gap: 10 },
  heroCardAmber: { backgroundColor: '#1a1608', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#5a4a20', gap: 10 },
  heroCardWarn: { backgroundColor: '#21140b', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  heroLeft: { flex: 1, gap: 6 },
  heroLabel: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  heroScore: { fontSize: 36, fontWeight: '900' },
  heroMessage: { color: '#c6d0c2', fontSize: 13, lineHeight: 20 },
  heroStats: { gap: 12, alignItems: 'flex-end' },
  heroStat: { alignItems: 'center' },
  heroStatNumber: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  heroStatLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '800' },
  trendRow: { borderTopWidth: 1, borderTopColor: '#203529', paddingTop: 10 },
  trendTextGood: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  trendTextWarn: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },

  alertCard: { backgroundColor: '#1c1408', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#6b5020', gap: 6 },
  alertTitle: { color: '#f0c070', fontSize: 14, fontWeight: '900' },
  alertText: { color: '#c8a070', fontSize: 13, lineHeight: 19 },
  dfiftSnapshotCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 10 },
  dfiftSnapshotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  dfiftSnapshotKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  dfiftSnapshotScore: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 3 },
  dfiftSnapshotBadge: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  dfiftSnapshotBadgeGood: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  dfiftSnapshotBadgeText: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  dfiftSnapshotBadgeTextGood: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  dfiftSnapshotWeak: { color: '#ffb86b', fontSize: 13, fontWeight: '900', lineHeight: 19 },
  dfiftSnapshotText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  sectionTag: { color: '#9ee8a5', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: '#264c32', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },

  emptyCard: { backgroundColor: '#0e1812', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#26382c', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },

  testTypeCard: { backgroundColor: '#0e1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#26382c', gap: 12 },
  testTypeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  testTypeLeft: { flex: 1, gap: 3 },
  testTypeName: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  testTypeCount: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  testTypeRight: { alignItems: 'flex-end', gap: 4 },
  testTypeReadiness: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  deltaGood: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  deltaWarn: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },

  testResultRow: { flexDirection: 'row', gap: 10 },
  testResultBox: { flex: 1, backgroundColor: '#07110c', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1e2e22', gap: 4 },
  testResultLabel: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  testResultValue: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  testResultValueDim: { color: '#aeb8aa', fontSize: 15, fontWeight: '800' },
  testResultDate: { color: '#8fbf8f', fontSize: 11, fontWeight: '800' },
  testNote: { color: '#c4cec0', fontSize: 13, lineHeight: 19 },

  countdownCard: { backgroundColor: '#0d1812', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#203529' },
  countdownCardUrgent: { backgroundColor: '#21140b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7a4a1f' },
  countdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  countdownKicker: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 3 },
  countdownDate: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  countdownDaysBox: { alignItems: 'flex-end' },
  countdownNum: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  countdownNumUrgent: { color: '#ffb86b', fontSize: 32, fontWeight: '900' },
  countdownUnit: { color: '#8fbf8f', fontSize: 11, fontWeight: '800' },

  dfiftCard: { backgroundColor: '#0e1410', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2a3d2c', gap: 0 },
  dfiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dfiftKicker: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  dfiftProfileLink: { color: '#4a9e6a', fontSize: 12, fontWeight: '900' },
  dfiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dfiftRowLeft: { flex: 1, gap: 3 },
  dfiftLabel: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  dfiftStandard: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  dfiftRowRight: { alignItems: 'flex-end', gap: 4 },
  dfiftResult: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  dfiftBadgePass: { backgroundColor: '#0d2a14', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dfiftBadgeTextPass: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  dfiftBadgeFail: { backgroundColor: '#2a1008', borderWidth: 1, borderColor: '#7a3a1f', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dfiftBadgeTextFail: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
  dfiftNoData: { color: '#4a5e4a', fontSize: 14, fontWeight: '900' },
  dfiftDivider: { height: 1, backgroundColor: '#1a2c1e' },
  dfiftFootnote: { color: '#4a5e4a', fontSize: 11, lineHeight: 16, marginTop: 12 },

  guidanceCard: { backgroundColor: '#111a10', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#31411f', gap: 6 },
  guidanceTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  guidanceText: { color: '#c6d0c2', fontSize: 13, lineHeight: 20 },
});
