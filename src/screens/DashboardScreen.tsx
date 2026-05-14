import MissionStat from '@/src/components/ui/MissionStat';
import SentinelCard from '@/src/components/ui/SentinelCard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
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
            <Text style={styles.metric}>82%</Text>
            <Text style={styles.cardText}>
              Fit for training. Monitor fatigue and recovery.
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>GREEN</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.readinessDetails}>
          <Text style={styles.detailText}>Strength: Stable</Text>
          <Text style={styles.detailText}>Endurance: Improving</Text>
          <Text style={styles.detailText}>Recovery: Moderate</Text>
        </View>
      </SentinelCard>

      <View style={styles.grid}>
        <MissionStat label="Ruck" value="12 km" status="Loaded movement" />
        <MissionStat label="Strength" value="Good" status="Force output stable" />
        <MissionStat label="Cardio" value="37.9 VO₂" status="Aerobic base" />
        <MissionStat label="Recovery" value="Moderate" status="Monitor fatigue" />
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

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Recovery requires attention</Text>
          <Text style={styles.alertText}>
            Keep the next session controlled if sleep, soreness or resting fatigue worsens.
          </Text>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Ruck progression available</Text>
          <Text style={styles.alertText}>
            Increase distance or load only if the previous ruck was completed without pain.
          </Text>
        </View>
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
  alertCard: {
    backgroundColor: '#12180d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#394323',
  },
  alertTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  alertText: {
    color: '#b8bfae',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});