import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildPlanAdherence } from '@/src/utils/adherenceUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildReadinessForecast } from '@/src/utils/readinessForecastUtils';
import {
  buildWeekPlan,
  buildWeekSummary,
  DayPlan,
  buildReadinessTrend,
  getDayPlanDetails,
} from '@/src/utils/trainingLogUtils';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function intensityColor(intensity: DayPlan['intensity'], planType: string) {
  if (intensity === 'Rest' || intensity === 'Low') return '#8fbf8f';
  if (planType === 'recovery') return '#8fbf8f';
  if (intensity === 'High') return '#f3d36b';
  return '#91e6a3';
}

function DayCard({ item, planType }: { item: DayPlan; planType: string }) {
  const isRest = item.isRest;
  const details = getDayPlanDetails(item);
  return (
    <View style={isRest ? styles.dayCardRest : styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={isRest ? styles.dayRest : styles.day}>{item.day}</Text>
        <Text style={[styles.intensity, { color: intensityColor(item.intensity, planType) }]}>
          {item.intensity}
        </Text>
      </View>
      <Text style={isRest ? styles.focusRest : styles.focus}>{item.focus}</Text>
      <Text style={styles.session}>{item.session}</Text>
      <View style={styles.detailGrid}>
        <Text style={styles.detailText}>Warm-up: {details.warmup}</Text>
        <Text style={styles.detailText}>Main: {details.mainWork}</Text>
        <Text style={styles.detailText}>Cooldown: {details.cooldown}</Text>
        <Text style={styles.detailText}>Adjust: {details.adjustment}</Text>
      </View>
    </View>
  );
}

export default function PlanScreen() {
  const { logs, goals, isLoading } = useTraining();
  const profile = useUser();
  if (isLoading) return <View style={styles.screen} />;

  const thisWeek = buildWeekSummary(logs, 0);
  const trend = buildReadinessTrend(logs);
  const { days, planType, rationale } = buildWeekPlan(logs, goals, profile);
  const balance = buildTrainingBalance(logs);
  const forecast = buildReadinessForecast(logs, goals, profile);
  const adherence = buildPlanAdherence(logs, goals, profile);

  const planTypeLabel =
    planType === 'recovery' ? 'Recovery Week'
    : planType === 'progressive' ? 'Progressive Week'
    : 'Standard Week';

  const planTypeColor =
    planType === 'recovery' ? '#ffb86b'
    : planType === 'progressive' ? '#91e6a3'
    : '#ffffff';

  const commandCardStyle =
    planType === 'recovery' ? styles.commandCardWarning
    : planType === 'progressive' ? styles.commandCardGood
    : styles.commandCard;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>7-Day Training Plan</Text>
      <Text style={styles.subtitle}>
        {"Generated from your readiness, fatigue watch and this week's training split."}
      </Text>

      <View style={styles.thisWeekCard}>
        <Text style={styles.cardKicker}>THIS WEEK SO FAR</Text>
        <View style={styles.thisWeekRow}>
          <View style={styles.thisWeekStat}>
            <Text style={styles.thisWeekNumber}>{thisWeek.total}</Text>
            <Text style={styles.thisWeekLabel}>Sessions</Text>
          </View>
          <View style={styles.thisWeekStat}>
            <Text style={thisWeek.fatigueWatch > 0 ? styles.thisWeekNumberWarn : styles.thisWeekNumber}>
              {thisWeek.fatigueWatch}
            </Text>
            <Text style={styles.thisWeekLabel}>Fatigue Watch</Text>
          </View>
          <View style={styles.thisWeekStat}>
            <Text style={styles.thisWeekNumber}>{thisWeek.averageReadiness}</Text>
            <Text style={styles.thisWeekLabel}>Avg Readiness</Text>
          </View>
          <View style={styles.thisWeekStat}>
            <Text style={
              trend.status === 'warning' ? styles.thisWeekNumberWarn
              : trend.status === 'good' ? styles.thisWeekNumberGood
              : styles.thisWeekNumber
            }>
              {trend.label}
            </Text>
            <Text style={styles.thisWeekLabel}>Trend</Text>
          </View>
        </View>
      </View>

      <View style={commandCardStyle}>
        <View style={styles.commandHeader}>
          <Text style={styles.commandKicker}>NEXT WEEK PLAN</Text>
          <Text style={[styles.planTypeLabel, { color: planTypeColor }]}>{planTypeLabel}</Text>
        </View>
        <Text style={styles.commandText}>{rationale}</Text>
      </View>

      <View style={balance.status === 'overload' ? styles.balanceCardWarn : styles.balanceCard}>
        <View style={styles.commandHeader}>
          <Text style={styles.commandKicker}>TRAINING BALANCE</Text>
          <Text style={balance.status === 'overload' ? styles.balanceLabelWarn : styles.balanceLabel}>{balance.label}</Text>
        </View>
        <Text style={styles.commandText}>{balance.message}</Text>
        <Text style={styles.balanceFocus}>{balance.nextFocus}</Text>
      </View>

      <View style={forecast.status === 'red' ? styles.balanceCardWarn : styles.balanceCard}>
        <View style={styles.commandHeader}>
          <Text style={styles.commandKicker}>READINESS FORECAST</Text>
          <Text style={forecast.status === 'red' ? styles.balanceLabelWarn : styles.balanceLabel}>{forecast.label}</Text>
        </View>
        <Text style={styles.commandText}>{forecast.summary}</Text>
        <View style={styles.forecastList}>
          {forecast.days.map((day) => (
            <View key={day.day} style={styles.forecastItem}>
              <Text style={styles.forecastDay}>{day.day.slice(0, 3)}</Text>
              <Text style={styles.forecastFocus}>{day.focus}</Text>
              <Text style={
                day.status === 'red' ? styles.forecastStatusRed
                : day.status === 'amber' ? styles.forecastStatusAmber
                : styles.forecastStatusGreen
              }>
                {day.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={adherence.status === 'off-track' ? styles.balanceCardWarn : styles.balanceCard}>
        <View style={styles.commandHeader}>
          <Text style={styles.commandKicker}>PLAN ADHERENCE</Text>
          <Text style={adherence.status === 'off-track' ? styles.balanceLabelWarn : styles.balanceLabel}>
            {adherence.label} {adherence.status === 'no-data' ? '' : `${adherence.score}%`}
          </Text>
        </View>
        <Text style={styles.commandText}>{adherence.message}</Text>
        <Text style={styles.balanceFocus}>{adherence.nextAction}</Text>
        {adherence.missing.length > 0 ? (
          <View style={styles.adherencePills}>
            {adherence.missing.map((item) => (
              <View key={item} style={styles.adherencePill}>
                <Text style={styles.adherencePillText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {days.map((item) => (
        <DayCard key={item.day} item={item} planType={planType} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#f4f7f0', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#c4cec0', fontSize: 15, lineHeight: 22 },

  thisWeekCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 12 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  thisWeekRow: { flexDirection: 'row', gap: 4 },
  thisWeekStat: { flex: 1, gap: 4 },
  thisWeekNumber: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  thisWeekNumberWarn: { color: '#ffb86b', fontSize: 18, fontWeight: '900' },
  thisWeekNumberGood: { color: '#91e6a3', fontSize: 18, fontWeight: '900' },
  thisWeekLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '800' },

  commandCard: { backgroundColor: '#102016', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d6b3f', gap: 8 },
  commandCardGood: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 8 },
  commandCardWarning: { backgroundColor: '#1a160d', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 8 },
  commandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  commandKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  planTypeLabel: { fontSize: 13, fontWeight: '900' },
  commandText: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  balanceCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 8 },
  balanceCardWarn: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 8 },
  balanceLabel: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  balanceLabelWarn: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  balanceFocus: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '900' },
  forecastList: { backgroundColor: '#07110c', borderRadius: 12, borderWidth: 1, borderColor: '#26382c', overflow: 'hidden' },
  forecastItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#162218' },
  forecastDay: { color: '#91e6a3', fontSize: 12, fontWeight: '900', width: 34 },
  forecastFocus: { color: '#dfe8da', fontSize: 12, fontWeight: '800', flex: 1 },
  forecastStatusGreen: { color: '#91e6a3', fontSize: 10, fontWeight: '900' },
  forecastStatusAmber: { color: '#f3d36b', fontSize: 10, fontWeight: '900' },
  forecastStatusRed: { color: '#ffb86b', fontSize: 10, fontWeight: '900' },
  adherencePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  adherencePill: { backgroundColor: '#07110c', borderRadius: 999, borderWidth: 1, borderColor: '#26382c', paddingHorizontal: 10, paddingVertical: 6 },
  adherencePillText: { color: '#8fbf8f', fontSize: 11, fontWeight: '900' },

  dayCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 6 },
  dayCardRest: { backgroundColor: '#080f0a', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#161f18', gap: 6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  day: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  dayRest: { color: '#4a5e4a', fontSize: 18, fontWeight: '900' },
  intensity: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  focus: { color: '#91e6a3', fontSize: 14, fontWeight: '900' },
  focusRest: { color: '#4a5e4a', fontSize: 14, fontWeight: '900' },
  session: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },
  detailGrid: { backgroundColor: '#07110c', borderRadius: 12, borderWidth: 1, borderColor: '#26382c', padding: 10, gap: 4, marginTop: 4 },
  detailText: { color: '#aeb8aa', fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
