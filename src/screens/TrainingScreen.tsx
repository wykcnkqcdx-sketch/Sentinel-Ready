import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildSmartLogDraft } from '@/src/utils/logDraftUtils';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import {
  buildPlanLogDraft,
  buildReadinessTrend,
  buildWeekPlan,
  buildWeekSummary,
  DayPlan,
  getCurrentPlanDay,
  getDayPlanDetails,
} from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function intensityColor(intensity: DayPlan['intensity'], planType: string) {
  if (intensity === 'Rest' || intensity === 'Low') return '#b8c0b0';
  if (planType === 'recovery') return '#b8c0b0';
  if (intensity === 'High') return '#ffaa44';
  return '#B5852C';
}

const MiniDayRow = memo(function MiniDayRow({ item, isToday, planType }: { item: DayPlan; isToday: boolean; planType: string }) {
  return (
    <View style={isToday ? styles.miniRowToday : item.isRest ? styles.miniRowRest : styles.miniRow}>
      <View style={styles.miniLeft}>
        <Text style={isToday ? styles.miniDayToday : item.isRest ? styles.miniDayRest : styles.miniDay}>
          {item.day.slice(0, 3)}
        </Text>
        <Text style={item.isRest ? styles.miniFocusRest : styles.miniFocus}>{item.focus}</Text>
      </View>
      <Text style={[styles.miniIntensity, { color: intensityColor(item.intensity, planType) }]}>
        {item.intensity}
      </Text>
    </View>
  );
});

