import AlertCard from '@/src/components/ui/AlertCard';
import MissionStat from '@/src/components/ui/MissionStat';
import SentinelCard from '@/src/components/ui/SentinelCard';
import { calculateReadinessPercentage, useTraining } from '@/src/screens/TrainingContext';
import { buildReadinessTrend, buildWeekSummary, getReadinessNumber } from '@/src/utils/trainingLogUtils';
import { DimensionValue, ScrollView, StyleSheet, Text, View } from 'react-native';

const WEEKLY_TARGET = 4;

function getWeeklyLoadStatus(total: number, fatigueWatch: number, avgReadiness: number) {
  if (fatigueWatch >= 2) return { label: 'Fatigue Risk', isWarn: true };
  if (total === 0) return { label: 'No Sessions', isWarn: false };
  if (total <= 2) return { label: 'Light Week', isWarn: false };
  if (total >= 5 && avgReadiness > 0 && avgReadiness < 6) return { label: 'Heavy Load', isWarn: true };
  if (total >= 5) return { label: 'Heavy Load', isWarn: false };
  return { label: 'On Track', isWarn: false };
}

function getStrengthStatus(logs: ReturnType<typeof useTraining>['logs']) {
  const strengthLogs = logs.filter((l) => l.category === 'Strength');
  if (strengthLogs.length < 2) return strengthLogs.length === 1 ? 'Baseline' : 'No data';
  const latest = getReadinessNumber(strengthLogs[0].readiness);
  const previous = getReadinessNumber(strengthLogs[1].readiness);
  if (latest > previous) return 'Improving';
  if (latest < previous) return 'Dropping';
  return 'Stable';
}

function getEnduranceStatus(logs: ReturnType<typeof useTraining>['logs']) {
  const enduranceLogs = logs.filter((l) => l.category === 'Ruck' || l.category === 'Run');
  if (enduranceLogs.length < 2) return enduranceLogs.length === 1 ? 'Baseline' : 'No data';
  const latest = getReadinessNumber(enduranceLogs[0].readiness);
  const previous = getReadinessNumber(enduranceLogs[1].readiness);
  if (latest > previous) return 'Improving';
  if (latest < previous) return 'Dropping';
  return 'Stable';
}

function getRecoveryStatus(logs: ReturnType<typeof useTraining>['logs']) {
  const recent = logs.slice(0, 5);
  const fatigue = recent.filter((l) => getReadinessNumber(l.readiness) <= 5).length;
  if (recent.length === 0) return 'No data';
  if (fatigue >= 3) return 'Poor';
  if (fatigue >= 1) return 'Moderate';
  return 'Good';
}

