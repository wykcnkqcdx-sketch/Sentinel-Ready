import { ScrollView, StyleSheet, Text, View } from 'react-native';

const tests = [
  {
    name: '2 km Run',
    standard: 'Aerobic Capacity',
    score: '09:42',
    status: 'Pass',
    note: 'Good base. Aim to reduce by 15–30 seconds over the next block.',
  },
  {
    name: 'Push-Up Test',
    standard: 'Upper Body Endurance',
    score: '42 reps',
    status: 'Pass',
    note: 'Maintain strict form. Add tempo work once per week.',
  },
  {
    name: 'Loaded Carry',
    standard: 'Grip / Trunk / Work Capacity',
    score: '400 m',
    status: 'Develop',
    note: 'Progress distance gradually before adding load.',
  },
  {
    name: 'Ruck Assessment',
    standard: 'Operational Movement',
    score: '12 km',
    status: 'Ready',
    note: 'Monitor feet, calves, hips and lower back after each ruck.',
  },
];

export default function TestsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>TESTING</Text>
      <Text style={styles.title}>Fitness Test Centre</Text>
      <Text style={styles.subtitle}>
        Track operational fitness standards across running, strength endurance, loaded movement and recovery risk.
      </Text>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Current Test Readiness</Text>
          <Text style={styles.heroScore}>GREEN</Text>
          <Text style={styles.heroText}>
            Fit to test. Keep warm-up controlled and avoid unnecessary fatigue before assessment.
          </Text>
        </View>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreNumber}>4</Text>
          <Text style={styles.scoreLabel}>Tests</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Assessment Battery</Text>
        <Text style={styles.sectionTag}>ACTIVE</Text>
      </View>

      {tests.map((test) => (
        <View key={test.name} style={styles.testCard}>
          <View style={styles.testTop}>
            <View style={styles.testNameBlock}>
              <Text style={styles.testName}>{test.name}</Text>
              <Text style={styles.testStandard}>{test.standard}</Text>
            </View>

            <View style={styles.resultBlock}>
              <Text style={styles.resultScore}>{test.score}</Text>
              <Text
                style={[
                  styles.resultStatus,
                  test.status === 'Develop' && styles.warningStatus,
                ]}
              >
                {test.status}
              </Text>
            </View>
          </View>

          <Text style={styles.note}>{test.note}</Text>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Testing Guidance</Text>
        <Text style={styles.sectionTag}>RULES</Text>
      </View>

      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceTitle}>Test fresh, not wrecked.</Text>
        <Text style={styles.guidanceText}>
          Complete hard training at least 24–48 hours before a formal test. Fatigue can hide true performance.
        </Text>
      </View>

      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceTitle}>Record conditions.</Text>
        <Text style={styles.guidanceText}>
          Note surface, weather, footwear, load weight and sleep quality so future scores can be compared fairly.
        </Text>
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
    paddingBottom: 120,
    gap: 16,
  },
  kicker: {
    color: '#8fe89b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#f4f7f1',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#c6d0c2',
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: '#102018',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2d6b3b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  heroScore: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    marginTop: 12,
  },
  heroText: {
    color: '#c6d0c2',
    marginTop: 8,
    lineHeight: 21,
    maxWidth: 650,
  },
  scoreBox: {
    width: 82,
    height: 82,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#69df7b',
    backgroundColor: '#123d22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#b9ffc0',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
  },
  sectionTag: {
    color: '#9ee8a5',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#264c32',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  testCard: {
    backgroundColor: '#0e1812',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  testTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  testNameBlock: {
    flex: 1,
  },
  testName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  testStandard: {
    color: '#8fe89b',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultBlock: {
    alignItems: 'flex-end',
  },
  resultScore: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  resultStatus: {
    color: '#aaffb1',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  warningStatus: {
    color: '#f3d36b',
  },
  note: {
    color: '#c6d0c2',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  guidanceCard: {
    backgroundColor: '#111a10',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#31411f',
  },
  guidanceTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  guidanceText: {
    color: '#c6d0c2',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