export default function TrainingScreen() {
  const { logs, goals, isLoading } = useTraining();
  const profile = useUser();
  const router = useRouter();

  const thisWeek = useMemo(() => buildWeekSummary(logs, 0), [logs]);
  const trend = useMemo(() => buildReadinessTrend(logs), [logs]);
  const { days, planType, rationale } = useMemo(() => buildWeekPlan(logs, goals, profile), [logs, goals, profile]);
  const missionBrief = useMemo(() => buildMissionBrief(logs, goals, { injuryNotes: profile.injuryNotes }), [logs, goals, profile.injuryNotes]);
  const smartDraft = useMemo(() => buildSmartLogDraft(logs, goals, { injuryNotes: profile.injuryNotes }), [logs, goals, profile.injuryNotes]);

  const logSuggestedSession = useCallback(() => {
    router.push({
      pathname: '/add-log',
      params: {
        date: smartDraft.date,
        category: smartDraft.category,
        type: smartDraft.type,
        duration: smartDraft.duration,
        distanceLoad: smartDraft.distanceLoad,
        readiness: smartDraft.readiness,
        notes: smartDraft.notes,
      },
    });
  }, [router, smartDraft]);

  const todayPlan = useMemo(() => getCurrentPlanDay(days), [days]);
  const todayDetails = useMemo(() => todayPlan ? getDayPlanDetails(todayPlan) : null, [todayPlan]);
  const remainingDays = useMemo(() => days.filter((d) => d.day !== todayPlan?.day), [days, todayPlan]);

  const logTodayPlan = useCallback(() => {
    if (!todayPlan) return;
    const draft = buildPlanLogDraft(todayPlan);
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
  }, [router, todayPlan]);

  const isRecovery = planType === 'recovery';
  const isProgressive = planType === 'progressive';

  const heroBorderColor = isRecovery ? 'rgba(255,170,68,0.3)' : isProgressive ? 'rgba(181,133,44,0.3)' : '#2d6b3f';
  const heroBgColor = isRecovery ? '#1a0f0b' : '#102016';
  const focusLabelColor = isRecovery ? '#ffaa44' : '#B5852C';
  const badgeText = isRecovery ? 'DELOAD' : isProgressive ? 'PROGRESSIVE' : 'ON TRACK';
  const badgeBg = isRecovery ? 'rgba(212,160,26,0.1)' : isProgressive ? '#141810' : '#0b2a14';
  const badgeBorder = isRecovery ? 'rgba(255,170,68,0.3)' : isProgressive ? 'rgba(181,133,44,0.3)' : '#58d77a';
  const badgeTextColor = isRecovery ? '#ffaa44' : '#B5852C';

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Mission Training</Text>
      <View style={styles.headerRule} />
      <Text style={styles.subtitle}>
        {"Today's session and weekly plan built from your readiness, load and training split."}
      </Text>

      {todayPlan ? (
        <View style={[styles.heroCard, { borderColor: heroBorderColor, backgroundColor: heroBgColor }]}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>TODAY - {todayPlan.day.toUpperCase()}</Text>
            <View style={[styles.badge, { borderColor: badgeBorder, backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeText}</Text>
            </View>
          </View>
          <Text style={[styles.heroFocus, { color: focusLabelColor }]}>{todayPlan.focus}</Text>
          <Text style={styles.heroSession}>{todayPlan.session}</Text>
          {todayDetails ? (
            <View style={styles.detailBox}>
              <Text style={styles.detailLine}>Warm-up: {todayDetails.warmup}</Text>
              <Text style={styles.detailLine}>Main: {todayDetails.mainWork}</Text>
              <Text style={styles.detailLine}>Cooldown: {todayDetails.cooldown}</Text>
              <Text style={styles.detailLine}>Adjust: {todayDetails.adjustment}</Text>
            </View>
          ) : null}
          <Text style={[styles.heroIntensity, { color: intensityColor(todayPlan.intensity, planType) }]}>
            Intensity: {todayPlan.intensity}
          </Text>
          <TouchableOpacity style={todayPlan.isRest ? styles.heroButtonRest : styles.heroButton} onPress={logTodayPlan}>
            <Text style={todayPlan.isRest ? styles.heroButtonTextRest : styles.heroButtonText}>
              {todayPlan.isRest ? 'Log Recovery' : 'Log Today Session'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={missionBrief.status === 'red' ? styles.briefCardWarn : styles.briefCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>MISSION BRIEF</Text>
          <Text style={missionBrief.status === 'red' ? styles.briefStatusWarn : styles.briefStatus}>
            {missionBrief.status.toUpperCase()}
          </Text>
        </View>
        <Text style={missionBrief.status === 'red' ? styles.briefTitleWarn : styles.briefTitle}>{missionBrief.title}</Text>
        <Text style={styles.briefText}>{missionBrief.primaryAction}</Text>
        <Text style={styles.briefSubText}>{missionBrief.secondaryAction}</Text>
        <TouchableOpacity style={missionBrief.status === 'red' ? styles.briefButtonWarn : styles.briefButton} onPress={logSuggestedSession}>
          <Text style={missionBrief.status === 'red' ? styles.briefButtonTextWarn : styles.briefButtonText}>
            Log Suggested Session
          </Text>
        </TouchableOpacity>
      </View>

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
          <MiniDayRow key={item.day} item={item} isToday={false} planType={planType} />
        ))}
      </View>

      <View style={styles.ruleCard}>
        <Text style={styles.ruleTitle}>Training Rule</Text>
        <Text style={styles.ruleText}>
          Do not increase distance, load and intensity in the same week. Progress one variable at a time and monitor readiness between sessions.
          {goals.length > 0 ? ` Current active goals are used to prioritise the weekly split.` : ''}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06100b' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  headerRule: { height: 1, backgroundColor: '#B5852C', opacity: 0.55, marginVertical: 2 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#b8c0b0', fontSize: 15, lineHeight: 22 },

  heroCard: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 8 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroLabel: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  badge: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroFocus: { fontSize: 24, fontWeight: '900' },
  heroSession: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  heroIntensity: { fontSize: 12, fontWeight: '900' },
  heroButton: { backgroundColor: '#B5852C', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4 },
  heroButtonRest: { backgroundColor: '#102016', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)' },
  heroButtonText: { color: '#080c05', fontSize: 12, fontWeight: '900' },
  heroButtonTextRest: { color: '#b8c0b0', fontSize: 12, fontWeight: '900' },
  detailBox: { backgroundColor: '#080c05', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', padding: 12, gap: 5, marginTop: 4 },
  detailLine: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  briefCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 7 },
  briefCardWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 7 },
  briefStatus: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  briefStatusWarn: { color: '#ffaa44', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  briefTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  briefTitleWarn: { color: '#ffaa44', fontSize: 20, fontWeight: '900' },
  briefText: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  briefSubText: { color: '#b8c0b0', fontSize: 12, lineHeight: 18 },
  briefButton: { backgroundColor: '#B5852C', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4 },
  briefButtonWarn: { backgroundColor: '#ffaa44', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4 },
  briefButtonText: { color: '#080c05', fontSize: 12, fontWeight: '900' },
  briefButtonTextWarn: { color: 'rgba(212,160,26,0.1)', fontSize: 12, fontWeight: '900' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: '#0c1008', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 4 },
  statKicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  statNumber: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statNumberWarn: { color: '#ffaa44', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statNumberGood: { color: '#B5852C', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#b8c0b0', fontSize: 11, fontWeight: '800' },

  rationaleCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 6 },
  rationaleCardWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 6 },
  rationaleKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  rationaleText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  sectionPill: { color: '#B5852C', borderWidth: 1, borderColor: '#274b32', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

  weekList: { backgroundColor: '#0c1008', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', overflow: 'hidden' },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#162218' },
  miniRowToday: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#162218', backgroundColor: '#141810' },
  miniRowRest: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#0e1710', backgroundColor: '#080f0a' },
  miniLeft: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  miniDay: { color: '#ffffff', fontSize: 13, fontWeight: '900', width: 32 },
  miniDayToday: { color: '#B5852C', fontSize: 13, fontWeight: '900', width: 32 },
  miniDayRest: { color: '#4a5e4a', fontSize: 13, fontWeight: '900', width: 32 },
  miniFocus: { color: '#c4cec0', fontSize: 13, fontWeight: '800' },
  miniFocusRest: { color: '#4a5e4a', fontSize: 13, fontWeight: '800' },
  miniIntensity: { fontSize: 11, fontWeight: '900' },

  ruleCard: { backgroundColor: '#111a10', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.2)', gap: 6 },
  ruleTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  ruleText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },
});
