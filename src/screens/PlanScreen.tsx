import AlertCard from '@/src/components/ui/AlertCard';
import { useTraining } from '@/src/screens/TrainingContext';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const baseWeekPlan = [
  {
    day: 'Monday',
    focus: 'Strength',
    session: 'Squat, press, pull, loaded carry',
    intensity: 'Moderate / Heavy',
  },
  {
    day: 'Tuesday',
    focus: 'Conditioning',
    session: 'Intervals, sled-style carries, core',
    intensity: 'High',
  },
  {
    day: 'Wednesday',
    focus: 'Recovery',
    session: 'Mobility, easy walk, breathing work',
    intensity: 'Low',
  },
  {
    day: 'Thursday',
    focus: 'Ruck',
    session: '8-12 km loaded movement',
    intensity: 'Moderate',
  },
  {
    day: 'Friday',
    focus: 'Strength Endurance',
    session: 'Circuit using hinge, push, pull and carry',
    intensity: 'Moderate',
  },
  {
    day: 'Saturday',
    focus: 'Run',
    session: 'Steady run or tempo progression',
    intensity: 'Moderate',
  },
  {
    day: 'Sunday',
    focus: 'Rest',
    session: 'Full rest or light mobility only',
    intensity: 'Low',
  },
];

export default function PlanScreen() {
  const { logs } = useTraining();

  // Calculate Readiness
  const recentLogs = logs.slice(0, 5);
  const avgScore = recentLogs.length > 0 
    ? recentLogs.reduce((sum, log) => sum + (Number(log.readiness) || 0), 0) / recentLogs.length 
    : 0;
  const readinessPercentage = recentLogs.length > 0 ? Math.round((avgScore / 10) * 100) : 0;

  const isFatigued = readinessPercentage > 0 && readinessPercentage < 70;

  const dynamicWeekPlan = baseWeekPlan.map((item) => {
    if (isFatigued) {
      let newIntensity = item.intensity;
      let newSession = item.session;

      if (item.intensity.includes('High') || item.intensity.includes('Heavy')) {
        newIntensity = 'Moderate';
        newSession += ' (Reduce load/volume by 20-30%)';
      } else if (item.intensity === 'Moderate') {
        newIntensity = 'Low';
        newSession += ' (Keep effort conversational. Stop before fatigue sets in.)';
      }

      return {
        ...item,
        intensity: newIntensity,
        session: newSession,
      };
    }
    return item;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>TRAINING PLAN</Text>
      <Text style={styles.title}>7-Day Tactical Plan</Text>
      <Text style={styles.subtitle}>
        A balanced weekly structure for strength, ruck performance, conditioning, running and recovery.
      </Text>

      <View style={[styles.commandCard, isFatigued && styles.commandCardWarning]}>
        <Text style={styles.commandTitle}>{isFatigued ? 'Recovery Priority Active' : 'Current Objective'}</Text>
        <Text style={styles.commandText}>
          {isFatigued 
            ? 'Readiness is below 70%. The plan below has been automatically de-loaded. Reduce load and intensity, and prioritise recovery.'
            : 'Build operational readiness without overloading the body. Keep hard days hard, easy days easy, and track fatigue.'}
        </Text>
      </View>

      {dynamicWeekPlan.map((item) => (
        <View key={item.day} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.day}>{item.day}</Text>
            <Text style={[styles.intensity, isFatigued && item.intensity !== 'Low' && styles.intensityWarning]}>
              {item.intensity}
            </Text>
          </View>

          <Text style={styles.focus}>{item.focus}</Text>
          <Text style={styles.session}>{item.session}</Text>
        </View>
      ))}

      {!isFatigued ? (
        <AlertCard 
          type="info"
          title="Programming Rule"
          description="If readiness drops below 70%, reduce load, distance or intensity by 20-30% and prioritise recovery."
        />
      ) : (
        <AlertCard 
          type="warning"
          title="Plan Adjusted"
          description="Your plan has been automatically de-loaded to accommodate for your current fatigue levels."
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
    gap: 14,
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
  commandCard: {
    backgroundColor: '#102016',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2d6b3f',
  },
  commandCardWarning: {
    backgroundColor: '#1a160d',
    borderColor: '#4a3a1d',
  },
  commandTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  commandText: {
    color: '#c4cec0',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  dayCard: {
    backgroundColor: '#0d1812',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203529',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  day: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  intensity: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  intensityWarning: {
    color: '#f3d36b',
  },
  focus: {
    color: '#91e6a3',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 10,
  },
  session: {
    color: '#c4cec0',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
});
