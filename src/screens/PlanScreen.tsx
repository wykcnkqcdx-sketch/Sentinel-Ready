import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { loadCustomPlan } from '@/src/services/customPlanService';
import { buildPlanAdherence } from '@/src/utils/adherenceUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildReadinessForecast } from '@/src/utils/readinessForecastUtils';
import {
  buildGoalAction,
  buildReadinessTrend,
  buildWeekPlan,
  buildWeekSummary,
  buildPlanLogDraft,
  DayPlan,
  getDayPlanDetails,
} from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function intensityColor(intensity: DayPlan['intensity'], planType: string) {
  if (intensity === 'Rest' || intensity === 'Low') return '#A7ADB8';
  if (planType === 'recovery') return '#A7ADB8';
  if (intensity === 'High') return '#F5A623';
  return '#FC4C02';
}

const DayCard = memo(function DayCard({
  item,
  planType,
  onLog,
}: {
  item: DayPlan;
  planType: string;
  onLog: (item: DayPlan) => void;
}) {
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
      <TouchableOpacity
        style={isRest ? styles.logButtonRest : styles.logButton}
        onPress={() => onLog(item)}
      >
        <Text style={isRest ? styles.logButtonTextRest : styles.logButtonText}>
          {isRest ? 'Log Recovery' : 'Log Planned Session'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default function PlanScreen() {
  const { logs, goals, isLoading } = useTraining();
  const profile = useUser();
  const router = useRouter();
  const [hasCustomPlan, setHasCustomPlan] = useState(false);

  useEffect(() => {
    loadCustomPlan().then((saved) => {
      setHasCustomPlan(saved !== null);
    });
  }, []);

  const { thisWeek, trend, balance } = useMemo(() => ({
    thisWeek: buildWeekSummary(logs, 0),
    trend: buildReadinessTrend(logs),
    balance: buildTrainingBalance(logs),
  }), [logs]);

  const { days, planType, rationale, forecast, adherence, goalAction } = useMemo(() => ({
    ...buildWeekPlan(logs, goals, profile),
    forecast: buildReadinessForecast(logs, goals, profile),
    adherence: buildPlanAdherence(logs, goals, profile),
    goalAction: buildGoalAction(goals, logs),
  }), [logs, goals, profile]);

  const planTypeLabel =
    planType === 'recovery' ? 'Recovery Week'
    : planType === 'progressive' ? 'Progressive Week'
    : 'Standard Week';

  const planTypeColor =
    planType === 'recovery' ? '#F5A623'
    : planType === 'progressive' ? '#FC4C02'
    : '#ffffff';

  const commandCardStyle =
    planType === 'recovery' ? styles.commandCardWarning
    : planType === 'progressive' ? styles.commandCardGood
    : styles.commandCard;

  const logPlannedSession = useCallback((day: DayPlan) => {
    const draft = buildPlanLogDraft(day);
    router.push({
      pathname: '/add-log',
      params: {
        date: draft.date,
        category: draft.category,
        type: draft.type,
        duration: draft.duration,
        distanceLoad: draft.distanceLoad,
        readiness: draft.readiness,
        notes: draft.notes,
      },
    });
  }, [router]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.planHeader}>
        <View style={styles.planHeaderLeft}>
          <Text style={styles.kicker}>SENTINEL READY</Text>
          <Text style={styles.title}>7-Day Training Plan</Text>
        </View>
        <TouchableOpacity
          style={styles.editPlanButton}
          onPress={() => router.push('/plan-builder')}
        >
          <Text style={styles.editPlanButtonText}>Edit Plan</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        {"Generated from your readiness, fatigue watch and this week's training split."}
      </Text>
      <View style={styles.planModePillRow}>
        <View
          style={[
            styles.planModePill,
            hasCustomPlan ? styles.planModePillAmber : styles.planModePillMuted,
          ]}
        >
          <Text
            style={[
              styles.planModePillText,
              hasCustomPlan ? styles.planModePillTextAmber : styles.planModePillTextMuted,
            ]}
          >
            {hasCustomPlan ? 'CUSTOM PLAN' : 'AUTO PLAN'}
          </Text>
        </View>
      </View>

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

      <View style={goalAction.status === 'warning' ? styles.balanceCardWarn : styles.balanceCard}>
        <View style={styles.commandHeader}>
          <Text style={styles.commandKicker}>PRIORITY GOAL</Text>
          <Text style={goalAction.status === 'warning' ? styles.balanceLabelWarn : styles.balanceLabel}>
            {goalAction.title}
          </Text>
        </View>
        <Text style={styles.commandText}>{goalAction.reason}</Text>
        <Text style={styles.balanceFocus}>{goalAction.action}</Text>
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
        <DayCard key={item.day} item={item} planType={planType} onLog={logPlannedSession} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planHeaderLeft: { flex: 1 },
  editPlanButton: {
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  editPlanButtonText: { color: '#FC4C02', fontSize: 12, fontWeight: '700' },
  planModePillRow: { flexDirection: 'row' },
  planModePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planModePillAmber: { borderColor: '#FFB86B', backgroundColor: '#1a1208' },
  planModePillMuted: { borderColor: '#2a3328', backgroundColor: '#0e1812' },
  planModePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  planModePillTextAmber: { color: '#FFB86B' },
  planModePillTextMuted: { color: '#A7ADB8' },
  kicker: { color: '#FC4C02', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#f4f7f0', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#c4cec0', fontSize: 15, lineHeight: 22 },

  thisWeekCard: { backgroundColor: '#1E2229', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  cardKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  thisWeekRow: { flexDirection: 'row', gap: 4 },
  thisWeekStat: { flex: 1, gap: 4 },
  thisWeekNumber: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  thisWeekNumberWarn: { color: '#F5A623', fontSize: 18, fontWeight: '900' },
  thisWeekNumberGood: { color: '#FC4C02', fontSize: 18, fontWeight: '900' },
  thisWeekLabel: { color: '#A7ADB8', fontSize: 10, fontWeight: '800' },

  commandCard: { backgroundColor: '#102016', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d6b3f', gap: 8 },
  commandCardGood: { backgroundColor: '#1E2229', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', gap: 8 },
  commandCardWarning: { backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', gap: 8 },
  commandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  commandKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  planTypeLabel: { fontSize: 13, fontWeight: '900' },
  commandText: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  balanceCard: { backgroundColor: '#1E2229', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  balanceCardWarn: { backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', gap: 8 },
  balanceLabel: { color: '#FC4C02', fontSize: 13, fontWeight: '900' },
  balanceLabelWarn: { color: '#F5A623', fontSize: 13, fontWeight: '900' },
  balanceFocus: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '900' },
  forecastList: { backgroundColor: '#0F1115', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  forecastItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#162218' },
  forecastDay: { color: '#FC4C02', fontSize: 12, fontWeight: '900', width: 34 },
  forecastFocus: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', flex: 1 },
  forecastStatusGreen: { color: '#FC4C02', fontSize: 10, fontWeight: '900' },
  forecastStatusAmber: { color: '#F5A623', fontSize: 10, fontWeight: '900' },
  forecastStatusRed: { color: '#F5A623', fontSize: 10, fontWeight: '900' },
  adherencePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  adherencePill: { backgroundColor: '#0F1115', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6 },
  adherencePillText: { color: '#A7ADB8', fontSize: 11, fontWeight: '900' },

  dayCard: { backgroundColor: '#1E2229', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 },
  dayCardRest: { backgroundColor: '#080f0a', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#161f18', gap: 6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  day: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  dayRest: { color: '#4a5e4a', fontSize: 18, fontWeight: '900' },
  intensity: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  focus: { color: '#FC4C02', fontSize: 14, fontWeight: '900' },
  focusRest: { color: '#4a5e4a', fontSize: 14, fontWeight: '900' },
  session: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },
  detailGrid: { backgroundColor: '#0F1115', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, gap: 4, marginTop: 4 },
  detailText: { color: '#A7ADB8', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  logButton: { backgroundColor: '#FC4C02', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 6 },
  logButtonRest: { backgroundColor: '#102016', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  logButtonText: { color: '#0F1115', fontSize: 12, fontWeight: '900' },
  logButtonTextRest: { color: '#A7ADB8', fontSize: 12, fontWeight: '900' },
});
