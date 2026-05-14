import { useTraining } from '@/src/screens/TrainingContext';
import {
  buildReadinessTrend,
  buildWeekPlan,
  buildWeekSummary,
  DayPlan,
} from '@/src/utils/trainingLogUtils';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTodayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

function intensityColor(intensity: DayPlan['intensity']) {
  if (intensity === 'Rest' || intensity === 'Low') return '#8fbf8f';
  if (intensity === 'High') return '#f3d36b';
  return '#91e6a3';
}

function MiniDayRow({ item, isToday }: { item: DayPlan; isToday: boolean }) {
  return (
    <View style={isToday ? styles.miniRowToday : item.isRest ? styles.miniRowRest : styles.miniRow}>
      <View style={styles.miniLeft}>
        <Text style={isToday ? styles.miniDayToday : item.isRest ? styles.miniDayRest : styles.miniDay}>
          {item.day.slice(0, 3)}
        </Text>
        <Text style={item.isRest ? styles.miniFocusRest : styles.miniFocus}>{item.focus}</Text>
      </View>
      <Text style={[styles.miniIntensity, { color: intensityColor(item.intensity) }]}>
        {item.intensity}
      </Text>
    </View>
  );
}

export default function TrainingScreen() {
  const { logs, isLoading } = useTraining();
  if (isLoading) return <View style={styles.screen} />;

  const thisWeek = buildWeekSummary(logs, 0);
  const trend = buildReadinessTrend(logs);
  const { days, planType, rationale } = buildWeekPlan(logs);

  const todayName = getTodayName();
  const todayPlan = days.find((d) => d.day === todayName);
  const remainingDays = days.filter((d) => d.day !== todayName);

  const isRecovery = planType === 'recovery';
  const isProgressive = planType === 'progressive';

  const heroBorderColor = isRecovery ? '#7a4a1f' : isProgressive ? '#2f6b3c' : '#2d6b3f';
  const heroBgColor = isRecovery ? '#1a0f0b' : '#102016';
  const focusLabelColor = isRecovery ? '#ffb86b' : '#91e6a3';
  const badgeText = isRecovery ? 'DELOAD' : isProgressive ? 'PROGRESSIVE' : 'ON TRACK';
  const badgeBg = isRecovery ? '#2a1a0d' : isProgressive ? '#102d1a' : '#0b2a14';
  const badgeBorder = isRecovery ? '#7a4a1f' : isProgressive ? '#2f6b3c' : '#58d77a';
  const badgeTextColor = isRecovery ? '#ffb86b' : '#91e6a3';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Mission Training</Text>
      <Text style={styles.subtitle}>
        {"Today's session and weekly plan built from your readiness, load and training split."}
      </Text>

      {todayPlan ? (
        <View style={[styles.heroCard, { borderColor: heroBorderColor, backgroundColor: heroBgColor }]}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>TODAY — {todayName.toUpperCase()}</Text>
            <View style={[styles.badge, { borderColor: badgeBorder, backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeText}</Text>
            </View>
          </View>
          <Text style={[styles.heroFocus, { color: focusLabelColor }]}>{todayPlan.focus}</Text>
          <Text style={styles.heroSession}>{todayPlan.session}</Text>
          <Text style={[styles.heroIntensity, { color: intensityColor(todayPlan.intensity) }]}>
            Intensity: {todayPlan.intensity}
          </Text>
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statKicker}>THIS WEEK</Text>
          <Text style={styles.statNumber}>{thisWeek.total}</Text>
          <Text style={styles.statLabel}>{thisWeek.total === 1 ? 'session' : 'sessions'}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statKicker}>AVG READINESS</Text>
          <Text style={
            Number(thisWeek.averageReadiness) > 0 && Number(thisWeek.averageReadiness) < 6
              ? styles.statNumberWarn : styles.statNumber
          }>
            {thisWeek.averageReadiness !== '0.0' ? `${thisWeek.averageReadiness}/10` : '--'}
          </Text>
          <Text style={styles.statLabel}>{trend.label} trend</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statKicker}>FATIGUE WATCH</Text>
          <Text style={thisWeek.fatigueWatch > 0 ? styles.statNumberWarn : styles.statNumber}>
            {thisWeek.fatigueWatch}
          </Text>
          <Text style={styles.statLabel}>{thisWeek.fatigueWatch > 0 ? 'sessions flagged' : 'none this week'}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statKicker}>PLAN TYPE</Text>
          <Text style={isRecovery ? styles.statNumberWarn : isProgressive ? styles.statNumberGood : styles.statNumber}>
            {isRecovery ? 'Recovery' : isProgressive ? 'Progress' : 'Standard'}
          </Text>
          <Text style={styles.statLabel}>week mode</Text>
        </View>
      </View>

      <View style={isRecovery ? styles.rationaleCardWarn : styles.rationaleCard}>
        <Text style={styles.rationaleKicker}>PLAN RATIONALE</Text>
        <Text style={styles.rationaleText}>{rationale}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rest of the Week</Text>
        <Text style={styles.sectionPill}>PLAN</Text>
      </View>

      <View style={styles.weekList}>
        {remainingDays.map((item) => (
          <MiniDayRow key={item.day} item={item} isToday={false} />
        ))}
      </View>

      <View style={styles.ruleCard}>
        <Text style={styles.ruleTitle}>Training Rule</Text>
        <Text style={styles.ruleText}>
          Do not increase distance, load and intensity in the same week. Progress one variable at a time and monitor readiness between sessions.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#f4f7f0', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#c4cec0', fontSize: 15, lineHeight: 22 },

  heroCard: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 8 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroLabel: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  badge: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroFocus: { fontSize: 24, fontWeight: '900' },
  heroSession: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  heroIntensity: { fontSize: 12, fontWeight: '900' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: '#0d1812', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 4 },
  statKicker: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  statNumber: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statNumberWarn: { color: '#ffb86b', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statNumberGood: { color: '#91e6a3', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '800' },

  rationaleCard: { backgroundColor: '#0d1812', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 6 },
  rationaleCardWarn: { backgroundColor: '#21140b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', gap: 6 },
  rationaleKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  rationaleText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  sectionPill: { color: '#91e6a3', borderWidth: 1, borderColor: '#274b32', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

  weekList: { backgroundColor: '#0d1812', borderRadius: 18, borderWidth: 1, borderColor: '#203529', overflow: 'hidden' },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#162218' },
  miniRowToday: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#162218', backgroundColor: '#102d1a' },
  miniRowRest: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#0e1710', backgroundColor: '#080f0a' },
  miniLeft: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  miniDay: { color: '#ffffff', fontSize: 13, fontWeight: '900', width: 32 },
  miniDayToday: { color: '#91e6a3', fontSize: 13, fontWeight: '900', width: 32 },
  miniDayRest: { color: '#4a5e4a', fontSize: 13, fontWeight: '900', width: 32 },
  miniFocus: { color: '#c4cec0', fontSize: 13, fontWeight: '800' },
  miniFocusRest: { color: '#4a5e4a', fontSize: 13, fontWeight: '800' },
  miniIntensity: { fontSize: 11, fontWeight: '900' },

  ruleCard: { backgroundColor: '#111a10', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#31411f', gap: 6 },
  ruleTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  ruleText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },
});
