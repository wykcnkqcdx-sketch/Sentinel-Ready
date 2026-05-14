import { useTraining } from '@/src/screens/TrainingContext';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RecoveryScreen() {
  const { logs } = useTraining();

  // 1. Calculate Recovery Score (Same logic as Dashboard Readiness)
  const recentLogs = logs.slice(0, 5);
  const avgScore = recentLogs.length > 0 
    ? recentLogs.reduce((sum, log) => sum + (Number(log.readiness) || 0), 0) / recentLogs.length 
    : 0;
  const recoveryScore = recentLogs.length > 0 ? Math.round((avgScore / 10) * 100) : 0;

  let scoreText = 'Log a session to calculate your recovery score.';
  let fatigueValue = 'Unknown';

  if (recoveryScore >= 80) {
    scoreText = 'Prime condition. Ready for high-intensity or heavy load.';
    fatigueValue = 'Low';
  } else if (recoveryScore >= 60) {
    scoreText = 'Trainable, but avoid unnecessary max-effort work. Keep the session clean and controlled.';
    fatigueValue = 'Moderate';
  } else if (recoveryScore > 0) {
    scoreText = 'High fatigue detected. Prioritise recovery, mobility, and rest today.';
    fatigueValue = 'High';
  }

  // 2. Fetch the most recent Recovery session
  const latestRecovery = logs.find((l) => l.category === 'Recovery');

  // 3. Define the dynamic grid items inside the component
  const recoveryItems = [
    {
      title: 'Sleep',
      value: '7-8 hrs', // Static Target
      note: 'Aim for consistent sleep before heavy ruck or strength work.',
    },
    {
      title: 'Hydration',
      value: '2.5-3L', // Static Target
      note: 'Increase intake during loaded carries, heat or high-sweat sessions.',
    },
    {
      title: 'Mobility',
      value: latestRecovery ? latestRecovery.duration : '--',
      note: latestRecovery ? `Last logged: ${latestRecovery.date}` : 'Prioritise hips, calves, hamstrings, back and shoulders.',
    },
    {
      title: 'Fatigue',
      value: recoveryScore === 0 ? 'No Data' : fatigueValue,
      note: fatigueValue === 'High' 
        ? 'Keep intensity very low. Focus heavily on rest and recovery.' 
        : 'Keep intensity controlled if legs feel heavy or sleep is poor.',
    },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>RECOVERY</Text>
      <Text style={styles.title}>Recovery Status</Text>
      <Text style={styles.subtitle}>
        Monitor fatigue, readiness and recovery habits so training stays sustainable.
      </Text>

      <View style={styles.mainCard}>
        <Text style={styles.mainTitle}>Today's Recovery Score</Text>
        <Text style={styles.score}>{recoveryScore > 0 ? `${recoveryScore}%` : '--'}</Text>
        <Text style={styles.mainText}>
          {scoreText}
        </Text>
      </View>

      <View style={styles.grid}>
        {recoveryItems.map((item) => (
          <View key={item.title} style={styles.card}>
            <Text style={styles.cardLabel}>{item.title}</Text>
            <Text style={styles.cardValue}>{item.value}</Text>
            <Text style={styles.cardNote}>{item.note}</Text>
          </View>
        ))}
      </View>

      <View style={styles.protocolCard}>
        <Text style={styles.protocolTitle}>Suggested Recovery Protocol</Text>
        <Text style={styles.protocolText}>1. 5 minutes easy walk or bike.</Text>
        <Text style={styles.protocolText}>2. Hip flexor, calf and hamstring mobility.</Text>
        <Text style={styles.protocolText}>3. Light breathing work to bring heart rate down.</Text>
        <Text style={styles.protocolText}>4. Rehydrate and eat protein within the next meal window.</Text>
      </View>
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
  mainCard: {
    backgroundColor: '#102016',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2d6b3f',
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  score: {
    color: '#ffffff',
    fontSize: 58,
    fontWeight: '900',
    marginTop: 8,
  },
  mainText: {
    color: '#c4cec0',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#0d1812',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203529',
  },
  cardLabel: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  cardNote: {
    color: '#aeb8aa',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  protocolCard: {
    backgroundColor: '#171509',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4b4523',
  },
  protocolTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 10,
  },
  protocolText: {
    color: '#d7dfc9',
    fontSize: 14,
    lineHeight: 23,
  },
});
