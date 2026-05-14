import AlertCard from '@/src/components/ui/AlertCard';
import MissionStat from '@/src/components/ui/MissionStat';
import SentinelCard from '@/src/components/ui/SentinelCard';
import { calculateReadinessPercentage, useTraining } from '@/src/screens/TrainingContext';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  const { logs } = useTraining();

  const readinessPercentage = calculateReadinessPercentage(logs);

  let statusBadgeText = 'GREEN';
  let statusBadgeColor = '#143d22';
  let statusTextColor = '#bfffcf';
  let progressColor = '#62d982';
  let readinessMsg = 'Fit for training. Monitor fatigue and recovery.';

  if (readinessPercentage > 0 && readinessPercentage < 60) {
    statusBadgeText = 'RED';
    statusBadgeColor = '#3d1414';
    statusTextColor = '#ffbfbf';
    progressColor = '#d96262';
    readinessMsg = 'High fatigue detected. Prioritise recovery and rest today.';
  } else if (readinessPercentage >= 60 && readinessPercentage < 75) {
    statusBadgeText = 'AMBER';
    statusBadgeColor = '#3d3014';
    statusTextColor = '#ffdfbf';
    progressColor = '#d9a662';
    readinessMsg = 'Moderate fatigue. Keep training volume controlled.';
  } else if (readinessPercentage === 0) {
    statusBadgeText = 'NO DATA';
    statusBadgeColor = '#1a1a1a';
    statusTextColor = '#cccccc';
    progressColor = '#333333';
    readinessMsg = 'Log a session to calculate your readiness score.';
  }

  // 2. Extract Mission Stats from the latest logs
  const latestRuck = logs.find((l) => l.category === 'Ruck');
  const latestStrength = logs.find((l) => l.category === 'Strength');
  const latestRun = logs.find((l) => l.category === 'Run');
  const latestRecovery = logs.find((l) => l.category === 'Recovery');

  const ruckVal = latestRuck ? latestRuck.distanceLoad.split('-')[0].trim() || 'Logged' : 'N/A';
  const strengthVal = latestStrength ? `Score: ${latestStrength.readiness}` : 'N/A';
  const cardioVal = latestRun ? latestRun.distanceLoad.split('-')[0].trim() || 'Logged' : 'N/A';
  const recoveryVal = latestRecovery ? `Score: ${latestRecovery.readiness}` : 'N/A';

  // 3. Prepare Trend Data (last 7 logs with readiness)
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
            <Text style={styles.cardText}>
              {readinessMsg}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>{statusBadgeText}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${readinessPercentage}%`, backgroundColor: progressColor }]} />
        </View>

        <View style={styles.readinessDetails}>
          <Text style={styles.detailText}>Strength: Stable</Text>
          <Text style={styles.detailText}>Endurance: Improving</Text>
          <Text style={styles.detailText}>Recovery: Moderate</Text>
        </View>
      </SentinelCard>

      <SentinelCard title="Readiness Trend">
        <View style={styles.chartContainer}>
          {trendLogs.length > 0 ? (
            trendLogs.map((log) => {
              const score = Number(log.readiness);
              const heightPercentage = `${(score / 10) * 100}%`;
              let barColor = '#62d982'; // Green
              if (score < 6) barColor = '#d96262'; // Red
              else if (score < 8) barColor = '#d9a662'; // Amber

              // Format date as MM/DD
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s Training Focus</Text>
          <Text style={styles.sectionTag}>DAY PLAN</Text>
        </View>

        <View style={styles.trainingCard}>
          <View style={styles.trainingTopRow}>
            <Text style={styles.trainingTitle}>Tactical Conditioning</Text>
            <Text style={styles.trainingTime}>35 min</Text>
          </View>
          <Text style={styles.trainingText}>
            5 km steady run, loaded carry intervals, mobility and cooldown.
          </Text>
        </View>

        <View style={styles.trainingCard}>
          <View style={styles.trainingTopRow}>
            <Text style={styles.trainingTitle}>Strength Priority</Text>
            <Text style={styles.trainingTime}>45 min</Text>
          </View>
          <Text style={styles.trainingText}>
            Squat, press, pull and hinge pattern. Keep intensity controlled.
          </Text>
        </View>

        <View style={styles.trainingCard}>
          <View style={styles.trainingTopRow}>
            <Text style={styles.trainingTitle}>Recovery Note</Text>
            <Text style={styles.trainingTime}>10 min</Text>
          </View>
          <Text style={styles.trainingText}>
            Hydrate, stretch hips and calves, and keep sleep quality in view.
          </Text>
        </View>
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

        {latestRuck && Number(latestRuck.readiness) >= 7 && readinessPercentage >= 70 ? (
          <AlertCard 
            type="info"
            title="Ruck progression available"
            description="Readiness is solid. Increase distance or load only if the previous ruck was completed without pain."
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07110c',
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 50,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 10,
  },
  kicker: {
    color: '#8fbf8f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#f2f5ef',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#aeb8aa',
    fontSize: 15,
    lineHeight: 22,
  },
  readinessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  metric: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '900',
    marginTop: 8,
  },
  cardText: {
    color: '#aeb8aa',
    marginTop: 4,
    lineHeight: 20,
  },
  statusBadge: {
    backgroundColor: '#143d22',
    borderColor: '#46d16d',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: '#bfffcf',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#07110c',
    borderRadius: 999,
    marginTop: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26382c',
  },
  progressFill: {
    width: '82%',
    height: '100%',
    backgroundColor: '#62d982',
    borderRadius: 999,
  },
  readinessDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  detailText: {
    color: '#d8e6d4',
    backgroundColor: '#0b1710',
    borderWidth: 1,
    borderColor: '#213c2b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  section: {
    marginTop: 8,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#f2f5ef',
    fontSize: 23,
    fontWeight: '900',
  },
  sectionTag: {
    color: '#8fbf8f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: '#26382c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  trainingCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203529',
  },
  trainingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  trainingTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  trainingTime: {
    color: '#8fbf8f',
    fontSize: 13,
    fontWeight: '800',
  },
  trainingText: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    marginTop: 4,
  },
  barColumn: {
    alignItems: 'center',
    width: 40,
  },
  barScore: {
    color: '#aeb8aa',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  barBackground: {
    width: 24,
    height: 100,
    backgroundColor: '#0b1710',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#213c2b',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    color: '#8fbf8f',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
  },
});