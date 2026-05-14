import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RuckScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>LOAD CARRIAGE</Text>
      <Text style={styles.title}>Ruck Performance</Text>
      <Text style={styles.subtitle}>
        Track loaded movement, distance, pace, load weight and recovery impact.
      </Text>

      <View style={styles.heroCard}>
        <Text style={styles.cardTitle}>Current Ruck Standard</Text>
        <Text style={styles.metric}>12 km</Text>
        <Text style={styles.cardText}>
          Controlled endurance base. Build progressively before increasing load or distance.
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Load</Text>
          <Text style={styles.value}>20 kg</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Pace</Text>
          <Text style={styles.value}>9:15/km</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>12 km</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>Ready</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ruck Builder</Text>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Session 1: Base Ruck</Text>
          <Text style={styles.planText}>
            6–8 km at easy pace with light-to-moderate load. Focus on posture, breathing and foot care.
          </Text>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Session 2: Interval Ruck</Text>
          <Text style={styles.planText}>
            5 rounds of 4 minutes strong pace followed by 2 minutes easy pace. Keep load controlled.
          </Text>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Session 3: Long Ruck</Text>
          <Text style={styles.planText}>
            Build distance gradually. Increase either distance or load, not both in the same week.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Field Notes</Text>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Before</Text>
          <Text style={styles.noteText}>
            Check boots, socks, hydration, route, weather and pack fit before stepping off.
          </Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>During</Text>
          <Text style={styles.noteText}>
            Keep shoulders relaxed, shorten stride on hills and avoid running under heavy load.
          </Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>After</Text>
          <Text style={styles.noteText}>
            Log distance, load, pace, hot spots, fatigue and any lower-leg pain.
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
    gap: 16,
  },
  kicker: {
    color: '#8fbf8f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#f2f5ef',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#aeb8aa',
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: '#102018',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#365f3e',
  },
  cardTitle: {
    color: '#dfe8da',
    fontSize: 18,
    fontWeight: '800',
  },
  metric: {
    color: '#ffffff',
    fontSize: 52,
    fontWeight: '900',
    marginTop: 8,
  },
  cardText: {
    color: '#aeb8aa',
    marginTop: 6,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  smallCard: {
    backgroundColor: '#101a14',
    borderRadius: 18,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: '#26382c',
  },
  label: {
    color: '#8fbf8f',
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#f2f5ef',
    fontSize: 22,
    fontWeight: '900',
  },
  planCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203529',
  },
  planTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  planText: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  noteCard: {
    backgroundColor: '#101a14',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  noteTitle: {
    color: '#8fbf8f',
    fontSize: 15,
    fontWeight: '900',
  },
  noteText: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});