export default function DashboardScreen() {
  const { logs, isLoading } = useTraining();
  if (isLoading) return <View style={styles.screen} />;

  const readinessPercentage = calculateReadinessPercentage(logs);
  const thisWeek = buildWeekSummary(logs, 0);
  const trend = buildReadinessTrend(logs);

  const weekAvgReadiness = Number(thisWeek.averageReadiness);
  const weekLoadStatus = getWeeklyLoadStatus(thisWeek.total, thisWeek.fatigueWatch, weekAvgReadiness);
  const weekProgress = Math.min(thisWeek.total / WEEKLY_TARGET, 1);

  let statusBadgeText = 'GREEN';
  let statusBadgeColor = '#143d22';
  let statusTextColor = '#bfffcf';
  let progressColor = '#62d982';
  let readinessMsg = 'Fit for training. Monitor fatigue and recovery.';

  if (readinessPercentage === 0) {
    statusBadgeText = 'NO DATA';
    statusBadgeColor = '#1a1a1a';
    statusTextColor = '#cccccc';
    progressColor = '#333333';
    readinessMsg = 'Log a session to calculate your readiness score.';
  } else if (readinessPercentage < 60) {
    statusBadgeText = 'RED';
    statusBadgeColor = '#3d1414';
    statusTextColor = '#ffbfbf';
    progressColor = '#d96262';
    readinessMsg = 'High fatigue detected. Prioritise recovery and rest today.';
  } else if (readinessPercentage < 75) {
    statusBadgeText = 'AMBER';
    statusBadgeColor = '#3d3014';
    statusTextColor = '#ffdfbf';
    progressColor = '#d9a662';
    readinessMsg = 'Moderate fatigue. Keep training volume controlled.';
  }

  const latestRuck = logs.find((l) => l.category === 'Ruck');
  const latestStrength = logs.find((l) => l.category === 'Strength');
  const latestRun = logs.find((l) => l.category === 'Run');
  const latestRecovery = logs.find((l) => l.category === 'Recovery');

  const ruckVal = latestRuck ? latestRuck.distanceLoad.split('-')[0].trim() || 'Logged' : 'N/A';
  const strengthVal = latestStrength ? `Score: ${latestStrength.readiness}` : 'N/A';
  const cardioVal = latestRun ? latestRun.distanceLoad.split('-')[0].trim() || 'Logged' : 'N/A';
  const recoveryVal = latestRecovery ? `Score: ${latestRecovery.readiness}` : 'N/A';

  const strengthStatus = getStrengthStatus(logs);
  const enduranceStatus = getEnduranceStatus(logs);
  const recoveryStatus = getRecoveryStatus(logs);

  const trendLogs = [...logs]
    .filter((log) => Number(log.readiness) > 0)
    .slice(0, 7)
    .reverse();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>Operational Fitness Dashboard</Text>
        <Text style={styles.subtitle}>
          Readiness overview for strength, endurance, ruck performance and recovery.
        </Text>
      </View>

      <SentinelCard title="Readiness Status" variant="success">
        <View style={styles.readinessRow}>
          <View>
            <Text style={styles.metric}>{readinessPercentage > 0 ? `${readinessPercentage}%` : '--'}</Text>
            <Text style={styles.cardText}>{readinessMsg}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>{statusBadgeText}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${readinessPercentage}%`, backgroundColor: progressColor }]} />
        </View>

        <View style={styles.readinessDetails}>
          <Text style={styles.detailText}>Strength: {strengthStatus}</Text>
          <Text style={styles.detailText}>Endurance: {enduranceStatus}</Text>
          <Text style={styles.detailText}>Recovery: {recoveryStatus}</Text>
        </View>
      </SentinelCard>

      <SentinelCard title="Readiness Trend">
        <View style={styles.chartContainer}>
          {trendLogs.length > 0 ? (
            trendLogs.map((log) => {
              const score = Number(log.readiness);
              const heightPercentage: DimensionValue = `${(score / 10) * 100}%`;
              let barColor = '#62d982';
              if (score < 6) barColor = '#d96262';
              else if (score < 8) barColor = '#d9a662';

              const dateLabel = log.date.substring(5, 10).replace('-', '/');

              return (
                <View key={log.id} style={styles.barColumn}>
                  <Text style={styles.barScore}>{score}</Text>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: heightPercentage, backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.barLabel}>{dateLabel}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.cardText}>No readiness data available.</Text>
          )}
        </View>
      </SentinelCard>

      <View style={styles.grid}>
        <MissionStat label="Ruck" value={ruckVal} status={latestRuck ? 'Latest session' : 'Awaiting data'} />
        <MissionStat label="Strength" value={strengthVal} status={latestStrength ? 'Force output' : 'Awaiting data'} />
        <MissionStat label="Cardio" value={cardioVal} status={latestRun ? 'Aerobic base' : 'Awaiting data'} />
        <MissionStat label="Recovery" value={recoveryVal} status={latestRecovery ? 'Latest session' : 'Awaiting data'} />
      </View>

      <View style={weekLoadStatus.isWarn ? styles.loadCardWarn : styles.loadCard}>
        <View style={styles.loadHeader}>
          <View>
            <Text style={styles.loadKicker}>THIS WEEK&apos;S LOAD</Text>
            <Text style={weekLoadStatus.isWarn ? styles.loadCountWarn : styles.loadCount}>
              {thisWeek.total} / {WEEKLY_TARGET} sessions
            </Text>
          </View>
          <View style={weekLoadStatus.isWarn ? styles.loadBadgeWarn : styles.loadBadge}>
            <Text style={weekLoadStatus.isWarn ? styles.loadBadgeTextWarn : styles.loadBadgeText}>
              {weekLoadStatus.label}
            </Text>
          </View>
        </View>

        <View style={styles.loadTrack}>
          <View style={[
            styles.loadFill,
            {
              width: `${weekProgress * 100}%`,
              backgroundColor: weekLoadStatus.isWarn ? '#ffb86b' : thisWeek.total >= WEEKLY_TARGET ? '#62d982' : '#4a9e6a',
            },
          ]} />
        </View>

        {thisWeek.total > 0 ? (
          <View style={styles.pillRow}>
            {thisWeek.ruck > 0 && <View style={styles.pill}><Text style={styles.pillText}>Ruck {thisWeek.ruck}</Text></View>}
            {thisWeek.strength > 0 && <View style={styles.pill}><Text style={styles.pillText}>Strength {thisWeek.strength}</Text></View>}
            {thisWeek.run > 0 && <View style={styles.pill}><Text style={styles.pillText}>Run {thisWeek.run}</Text></View>}
            {thisWeek.mobility > 0 && <View style={styles.pill}><Text style={styles.pillText}>Mobility {thisWeek.mobility}</Text></View>}
            {thisWeek.test > 0 && <View style={styles.pill}><Text style={styles.pillText}>Test {thisWeek.test}</Text></View>}
            {thisWeek.recovery > 0 && <View style={styles.pill}><Text style={styles.pillText}>Recovery {thisWeek.recovery}</Text></View>}
          </View>
        ) : (
          <Text style={styles.loadNoData}>No sessions logged this week. Aim for {WEEKLY_TARGET} sessions.</Text>
        )}

        {thisWeek.fatigueWatch > 0 ? (
          <Text style={styles.loadWarnText}>
            {thisWeek.fatigueWatch} fatigue watch {thisWeek.fatigueWatch === 1 ? 'session' : 'sessions'} this week. Consider a recovery day.
          </Text>
        ) : thisWeek.averageReadiness !== '0.0' ? (
          <Text style={styles.loadSubText}>
            Avg readiness {thisWeek.averageReadiness}/10 · {trend.label} trend
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mission Alerts</Text>
          <Text style={styles.sectionTag}>WATCH</Text>
        </View>

        {readinessPercentage > 0 && readinessPercentage < 60 ? (
          <AlertCard
            type="alert"
            title="Recovery requires attention"
            description="Keep the next session controlled if sleep, soreness or resting fatigue worsens."
          />
        ) : null}

        {trend.status === 'warning' ? (
          <AlertCard
            type="alert"
            title="Readiness dropping"
            description="Readiness has fallen between your last two sessions. Reduce load and prioritise recovery before adding intensity."
          />
        ) : null}

        {thisWeek.fatigueWatch >= 2 ? (
          <AlertCard
            type="alert"
            title="Fatigue watch this week"
            description={`${thisWeek.fatigueWatch} sessions this week logged with readiness of 5 or below. Consider a rest day or recovery session.`}
          />
        ) : null}

        {latestRuck && Number(latestRuck.readiness) >= 7 && readinessPercentage >= 70 ? (
          <AlertCard
            type="info"
            title="Ruck progression available"
            description="Readiness is solid. Increase distance or load only if the previous ruck was completed without pain."
          />
        ) : null}

        {trend.status === 'good' && thisWeek.fatigueWatch === 0 && thisWeek.total >= 3 ? (
          <AlertCard
            type="info"
            title="Ready to progress"
            description="Readiness is improving and no fatigue flags this week. You can consider adding load or an extra session."
          />
        ) : null}

        {readinessPercentage === 0 && logs.length === 0 ? (
          <AlertCard
            type="info"
            title="No training data"
            description="Log your first session to start tracking readiness, load and recovery trends."
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 20, gap: 18, paddingBottom: 50, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  header: { gap: 10 },
  kicker: { color: '#8fbf8f', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#f2f5ef', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 15, lineHeight: 22 },
  readinessRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  metric: { color: '#ffffff', fontSize: 56, fontWeight: '900', marginTop: 8 },
  cardText: { color: '#aeb8aa', marginTop: 4, lineHeight: 20 },
  statusBadge: { backgroundColor: '#143d22', borderColor: '#46d16d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusBadgeText: { color: '#bfffcf', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  progressTrack: { height: 10, backgroundColor: '#07110c', borderRadius: 999, marginTop: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#26382c' },
  progressFill: { width: '82%', height: '100%', backgroundColor: '#62d982', borderRadius: 999 },
  readinessDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  detailText: { color: '#d8e6d4', backgroundColor: '#0b1710', borderWidth: 1, borderColor: '#213c2b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { marginTop: 8, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#f2f5ef', fontSize: 23, fontWeight: '900' },
  sectionTag: { color: '#8fbf8f', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: '#26382c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140, marginTop: 4 },
  barColumn: { alignItems: 'center', width: 40 },
  barScore: { color: '#aeb8aa', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  barBackground: { width: 24, height: 100, backgroundColor: '#0b1710', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: '#213c2b' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '800', marginTop: 8 },

  loadCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 12 },
  loadCardWarn: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 12 },
  loadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  loadKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  loadCount: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  loadCountWarn: { color: '#ffb86b', fontSize: 24, fontWeight: '900', marginTop: 4 },
  loadBadge: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loadBadgeWarn: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loadBadgeText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  loadBadgeTextWarn: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  loadTrack: { height: 8, backgroundColor: '#07110c', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#26382c' },
  loadFill: { height: '100%', borderRadius: 999 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  loadNoData: { color: '#6f7d70', fontSize: 13, fontWeight: '800' },
  loadSubText: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  loadWarnText: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
});
