import { ScrollView, StyleSheet, Text, View } from 'react-native';

const sessions = [
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
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>TRAINING</Text>
      <Text style={styles.title}>Mission Training Plan</Text>
      <Text style={styles.subtitle}>
        Structured sessions for strength, endurance, loaded movement and recovery.
      </Text>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Today&apos;s Priority</Text>
          <Text style={styles.heroTitle}>Tactical Conditioning</Text>
          <Text style={styles.heroText}>
            Keep the session controlled. Build capacity without carrying fatigue into tomorrow.
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>READY</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Weekly Load</Text>
          <Text style={styles.value}>4 Sessions</Text>
          <Text style={styles.note}>Balanced</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Intensity</Text>
          <Text style={styles.value}>Moderate</Text>
          <Text style={styles.note}>Controlled</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Recovery</Text>
          <Text style={styles.value}>Active</Text>
          <Text style={styles.note}>Mobility focus</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Next Test</Text>
          <Text style={styles.value}>7 Days</Text>
          <Text style={styles.note}>Monitor readiness</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Training Blocks</Text>
        <Text style={styles.sectionPill}>THIS WEEK</Text>
      </View>

      {sessions.map((session) => (
        <View key={session.title} style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View>
              <Text style={styles.sessionTitle}>{session.title}</Text>
              <Text style={styles.sessionFocus}>{session.focus}</Text>
            </View>

            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>{session.time}</Text>
            </View>
          </View>

          <Text style={styles.sessionDetail}>{session.detail}</Text>

          <View style={styles.tagRow}>
            <Text style={styles.tag}>{session.type}</Text>
            <Text style={styles.tag}>Progressive</Text>
            <Text style={styles.tag}>Logged</Text>
          </View>
        </View>
      ))}

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>Training Rule</Text>
        <Text style={styles.warningText}>
          Do not increase distance, load and intensity in the same week. Progress one variable at a time.
        </Text>
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
  heroCard: {
    backgroundColor: '#102016',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2d6b3f',
    minHeight: 170,
    justifyContent: 'space-between',
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
  warningCard: {
    backgroundColor: '#12190a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4b5423',
  },
  warningTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  warningText: {
    color: '#d7dfc9',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
