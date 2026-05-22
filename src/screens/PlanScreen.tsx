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
  if (intensity === 'Rest' || intensity === 'Low') return '#b8c0b0';
  if (planType === 'recovery') return '#b8c0b0';
  if (intensity === 'High') return '#ffaa44';
  return '#B5852C';
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
    planType === 'recovery' ? '#ffaa44'
    : planType === 'progressive' ? '#B5852C'
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

  const todayName = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[new Date().getDay()];
  }, []);

  const currentDayOfWeek = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }, []);

  const weekDayDate = useCallback((dayIndex: number) => {
    const now = new Date();
    const jsDay = now.getDay();
    const diff = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + dayIndex);
    return monday.getDate().toString();
  }, []);

  const upcomingDays = useMemo(() => {
    const todayIndex = days.findIndex((d) => d.day === todayName);
    const startIndex = todayIndex >= 0 ? todayIndex : 0;
    return days.slice(startIndex).filter((d) => !d.isRest).slice(0, 3);
  }, [days, todayName]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={ps.headerRow}>
        <View style={ps.headerLeft}>
          <Text style={styles.kicker}>[ MISSION PLANNING ]</Text>
          <Text style={styles.title}>Training Directive</Text>
          <View style={styles.headerRule} />
        </View>
        <View style={[ps.statusBadge, { borderColor: planTypeColor }]}>
          <Text style={[ps.statusBadgeText, { color: planTypeColor }]}>
            {planType === 'recovery' ? '[ STATUS: AMBER ]' : planType === 'progressive' ? '[ STATUS: GREEN ]' : '[ STATUS: ACTIVE ]'}
          </Text>
        </View>
      </View>
      <View style={ps.pillEditRow}>
        <View style={[styles.planModePill, hasCustomPlan ? styles.planModePillAmber : styles.planModePillMuted]}>
          <Text style={[styles.planModePillText, hasCustomPlan ? styles.planModePillTextAmber : styles.planModePillTextMuted]}>
            {hasCustomPlan ? 'CUSTOM PLAN' : 'AUTO PLAN'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editPlanButton} onPress={() => router.push('/plan-builder')}>
          <Text style={styles.editPlanButtonText}>[ EDIT PLAN ]</Text>
        </TouchableOpacity>
      </View>
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

      <View style={ps.cycleCard}>
        <Text style={ps.cycleKicker}>[ TRAINING CYCLE ]</Text>
        <View style={ps.cyclePhaseRow}>
          <Text style={[ps.cyclePhaseName, { color: planTypeColor }]}>
            {planType === 'recovery' ? 'RECOVERY PROTOCOL' : planType === 'progressive' ? 'PROGRESSIVE LOAD' : 'STRUCTURAL BASE'}
          </Text>
          <Text style={ps.cyclePhaseTag}>PHASE II</Text>
        </View>
        <View style={ps.cycleDayRow}>
          <Text style={ps.cycleDayLabel}>DAY</Text>
          <Text style={[ps.cycleDayNum, { color: planTypeColor }]}>{currentDayOfWeek}</Text>
          <Text style={ps.cycleDaySlash}>/</Text>
          <Text style={ps.cycleDayTotal}>7</Text>
        </View>
        <View style={ps.cycleProgressTrack}>
          <View style={[ps.cycleProgressFill, { width: `${(currentDayOfWeek / 7) * 100}%` as unknown as number, backgroundColor: planTypeColor }]} />
        </View>
        <View style={ps.focusChipRow}>
          {(planType === 'recovery' ? ['MOBILITY', 'SLEEP', 'NUTRITION'] : planType === 'progressive' ? ['STRENGTH', 'RUCK', 'CARDIO'] : ['STRENGTH', 'ENDURANCE', 'BALANCE']
          ).map((chip) => (
            <View key={chip} style={ps.focusChip}><Text style={ps.focusChipText}>{chip}</Text></View>
          ))}
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

      <View style={ps.tempoCard}>
        <Text style={ps.tempoKicker}>[ OPERATIONAL TEMPO ]</Text>
        <View style={ps.tempoRow}>
          {days.map((d, i) => {
            const letter = ['M','T','W','T','F','S','S'][i];
            const isToday = d.day === todayName;
            const dotColor = d.isRest ? null : d.intensity === 'High' ? '#B5852C' : d.intensity === 'Moderate' ? '#ffaa44' : '#5E7A2F';
            return (
              <View key={d.day} style={[ps.tempoDay, isToday ? ps.tempoDayToday : null]}>
                <Text style={[ps.tempoDayLetter, isToday ? { color: '#B5852C' } : null]}>{letter}</Text>
                <Text style={[ps.tempoDayNum, isToday ? { color: '#B5852C' } : null]}>{weekDayDate(i)}</Text>
                {dotColor ? <View style={[ps.tempoDot, { backgroundColor: dotColor }]} /> : <View style={ps.tempoDotEmpty} />}
              </View>
            );
          })}
        </View>
      </View>

      {upcomingDays.length > 0 ? (
        <View style={ps.upcomingCard}>
          <Text style={ps.upcomingKicker}>[ UPCOMING OPS ]</Text>
          {upcomingDays.map((d) => (
            <TouchableOpacity key={d.day} style={ps.upcomingRow} onPress={() => logPlannedSession(d)}>
              <View style={ps.upcomingLeft}>
                <Text style={ps.upcomingDayTag}>{d.day.slice(0, 3).toUpperCase()}</Text>
                <View style={ps.upcomingInfo}>
                  <Text style={ps.upcomingTitle}>{d.focus}</Text>
                  <Text style={ps.upcomingSub}>{d.session}</Text>
                </View>
              </View>
              <Text style={ps.upcomingChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

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
  screen: { flex: 1, backgroundColor: '#050e09' },
  content: { padding: 10, paddingBottom: 120, gap: 12, maxWidth: 820, width: '100%', alignSelf: 'center' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planHeaderLeft: { flex: 1 },
  editPlanButton: {
    borderWidth: 1,
    borderColor: '#141810',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  editPlanButtonText: { color: '#B5852C', fontSize: 12, fontWeight: '700' },
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
  planModePillTextMuted: { color: '#b8c0b0' },
  kicker: { color: '#F4BD5F', fontSize: 11, fontWeight: '900', letterSpacing: 2.2 },
  headerRule: { height: 1, backgroundColor: '#B5852C', opacity: 0.55, marginVertical: 2 },
  title: { color: '#F4BD5F', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: '#d3c4b1', fontSize: 14, lineHeight: 20 },

  thisWeekCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 12 },
  cardKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  thisWeekRow: { flexDirection: 'row', gap: 4 },
  thisWeekStat: { flex: 1, gap: 4 },
  thisWeekNumber: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  thisWeekNumberWarn: { color: '#ffaa44', fontSize: 18, fontWeight: '900' },
  thisWeekNumberGood: { color: '#B5852C', fontSize: 18, fontWeight: '900' },
  thisWeekLabel: { color: '#b8c0b0', fontSize: 10, fontWeight: '800' },

  commandCard: { backgroundColor: '#102016', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: '#2d6b3f', gap: 8 },
  commandCardGood: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 8 },
  commandCardWarning: { backgroundColor: 'rgba(255,170,68,0.06)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 8 },
  commandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  commandKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  planTypeLabel: { fontSize: 13, fontWeight: '900' },
  commandText: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  balanceCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 8 },
  balanceCardWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 8 },
  balanceLabel: { color: '#B5852C', fontSize: 13, fontWeight: '900' },
  balanceLabelWarn: { color: '#ffaa44', fontSize: 13, fontWeight: '900' },
  balanceFocus: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '900' },
  forecastList: { backgroundColor: '#080c05', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', overflow: 'hidden' },
  forecastItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#162218' },
  forecastDay: { color: '#B5852C', fontSize: 12, fontWeight: '900', width: 34 },
  forecastFocus: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', flex: 1 },
  forecastStatusGreen: { color: '#B5852C', fontSize: 10, fontWeight: '900' },
  forecastStatusAmber: { color: '#ffaa44', fontSize: 10, fontWeight: '900' },
  forecastStatusRed: { color: '#ffaa44', fontSize: 10, fontWeight: '900' },
  adherencePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  adherencePill: { backgroundColor: '#080c05', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', paddingHorizontal: 10, paddingVertical: 6 },
  adherencePillText: { color: '#b8c0b0', fontSize: 11, fontWeight: '900' },

  dayCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 6 },
  dayCardRest: { backgroundColor: '#080f0a', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: '#161f18', gap: 6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  day: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  dayRest: { color: '#4a5e4a', fontSize: 18, fontWeight: '900' },
  intensity: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  focus: { color: '#B5852C', fontSize: 14, fontWeight: '900' },
  focusRest: { color: '#4a5e4a', fontSize: 14, fontWeight: '900' },
  session: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },
  detailGrid: { backgroundColor: '#080c05', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', padding: 10, gap: 4, marginTop: 4 },
  detailText: { color: '#b8c0b0', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  logButton: { backgroundColor: '#B5852C', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 6 },
  logButtonRest: { backgroundColor: '#102016', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 6, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)' },
  logButtonText: { color: '#080c05', fontSize: 12, fontWeight: '900' },
  logButtonTextRest: { color: '#b8c0b0', fontSize: 12, fontWeight: '900' },
});

const ps = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  statusBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  pillEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cycleCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.22)', gap: 10 },
  cycleKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cyclePhaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cyclePhaseName: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  cyclePhaseTag: { color: '#b8c0b0', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cycleDayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  cycleDayLabel: { color: '#b8c0b0', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  cycleDayNum: { fontSize: 32, fontWeight: '900' },
  cycleDaySlash: { color: '#4a5e4a', fontSize: 20, fontWeight: '700', marginHorizontal: 2 },
  cycleDayTotal: { color: '#4a5e4a', fontSize: 20, fontWeight: '900' },
  cycleProgressTrack: { height: 3, backgroundColor: 'rgba(181,133,44,0.15)', borderRadius: 2, overflow: 'hidden' },
  cycleProgressFill: { height: 3, borderRadius: 2 },
  focusChipRow: { flexDirection: 'row', gap: 8 },
  focusChip: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  focusChipText: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tempoCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 12 },
  tempoKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  tempoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tempoDay: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 4 },
  tempoDayToday: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.5)', backgroundColor: 'rgba(181,133,44,0.06)' },
  tempoDayLetter: { color: '#b8c0b0', fontSize: 11, fontWeight: '900' },
  tempoDayNum: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  tempoDot: { width: 6, height: 6, borderRadius: 3 },
  tempoDotEmpty: { width: 6, height: 6 },
  upcomingCard: { backgroundColor: '#0c1008', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', overflow: 'hidden' },
  upcomingKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, padding: 14, paddingBottom: 10 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#131d14' },
  upcomingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  upcomingDayTag: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 1, width: 30 },
  upcomingInfo: { flex: 1, gap: 2 },
  upcomingTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  upcomingSub: { color: '#b8c0b0', fontSize: 12 },
  upcomingChevron: { color: '#B5852C', fontSize: 22, fontWeight: '300' },
});
