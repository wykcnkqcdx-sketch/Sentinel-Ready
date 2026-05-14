import AlertCard from '@/src/components/ui/AlertCard';
import { useTraining } from '@/src/screens/TrainingContext';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const baseSessions = [
  {
    title: 'Strength Base',
    type: 'Gym',
    time: '45 min',
    focus: 'Squat, press, row and hinge pattern',
    detail: 'Controlled strength work. Keep 2 reps in reserve and focus on clean movement.',
  },
  {
    title: 'Tactical Conditioning',
    type: 'Field',
    time: '35 min',
    focus: 'Run, carry, crawl and mobility',
    detail: 'Build work capacity without overloading recovery. Suitable for operational fitness.',
  },
  {
    title: 'Loaded Movement',
    type: 'Ruck',
    time: '60 min',
    focus: 'Load carriage and pacing',
    detail: 'Steady pace with posture checks every 10 minutes. No running under load.',
  },
];

export default function TrainingScreen() {
  const { logs } = useTraining();

  // 1. Calculate Readiness
  const recentLogs = logs.slice(0, 5);
  const avgScore = recentLogs.length > 0 
    ? recentLogs.reduce((sum, log) => sum + (Number(log.readiness) || 0), 0) / recentLogs.length 
    : 0;
  const readinessPercentage = recentLogs.length > 0 ? Math.round((avgScore / 10) * 100) : 0;
  const isFatigued = readinessPercentage > 0 && readinessPercentage < 70;

  // 2. Calculate Weekly Stats
  const last7DaysLogs = logs.filter(log => {
    const logDate = new Date(log.date).getTime();
    const now = new Date().getTime();
    return (now - logDate) <= 7 * 24 * 60 * 60 * 1000;
  });
  
  const weeklyLoad = last7DaysLogs.length;
  const recoveryLogs = last7DaysLogs.filter(l => l.category === 'Recovery');
  const ruckLogs = last7DaysLogs.filter(l => l.category === 'Ruck');

  // 3. Dynamic Priority Logic
  let heroTitle = 'Tactical Conditioning';
  let heroText = 'Keep the session controlled. Build capacity without carrying fatigue into tomorrow.';
  let badgeText = 'READY';
  let badgeBorder = '#58d77a';
  let badgeBg = '#0b2a14';
  let badgeTextColor = '#a8ffb8';

  if (isFatigued) {
    heroTitle = 'Active Recovery';
    heroText = 'High fatigue detected. Prioritise mobility, hydration, and active rest today.';
    badgeText = 'DELOAD';
    badgeBorder = '#d9a662';
    badgeBg = '#3d3014';
    badgeTextColor = '#ffdfbf';
  } else if (weeklyLoad < 2) {
    heroTitle = 'Strength Base';
    heroText = 'Weekly volume is low. Hit a full-body strength session to build durability.';
    badgeText = 'BUILD';
  } else if (recoveryLogs.length === 0 && weeklyLoad >= 3) {
    heroTitle = 'Recovery Priority';
    heroText = 'Training volume is building but no recovery is logged. Add a mobility session.';
    badgeText = 'WATCH';
    badgeBorder = '#d9a662';
    badgeBg = '#3d3014';
    badgeTextColor = '#ffdfbf';
  }

  // 4. Dynamic Training Blocks
  const dynamicSessions = baseSessions.map((session) => {
    if (isFatigued) {
      return {
        ...session,
        title: `${session.title} (Deload)`,
        time: '30 min',
        detail: 'Intensity automatically reduced. Keep the session light and focus on movement quality rather than output.',
      };
    }
    return session;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>TRAINING</Text>
      <Text style={styles.title}>Mission Training Plan</Text>
      <Text style={styles.subtitle}>
        Structured sessions for strength, endurance, loaded movement and recovery.
      </Text>

      <View style={[styles.heroCard, isFatigued && styles.heroCardWarning]}>
        <View>
          <Text style={[styles.heroLabel, isFatigued && styles.warningText]}>Today&apos;s Priority</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroText}>
            {heroText}
          </Text>
        </View>

        <View style={[styles.badge, { borderColor: badgeBorder, backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeText}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Weekly Load</Text>
          <Text style={styles.value}>{weeklyLoad} {weeklyLoad === 1 ? 'Session' : 'Sessions'}</Text>
          <Text style={styles.note}>{weeklyLoad > 4 ? 'High volume' : 'Balanced'}</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Intensity</Text>
          <Text style={styles.value}>{isFatigued ? 'Low' : 'Moderate'}</Text>
          <Text style={styles.note}>{isFatigued ? 'Deload active' : 'Controlled'}</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Recovery</Text>
          <Text style={styles.value}>{recoveryLogs.length > 0 ? 'Active' : 'Missing'}</Text>
          <Text style={[styles.note, recoveryLogs.length === 0 && styles.warningText]}>
            {recoveryLogs.length > 0 ? 'Mobility focus' : 'Add recovery'}
          </Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Ruck Volume</Text>
          <Text style={styles.value}>{ruckLogs.length} {ruckLogs.length === 1 ? 'Session' : 'Sessions'}</Text>
          <Text style={styles.note}>{ruckLogs.length > 2 ? 'Monitor feet/back' : 'On track'}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Training Blocks</Text>
        <Text style={styles.sectionPill}>THIS WEEK</Text>
      </View>

      {dynamicSessions.map((session) => (
        <View key={session.title} style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View>
              <Text style={styles.sessionTitle}>{session.title}</Text>
              <Text style={[styles.sessionFocus, isFatigued && styles.warningText]}>{session.focus}</Text>
            </View>

            <View style={[styles.timeBadge, isFatigued && styles.timeBadgeWarning]}>
              <Text style={[styles.timeText, isFatigued && styles.warningText]}>{session.time}</Text>
            </View>
          </View>

          <Text style={styles.sessionDetail}>{session.detail}</Text>

          <View style={styles.tagRow}>
            <Text style={styles.tag}>{session.type}</Text>
            <Text style={styles.tag}>{isFatigued ? 'Deload' : 'Progressive'}</Text>
            <Text style={styles.tag}>Planned</Text>
          </View>
        </View>
      ))}

      {!isFatigued ? (
        <AlertCard 
          type="warning"
          title="Training Rule"
          description="Do not increase distance, load and intensity in the same week. Progress one variable at a time."
        />
      ) : (
        <AlertCard 
          type="alert"
          title="Deload Active"
          description="Training blocks have been automatically modified to lower intensity until readiness recovers."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#06100b',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  kicker: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  title: {
    color: '#f4f7f0',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#c4cec0',
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: '#102016',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2d6b3f',
    minHeight: 170,
    justifyContent: 'space-between',
  },
  heroCardWarning: {
    backgroundColor: '#1a160d',
    borderColor: '#4a3a1d',
  },
  warningText: {
    color: '#f3d36b',
  },
  heroLabel: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 10,
  },
  heroText: {
    color: '#c4cec0',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 720,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#58d77a',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#0b2a14',
    marginTop: 18,
  },
  badgeText: {
    color: '#a8ffb8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  smallCard: {
    width: '47%',
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21382a',
  },
  label: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  value: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  note: {
    color: '#c4cec0',
    fontSize: 13,
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  sectionPill: {
    color: '#91e6a3',
    borderWidth: 1,
    borderColor: '#274b32',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sessionCard: {
    backgroundColor: '#0d1812',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#25382c',
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sessionTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
  },
  sessionFocus: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  timeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d6b3f',
    paddingVertical: 6,
    paddingHorizontal: 10,
    height: 32,
  },
  timeBadgeWarning: {
    borderColor: '#4a3a1d',
  },
  timeText: {
    color: '#a8ffb8',
    fontSize: 12,
    fontWeight: '900',
  },
  sessionDetail: {
    color: '#c4cec0',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  tag: {
    color: '#dce8d6',
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#24382c',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '800',
  },
});
