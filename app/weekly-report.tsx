import dfiftJson from '@/src/data/standards/dfift-standards.json';
import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import type { DfiftStandards } from '@/src/types/dfift';
import { buildPlanAdherence } from '@/src/utils/adherenceUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import { buildGoalSuggestions } from '@/src/utils/goalSuggestionUtils';
import { buildInjuryWatch } from '@/src/utils/injuryWatchUtils';
import { buildTrainingInsights } from '@/src/utils/insightUtils';
import { buildMilestones, getEarnedMilestones, getNextMilestone } from '@/src/utils/milestoneUtils';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import { buildReadinessForecast } from '@/src/utils/readinessForecastUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import { buildWeeklyReport } from '@/src/utils/reportBuilder';
import {
  buildGoalAction,
  buildGoalSummary,
  buildNextWeekRecommendation,
  buildPerformanceSnapshot,
  buildWeekSummary,
  calculateTrainingLogHealthScore,
  getTrainingLogHealthLabel,
  WeekSummary,
} from '@/src/utils/trainingLogUtils';
import { tokens as T } from '@/src/theme/tokens';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


function formatWeekRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${s.toLocaleDateString('en-GB', opts)} - ${e.toLocaleDateString('en-GB', opts)}`;
}

const CategoryPill = memo(function CategoryPill({ label, count, warn }: { label: string; count: number; warn?: boolean }) {
  if (count === 0) return null;
  return (
    <View style={warn ? styles.pillWarning : styles.pill}>
      <Text style={warn ? styles.pillTextWarning : styles.pillText}>{label} {count}</Text>
    </View>
  );
});

const WeekCard = memo(function WeekCard({ title, week, isThisWeek }: { title: string; week: WeekSummary; isThisWeek: boolean }) {
  const hasData = week.total > 0;
  const readiness = Number(week.averageReadiness);
  const readinessWarn = hasData && readiness > 0 && readiness < 6;
  const fatigueWarn = week.fatigueWatch >= 2;

  return (
    <View style={isThisWeek ? styles.thisWeekCard : styles.lastWeekCard}>
      <View style={styles.weekCardHeader}>
        <View>
          <Text style={styles.cardKicker}>{title.toUpperCase()}</Text>
          <Text style={styles.weekRange}>{formatWeekRange(week.weekStart, week.weekEnd)}</Text>
        </View>
        <View style={isThisWeek ? styles.totalBadge : styles.totalBadgeSecondary}>
          <Text style={isThisWeek ? styles.totalBadgeText : styles.totalBadgeTextSecondary}>
            {week.total} {week.total === 1 ? 'session' : 'sessions'}
          </Text>
        </View>
      </View>

      {!hasData ? (
        <Text style={styles.noDataText}>No sessions logged.</Text>
      ) : (
        <>
          <View style={styles.pillRow}>
            <CategoryPill label="Ruck" count={week.ruck} />
            <CategoryPill label="Strength" count={week.strength} />
            <CategoryPill label="Run" count={week.run} />
            <CategoryPill label="Mobility" count={week.mobility} />
            <CategoryPill label="Test" count={week.test} />
            <CategoryPill label="Recovery" count={week.recovery} />
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={readinessWarn ? styles.statNumberWarning : styles.statNumber}>
                {week.averageReadiness}
              </Text>
              <Text style={styles.statLabel}>Avg Readiness</Text>
            </View>

            <View style={styles.stat}>
              <Text style={fatigueWarn ? styles.statNumberWarning : styles.statNumber}>
                {week.fatigueWatch}
              </Text>
              <Text style={styles.statLabel}>Fatigue Watch</Text>
            </View>

            <View style={styles.stat}>
              <Text style={week.weakLogs > 0 ? styles.statNumberWarning : styles.statNumber}>
                {week.weakLogs}
              </Text>
              <Text style={styles.statLabel}>Weak Logs</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
});

export default function WeeklyReportScreen() {
  const { logs, goals, isLoading } = useTraining();
  const { gender, injuryNotes } = useUser();
  const router = useRouter();

  const {
    thisWeek, lastWeek, twoWeeksAgo, healthScore, healthLabel, nextWeekAdvice,
    goalSummary, goalAction, performance, dfiftSnapshot, goalSuggestions,
    recoveryDebt, trainingBalance, missionBrief, forecast, insights,
    milestones, earnedMilestones, nextMilestone, adherence, injuryWatch, report,
  } = useMemo(() => {
    const dfiftStandards = dfiftJson as DfiftStandards;
    const tw = buildWeekSummary(logs, 0);
    const lw = buildWeekSummary(logs, 1);
    const twa = buildWeekSummary(logs, 2);
    const hs = calculateTrainingLogHealthScore(logs);
    const ms = buildMilestones(logs, goals, { standards: dfiftStandards, gender });
    return {
      thisWeek: tw,
      lastWeek: lw,
      twoWeeksAgo: twa,
      healthScore: hs,
      healthLabel: getTrainingLogHealthLabel(hs),
      nextWeekAdvice: buildNextWeekRecommendation(tw, lw),
      goalSummary: buildGoalSummary(goals),
      goalAction: buildGoalAction(goals, logs),
      performance: buildPerformanceSnapshot(logs),
      dfiftSnapshot: buildDfiftSnapshot(logs, dfiftStandards, gender),
      goalSuggestions: buildGoalSuggestions(logs, goals, { standards: dfiftStandards, gender }),
      recoveryDebt: buildRecoveryDebt(logs, injuryNotes),
      trainingBalance: buildTrainingBalance(logs),
      missionBrief: buildMissionBrief(logs, goals, { injuryNotes }),
      forecast: buildReadinessForecast(logs, goals, { injuryNotes }),
      insights: buildTrainingInsights(logs),
      milestones: ms,
      earnedMilestones: getEarnedMilestones(ms),
      nextMilestone: getNextMilestone(ms),
      adherence: buildPlanAdherence(logs, goals, { injuryNotes }),
      injuryWatch: buildInjuryWatch(logs, injuryNotes),
      report: buildWeeklyReport(logs, new Date(), goals, { standards: dfiftStandards, gender }, { injuryNotes }),
    };
  }, [logs, goals, gender, injuryNotes]);

  const healthIsWarn = healthScore < 60;
  const nextWeekIsWarn = nextWeekAdvice.toLowerCase().includes('prioritise') || nextWeekAdvice.toLowerCase().includes('hold');
  const nextWeekIsGood = nextWeekAdvice.toLowerCase().includes('ready to progress');

  const shareReport = useCallback(async () => {
    try {
      await Share.share({
        title: report.title,
        message: report.text,
      });
    } catch {
      Alert.alert('Share Failed', 'The weekly report could not be shared. You can still select the report text below.');
    }
  }, [report]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/log'); }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>Weekly Report</Text>
        <Text style={styles.subtitle}>
          {"Session load, readiness and fatigue watch reviewed by week. Use this to pace next week's training."}
        </Text>
      </View>

      <WeekCard title="This Week" week={thisWeek} isThisWeek />
      <WeekCard title="Last Week" week={lastWeek} isThisWeek={false} />
      <WeekCard title="Two Weeks Ago" week={twoWeeksAgo} isThisWeek={false} />

      <View style={healthIsWarn ? styles.healthCardWarning : styles.healthCard}>
        <View style={styles.healthHeader}>
          <View>
            <Text style={styles.cardKicker}>TRAINING LOG HEALTH</Text>
            <Text style={healthIsWarn ? styles.healthScoreWarning : styles.healthScore}>
              {healthScore}/100
            </Text>
          </View>
          <View style={healthIsWarn ? styles.healthPillWarning : styles.healthPill}>
            <Text style={healthIsWarn ? styles.healthPillTextWarning : styles.healthPillText}>
              {healthLabel}
            </Text>
          </View>
        </View>
        <Text style={healthIsWarn ? styles.healthMessageWarning : styles.healthMessage}>
          Based on all {logs.length} logs. Weak logs, missing fields and low readiness scores lower this score.
        </Text>
      </View>

      <View style={
        nextWeekIsWarn ? styles.adviceCardWarning
        : nextWeekIsGood ? styles.adviceCardGood
        : styles.adviceCard
      }>
        <Text style={styles.cardKicker}>NEXT WEEK</Text>
        <Text style={
          nextWeekIsWarn ? styles.adviceTitleWarning
          : nextWeekIsGood ? styles.adviceTitleGood
          : styles.adviceTitle
        }>
          {nextWeekIsWarn ? 'Reduce Load' : nextWeekIsGood ? 'Ready to Progress' : 'Steady Progression'}
        </Text>
        <Text style={nextWeekIsWarn ? styles.adviceTextWarning : styles.adviceText}>
          {nextWeekAdvice}
        </Text>
      </View>

      <View style={missionBrief.status === 'red' ? styles.recoveryCardWarn : styles.performanceCard}>
        <Text style={styles.cardKicker}>MISSION BRIEF</Text>
        <Text style={missionBrief.status === 'red' ? styles.recoveryTitleWarn : styles.goalTitle}>{missionBrief.title}</Text>
        <Text style={styles.goalAction}>{missionBrief.primaryAction}</Text>
      </View>

      <View style={forecast.status === 'red' ? styles.recoveryCardWarn : styles.performanceCard}>
        <Text style={styles.cardKicker}>READINESS FORECAST</Text>
        <Text style={forecast.status === 'red' ? styles.recoveryTitleWarn : styles.goalTitle}>{forecast.label}</Text>
        <Text style={styles.goalAction}>{forecast.summary}</Text>
      </View>

      <View style={adherence.status === 'off-track' ? styles.recoveryCardWarn : styles.performanceCard}>
        <Text style={styles.cardKicker}>PLAN ADHERENCE</Text>
        <Text style={adherence.status === 'off-track' ? styles.recoveryTitleWarn : styles.goalTitle}>
          {adherence.label} {adherence.status === 'no-data' ? '' : `· ${adherence.score}%`}
        </Text>
        <Text style={styles.goalAction}>{adherence.nextAction}</Text>
      </View>

      <View style={styles.performanceCard}>
        <Text style={styles.cardKicker}>TRAINING INSIGHTS</Text>
        {insights.slice(0, 3).map((insight) => (
          <Text key={insight.title} style={styles.goalAction}>{insight.title}: {insight.message}</Text>
        ))}
      </View>

      <View style={styles.performanceCard}>
        <Text style={styles.cardKicker}>MILESTONES</Text>
        <Text style={styles.goalTitle}>{earnedMilestones.length} / {milestones.length} earned</Text>
        <Text style={styles.goalAction}>
          {nextMilestone ? `Next: ${nextMilestone.title} (${nextMilestone.progress}%)` : 'All current milestones earned.'}
        </Text>
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.cardKicker}>GOALS</Text>
        <Text style={styles.goalTitle}>{goalSummary.active} active / {goalSummary.complete} complete</Text>
        <Text style={styles.goalProgress}>{goalSummary.averageProgress > 0 ? `${goalSummary.averageProgress}% average measured progress` : 'No measured progress yet'}</Text>
        <Text style={styles.adviceText}>{goalSummary.message}</Text>
        <Text style={styles.goalAction}>{goalAction.title}: {goalAction.action}</Text>
        {goalSuggestions.length > 0 ? (
          <Text style={styles.goalAction}>Suggested: {goalSuggestions[0].title} ({goalSuggestions[0].reason})</Text>
        ) : null}
      </View>

      <View style={styles.performanceCard}>
        <Text style={styles.cardKicker}>PERFORMANCE SNAPSHOT</Text>
        <Text style={styles.goalTitle}>{performance.consistencyLabel}</Text>
        <Text style={styles.goalAction}>{performance.highlight}</Text>
        <Text style={styles.adviceText}>
          Best ruck {performance.bestRuckDistanceKm > 0 ? `${performance.bestRuckDistanceKm} km` : '--'} · Best run {performance.bestRunDistanceKm > 0 ? `${performance.bestRunDistanceKm} km` : '--'} · Longest {performance.longestSessionMinutes > 0 ? `${performance.longestSessionMinutes} min` : '--'}
        </Text>
      </View>

      <View style={styles.performanceCard}>
        <Text style={styles.cardKicker}>DFIFT SNAPSHOT</Text>
        <Text style={styles.goalTitle}>{dfiftSnapshot.passedEvents} / {dfiftSnapshot.rows.length} passing</Text>
        <Text style={styles.goalAction}>
          {dfiftSnapshot.weakPoint ? `Weak point: ${dfiftSnapshot.weakPoint.label}. ` : ''}{dfiftSnapshot.recommendation}
        </Text>
      </View>

      <View style={recoveryDebt.status === 'red' ? styles.recoveryCardWarn : styles.performanceCard}>
        <Text style={styles.cardKicker}>RECOVERY SNAPSHOT</Text>
        <Text style={recoveryDebt.status === 'red' ? styles.recoveryTitleWarn : styles.goalTitle}>
          {recoveryDebt.label} {recoveryDebt.status === 'no-data' ? '' : `· ${recoveryDebt.score}%`}
        </Text>
        <Text style={styles.goalAction}>{recoveryDebt.action}</Text>
      </View>

      <View style={injuryWatch.status === 'high' ? styles.recoveryCardWarn : styles.performanceCard}>
        <Text style={styles.cardKicker}>INJURY WATCH</Text>
        <Text style={injuryWatch.status === 'high' ? styles.recoveryTitleWarn : styles.goalTitle}>
          {injuryWatch.label} {injuryWatch.status === 'no-data' ? '' : `· ${injuryWatch.score}%`}
        </Text>
        <Text style={styles.goalAction}>{injuryWatch.action}</Text>
      </View>

      <View style={trainingBalance.status === 'overload' ? styles.recoveryCardWarn : styles.performanceCard}>
        <Text style={styles.cardKicker}>TRAINING BALANCE</Text>
        <Text style={trainingBalance.status === 'overload' ? styles.recoveryTitleWarn : styles.goalTitle}>
          {trainingBalance.label} {trainingBalance.status === 'no-data' ? '' : `· ${trainingBalance.score}%`}
        </Text>
        <Text style={styles.goalAction}>{trainingBalance.nextFocus}</Text>
      </View>

      <View style={styles.exportCard}>
        <View style={styles.exportHeader}>
          <View style={styles.exportHeaderText}>
            <Text style={styles.cardKicker}>EXPORT REPORT</Text>
            <Text style={styles.exportTitle}>Copy-ready weekly report</Text>
          </View>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareReport}
            accessibilityRole="button"
            accessibilityLabel="Share weekly report"
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        <Text selectable style={styles.reportText}>{report.text}</Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add-log')}
        accessibilityRole="button"
        accessibilityLabel="Add training log"
      >
        <Text style={styles.addButtonText}>Add Training Log</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgScreen },
  content: { padding: 18, paddingBottom: 50, gap: 14 },
  header: { gap: 6 },
  backButton: { borderWidth: 1, borderColor: T.borderBack, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 6 },
  backButtonText: { color: T.textBright, fontSize: 13, fontWeight: '900' },
  kicker: { color: T.textAccent, fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: T.textWhite, fontSize: 32, fontWeight: '900' },
  subtitle: { color: T.textMuted, fontSize: 14, lineHeight: 21 },

  thisWeekCard: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderAccent, gap: 12 },
  lastWeekCard: { backgroundColor: T.bgPanelDark, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderSubtle, gap: 12 },
  weekCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardKicker: { color: T.textAccent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  weekRange: { color: T.textWhite, fontSize: 16, fontWeight: '900', marginTop: 3 },
  totalBadge: { backgroundColor: T.bgBadge, borderWidth: 1, borderColor: T.borderAccent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  totalBadgeSecondary: { backgroundColor: T.bgPanel, borderWidth: 1, borderColor: T.borderSubtle, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  totalBadgeText: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  totalBadgeTextSecondary: { color: T.textMutedAccent, fontSize: 12, fontWeight: '800' },
  noDataText: { color: T.textDim, fontSize: 13, fontWeight: '800' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: T.bgDeep, borderWidth: 1, borderColor: T.borderAccent, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillWarning: { backgroundColor: T.bgWarnBadge, borderWidth: 1, borderColor: T.borderWarn, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  pillTextWarning: { color: T.textWarn, fontSize: 12, fontWeight: '900' },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 3 },
  statNumber: { color: T.textWhite, fontSize: 22, fontWeight: '900' },
  statNumberWarning: { color: T.textWarn, fontSize: 22, fontWeight: '900' },
  statLabel: { color: T.textMutedAccent, fontSize: 11, fontWeight: '800' },

  healthCard: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderAccent, gap: 10 },
  healthCardWarning: { backgroundColor: T.bgWarn, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderWarn, gap: 10 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  healthScore: { color: T.textWhite, fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthScoreWarning: { color: T.textWarn, fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthPill: { backgroundColor: T.bgDeep, borderRadius: 999, borderWidth: 1, borderColor: T.borderAccent, paddingHorizontal: 12, paddingVertical: 8 },
  healthPillWarning: { backgroundColor: T.bgWarnBadge, borderRadius: 999, borderWidth: 1, borderColor: T.borderWarn, paddingHorizontal: 12, paddingVertical: 8 },
  healthPillText: { color: T.textAccent, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthPillTextWarning: { color: T.textWarn, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthMessage: { color: T.textMuted, fontSize: 13, lineHeight: 19 },
  healthMessageWarning: { color: T.textWarn, fontSize: 13, lineHeight: 19, fontWeight: '800' },

  adviceCard: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderSubtle, gap: 8 },
  adviceCardGood: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderAccent, gap: 8 },
  adviceCardWarning: { backgroundColor: T.bgWarn, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderWarn, gap: 8 },
  adviceTitle: { color: T.textWhite, fontSize: 20, fontWeight: '900' },
  adviceTitleGood: { color: T.textAccent, fontSize: 20, fontWeight: '900' },
  adviceTitleWarning: { color: T.textWarn, fontSize: 20, fontWeight: '900' },
  adviceText: { color: T.textMuted, fontSize: 13, lineHeight: 20 },
  adviceTextWarning: { color: T.textWarnMuted, fontSize: 13, lineHeight: 20 },
  goalCard: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderAccent, gap: 8 },
  goalTitle: { color: T.textWhite, fontSize: 20, fontWeight: '900' },
  goalProgress: { color: T.textAccent, fontSize: 13, fontWeight: '900' },
  goalAction: { color: T.textBodyAlt, fontSize: 13, lineHeight: 20, fontWeight: '800' },
  performanceCard: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderSubtle, gap: 8 },
  recoveryCardWarn: { backgroundColor: T.bgWarn, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderWarn, gap: 8 },
  recoveryTitleWarn: { color: T.textWarn, fontSize: 20, fontWeight: '900' },

  exportCard: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderSubtle, gap: 12 },
  exportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  exportHeaderText: { flex: 1 },
  exportTitle: { color: T.textWhite, fontSize: 20, fontWeight: '900', marginTop: 3 },
  shareButton: { backgroundColor: T.textAccent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  shareButtonText: { color: T.bgScreen, fontSize: 13, fontWeight: '900' },
  reportText: { color: T.textBodyAlt, backgroundColor: T.bgScreen, borderRadius: 14, borderWidth: 1, borderColor: T.borderField, padding: 12, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },

  addButton: { backgroundColor: T.textAccent, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  addButtonText: { color: T.bgScreen, fontSize: 15, fontWeight: '900' },
});
