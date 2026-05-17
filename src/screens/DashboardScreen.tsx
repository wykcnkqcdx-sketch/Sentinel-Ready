import WeeklyLoadRiskCard from '@/src/components/log/WeeklyLoadRiskCard';
import AlertCard from '@/src/components/ui/AlertCard';
import MissionStat from '@/src/components/ui/MissionStat';
import SentinelCard from '@/src/components/ui/SentinelCard';
import SparkLine from '@/src/components/charts/SparkLine';
import { calculateReadinessPercentage, useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildPlanAdherence } from '@/src/utils/adherenceUtils';
import { buildTrainingBalance } from '@/src/utils/balanceUtils';
import { weeklyLoadSeries } from '@/src/utils/chartDataUtils';
import { buildInjuryWatch } from '@/src/utils/injuryWatchUtils';
import { buildTrainingInsights } from '@/src/utils/insightUtils';
import { buildMilestones, getEarnedMilestones, getNextMilestone } from '@/src/utils/milestoneUtils';
import { buildMissionBrief } from '@/src/utils/missionBriefUtils';
import { buildReadinessForecast } from '@/src/utils/readinessForecastUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import { buildGoalAction, buildGoalSummary, buildPerformanceSnapshot, buildReadinessTrend, buildWeekSummary, buildWeeklyLoadRisk, getReadinessNumber } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { DimensionValue, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKLY_TARGET = 4;

function getWeeklyLoadStatus(total: number, fatigueWatch: number, avgReadiness: number) {
  if (fatigueWatch >= 2) return { label: 'Fatigue Risk', isWarn: true };
  if (total === 0) return { label: 'No Sessions', isWarn: false };
  if (total <= 2) return { label: 'Light Week', isWarn: false };
  if (total >= 5 && avgReadiness > 0 && avgReadiness < 6) return { label: 'Heavy Load', isWarn: true };
  if (total >= 5) return { label: 'Heavy Load', isWarn: false };
  return { label: 'On Track', isWarn: false };
}

function getStrengthStatus(strengthLogs: ReturnType<typeof useTraining>['logs']) {
  if (strengthLogs.length < 2) return strengthLogs.length === 1 ? 'Baseline' : 'No data';
  const latest = getReadinessNumber(strengthLogs[0].readiness);
  const previous = getReadinessNumber(strengthLogs[1].readiness);
  if (latest > previous) return 'Improving';
  if (latest < previous) return 'Dropping';
  return 'Stable';
}

function getEnduranceStatus(enduranceLogs: ReturnType<typeof useTraining>['logs']) {
  if (enduranceLogs.length < 2) return enduranceLogs.length === 1 ? 'Baseline' : 'No data';
  const latest = getReadinessNumber(enduranceLogs[0].readiness);
  const previous = getReadinessNumber(enduranceLogs[1].readiness);
  if (latest > previous) return 'Improving';
  if (latest < previous) return 'Dropping';
  return 'Stable';
}

function getRecoveryStatus(recentLogs: ReturnType<typeof useTraining>['logs']) {
  const fatigue = recentLogs.filter((l) => getReadinessNumber(l.readiness) <= 5).length;
  if (recentLogs.length === 0) return 'No data';
  if (fatigue >= 3) return 'Poor';
  if (fatigue >= 1) return 'Moderate';
  return 'Good';
}

export default function DashboardScreen() {
  const { logs, goals, isLoading } = useTraining();
  const { injuryNotes } = useUser();
  const router = useRouter();

  const readinessPercentage = useMemo(() => calculateReadinessPercentage(logs), [logs]);
  const thisWeek = useMemo(() => buildWeekSummary(logs, 0), [logs]);
  const trend = useMemo(() => buildReadinessTrend(logs), [logs]);
  const weeklyLoadRisk = useMemo(() => buildWeeklyLoadRisk(logs), [logs]);
  const goalSummary = useMemo(() => buildGoalSummary(goals), [goals]);
  const goalAction = useMemo(() => buildGoalAction(goals, logs), [goals, logs]);
  const performance = useMemo(() => buildPerformanceSnapshot(logs), [logs]);
  const recoveryDebt = useMemo(() => buildRecoveryDebt(logs, injuryNotes), [logs, injuryNotes]);
  const trainingBalance = useMemo(() => buildTrainingBalance(logs), [logs]);
  const missionBrief = useMemo(() => buildMissionBrief(logs, goals, { injuryNotes }), [logs, goals, injuryNotes]);
  const forecast = useMemo(() => buildReadinessForecast(logs, goals, { injuryNotes }), [logs, goals, injuryNotes]);
  const insights = useMemo(() => buildTrainingInsights(logs), [logs]);
  const adherence = useMemo(() => buildPlanAdherence(logs, goals, { injuryNotes }), [logs, goals, injuryNotes]);
  const injuryWatch = useMemo(() => buildInjuryWatch(logs, injuryNotes), [logs, injuryNotes]);
  const milestones = useMemo(() => buildMilestones(logs, goals), [logs, goals]);
  const earnedMilestones = useMemo(() => getEarnedMilestones(milestones), [milestones]);
  const nextMilestone = useMemo(() => getNextMilestone(milestones), [milestones]);
  const topInsights = useMemo(() => insights.slice(0, 3), [insights]);
  const topMilestones = useMemo(() => milestones.slice(0, 4), [milestones]);

  const weeklyLoadData = useMemo(() => weeklyLoadSeries(logs, 8), [logs]);
  const [showFullReport, setShowFullReport] = useState(false);

  const weekAvgReadiness = Number(thisWeek.averageReadiness);
  const weekLoadStatus = useMemo(() => getWeeklyLoadStatus(thisWeek.total, thisWeek.fatigueWatch, weekAvgReadiness), [thisWeek.total, thisWeek.fatigueWatch, weekAvgReadiness]);
  const weekProgress = Math.min(thisWeek.total / WEEKLY_TARGET, 1);

  const readinessStatus = useMemo(() => {
    if (readinessPercentage === 0) {
      return { text: 'NO DATA', bg: '#1a1a1a', textCol: '#cccccc', prog: '#333333', msg: 'Log a session to calculate your readiness score.' };
    }
    if (readinessPercentage < 60) {
      return { text: 'RED', bg: '#3d1414', textCol: '#ffbfbf', prog: '#d96262', msg: 'High fatigue detected. Prioritise recovery and rest today.' };
    }
    if (readinessPercentage < 75) {
      return { text: 'AMBER', bg: '#3d3014', textCol: '#ffdfbf', prog: '#d9a662', msg: 'Moderate fatigue. Keep training volume controlled.' };
    }
    return { text: 'GREEN', bg: '#143d22', textCol: '#bfffcf', prog: '#62d982', msg: 'Fit for training. Monitor fatigue and recovery.' };
  }, [readinessPercentage]);

  const { 
    latestRuck, 
    trendChartData, 
    strengthLogs, 
    enduranceLogs, 
    recentLogs,
    ruckVal,
    strengthVal,
    cardioVal,
    recoveryVal
  } = useMemo(() => {
    let ruck: typeof logs[0] | undefined;
    let strength: typeof logs[0] | undefined;
    let run: typeof logs[0] | undefined;
    let recovery: typeof logs[0] | undefined;
    const recentTrendLogs: typeof logs = [];
    const strengthLogsList: typeof logs = [];
    const enduranceLogsList: typeof logs = [];
    const recentLogsList: typeof logs = [];

    for (const log of logs) {
      if (recentLogsList.length < 5) recentLogsList.push(log);
      if (strengthLogsList.length < 2 && log.category === 'Strength') strengthLogsList.push(log);
      if (enduranceLogsList.length < 2 && (log.category === 'Ruck' || log.category === 'Run')) enduranceLogsList.push(log);

      if (!ruck && log.category === 'Ruck') ruck = log;
      if (!strength && log.category === 'Strength') strength = log;
      if (!run && log.category === 'Run') run = log;
      if (!recovery && log.category === 'Recovery') recovery = log;

      if (recentTrendLogs.length < 7 && getReadinessNumber(log.readiness) > 0) {
        recentTrendLogs.push(log);
      }

      // Once all latest specific logs are found and we have 7 trend logs, break the loop early
      if (
        ruck && strength && run && recovery && 
        recentTrendLogs.length === 7 && 
        strengthLogsList.length === 2 && 
        enduranceLogsList.length === 2 && 
        recentLogsList.length === 5
      ) {
        break;
      }
    }

    const chartData = recentTrendLogs.reverse().map((log) => {
      const score = getReadinessNumber(log.readiness);
      const heightPercentage: DimensionValue = `${(score / 10) * 100}%`;
      let barColor = '#62d982';
      if (score < 6) barColor = '#d96262';
      else if (score < 8) barColor = '#d9a662';

      const dateLabel = log.date.substring(5, 10).replace('-', '/');
      return { id: log.id, score, heightPercentage, barColor, dateLabel };
    });

    return {
      latestRuck: ruck,
      trendChartData: chartData,
      strengthLogs: strengthLogsList,
      enduranceLogs: enduranceLogsList,
      recentLogs: recentLogsList,
      ruckVal: ruck ? ruck.distanceLoad.split('-')[0].trim() || 'Logged' : 'N/A',
      strengthVal: strength ? `Score: ${strength.readiness}` : 'N/A',
      cardioVal: run ? run.distanceLoad.split('-')[0].trim() || 'Logged' : 'N/A',
      recoveryVal: recovery ? `Score: ${recovery.readiness}` : 'N/A',
    };
  }, [logs]);

  const strengthStatus = useMemo(() => getStrengthStatus(strengthLogs), [strengthLogs]);
  const enduranceStatus = useMemo(() => getEnduranceStatus(enduranceLogs), [enduranceLogs]);
  const recoveryStatus = useMemo(() => getRecoveryStatus(recentLogs), [recentLogs]);

  const navigateToGoals = useCallback(() => router.push('/goals'), [router]);
  const navigateToStrava = useCallback(() => router.push('/strava'), [router]);
  const navigateToAtak = useCallback(() => router.push('/atak'), [router]);
  const navigateToGpx = useCallback(() => router.push('/gpx'), [router]);
  const navigateToOfflineMap = useCallback(() => router.push('/offline-map'), [router]);
  const navigateToNotifications = useCallback(() => router.push('/notifications'), [router]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>Operational Fitness Dashboard</Text>
        <Text style={styles.subtitle}>
          Readiness overview for strength, endurance, ruck performance and recovery.
        </Text>
      </View>

      <SentinelCard title="Readiness Status" variant="success">
        <View style={styles.readinessRow}>
          <View>
            <Text style={styles.metric}>{readinessPercentage > 0 ? `${readinessPercentage}%` : '--'}</Text>
            <Text style={styles.cardText}>{readinessStatus.msg}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: readinessStatus.bg }]}>
            <Text style={[styles.statusBadgeText, { color: readinessStatus.textCol }]}>{readinessStatus.text}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${readinessPercentage}%`, backgroundColor: readinessStatus.prog }]} />
        </View>

        <View style={styles.readinessDetails}>
          <Text style={styles.detailText}>Strength: {strengthStatus}</Text>
          <Text style={styles.detailText}>Endurance: {enduranceStatus}</Text>
          <Text style={styles.detailText}>Recovery: {recoveryStatus}</Text>
        </View>
      </SentinelCard>

      <SentinelCard title="Mission Brief" variant={missionBrief.status === 'red' ? 'warning' : missionBrief.status === 'green' ? 'success' : 'default'}>
        <View style={styles.briefHeader}>
          <View style={styles.briefTitleBlock}>
            <Text style={missionBrief.status === 'red' ? styles.briefTitleWarn : styles.briefTitle}>{missionBrief.title}</Text>
            <Text style={styles.cardText}>{missionBrief.summary}</Text>
          </View>
          <View style={missionBrief.status === 'red' ? styles.briefBadgeWarn : styles.briefBadge}>
            <Text style={missionBrief.status === 'red' ? styles.briefBadgeTextWarn : styles.briefBadgeText}>
              {missionBrief.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.briefActionBox}>
          <Text style={styles.briefActionLabel}>Primary action</Text>
          <Text style={styles.briefActionText}>{missionBrief.primaryAction}</Text>
        </View>
        <Text style={styles.briefSecondary}>{missionBrief.secondaryAction}</Text>
      </SentinelCard>

      <WeeklyLoadRiskCard risk={weeklyLoadRisk} />

      <TouchableOpacity
        style={styles.reportToggle}
        onPress={() => setShowFullReport((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={showFullReport ? 'Collapse full report' : 'View full report'}
      >
        <Text style={styles.reportToggleText}>
          {showFullReport ? '▲  COLLAPSE REPORT' : '▼  VIEW FULL REPORT'}
        </Text>
      </TouchableOpacity>

      {showFullReport && <>

      <SentinelCard title="Recovery Debt" variant={recoveryDebt.status === 'red' ? 'warning' : 'default'}>
        <View style={styles.recoveryDebtRow}>
          <View>
            <Text style={recoveryDebt.status === 'red' ? styles.recoveryDebtScoreWarn : styles.recoveryDebtScore}>
              {recoveryDebt.status === 'no-data' ? '--' : `${recoveryDebt.score}%`}
            </Text>
            <Text style={styles.cardText}>{recoveryDebt.message}</Text>
          </View>
          <View style={recoveryDebt.status === 'red' ? styles.recoveryDebtBadgeWarn : styles.recoveryDebtBadge}>
            <Text style={recoveryDebt.status === 'red' ? styles.recoveryDebtBadgeTextWarn : styles.recoveryDebtBadgeText}>
              {recoveryDebt.label}
            </Text>
          </View>
        </View>
        <Text style={styles.recoveryDebtAction}>{recoveryDebt.action}</Text>
      </SentinelCard>

      <SentinelCard title="Injury Watch" variant={injuryWatch.status === 'high' ? 'warning' : 'default'}>
        <View style={styles.injuryHeader}>
          <View>
            <Text style={injuryWatch.status === 'high' ? styles.injuryScoreWarn : styles.injuryScore}>
              {injuryWatch.status === 'no-data' ? '--' : `${injuryWatch.score}%`}
            </Text>
            <Text style={styles.cardText}>{injuryWatch.message}</Text>
          </View>
          <View style={injuryWatch.status === 'high' ? styles.injuryBadgeWarn : styles.injuryBadge}>
            <Text style={injuryWatch.status === 'high' ? styles.injuryBadgeTextWarn : styles.injuryBadgeText}>
              {injuryWatch.label}
            </Text>
          </View>
        </View>
        <Text style={styles.injuryAction}>{injuryWatch.action}</Text>
      </SentinelCard>

      <SentinelCard title="Training Balance" variant={trainingBalance.status === 'overload' ? 'warning' : 'default'}>
        <View style={styles.balanceHeader}>
          <View>
            <Text style={trainingBalance.status === 'overload' ? styles.balanceScoreWarn : styles.balanceScore}>
              {trainingBalance.status === 'no-data' ? '--' : `${trainingBalance.score}%`}
            </Text>
            <Text style={styles.cardText}>{trainingBalance.message}</Text>
          </View>
          <View style={trainingBalance.status === 'overload' ? styles.balanceBadgeWarn : styles.balanceBadge}>
            <Text style={trainingBalance.status === 'overload' ? styles.balanceBadgeTextWarn : styles.balanceBadgeText}>
              {trainingBalance.label}
            </Text>
          </View>
        </View>
        <Text style={styles.balanceFocus}>{trainingBalance.nextFocus}</Text>
      </SentinelCard>

      <SentinelCard title="Readiness Forecast" variant={forecast.status === 'red' ? 'warning' : forecast.status === 'green' ? 'success' : 'default'}>
        <View style={styles.forecastHeader}>
          <Text style={forecast.status === 'red' ? styles.forecastTitleWarn : styles.forecastTitle}>{forecast.label}</Text>
          <Text style={styles.cardText}>{forecast.summary}</Text>
        </View>
        <View style={styles.forecastRow}>
          {forecast.days.map((day) => (
            <View key={day.day} style={styles.forecastDay}>
              <Text style={styles.forecastDayLabel}>{day.day.slice(0, 3)}</Text>
              <View style={
                day.status === 'red' ? styles.forecastDotRed
                : day.status === 'amber' ? styles.forecastDotAmber
                : styles.forecastDotGreen
              } />
            </View>
          ))}
        </View>
      </SentinelCard>

      <SentinelCard title="Plan Adherence" variant={adherence.status === 'off-track' ? 'warning' : 'default'}>
        <View style={styles.adherenceHeader}>
          <View>
            <Text style={adherence.status === 'off-track' ? styles.adherenceScoreWarn : styles.adherenceScore}>
              {adherence.status === 'no-data' ? '--' : `${adherence.score}%`}
            </Text>
            <Text style={styles.cardText}>{adherence.message}</Text>
          </View>
          <View style={adherence.status === 'off-track' ? styles.adherenceBadgeWarn : styles.adherenceBadge}>
            <Text style={adherence.status === 'off-track' ? styles.adherenceBadgeTextWarn : styles.adherenceBadgeText}>
              {adherence.label}
            </Text>
          </View>
        </View>
        <Text style={styles.adherenceAction}>{adherence.nextAction}</Text>
        {adherence.missing.length > 0 ? (
          <Text style={styles.adherenceMissing}>Missing: {adherence.missing.join(', ')}</Text>
        ) : null}
      </SentinelCard>

      <SentinelCard title="Training Insights">
        {topInsights.map((insight) => (
          <View key={insight.title} style={
            insight.severity === 'warning' ? styles.insightItemWarn
            : insight.severity === 'good' ? styles.insightItemGood
            : styles.insightItem
          }>
            <Text style={insight.severity === 'warning' ? styles.insightTitleWarn : styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightText}>{insight.message}</Text>
          </View>
        ))}
      </SentinelCard>

      <SentinelCard title="Milestones">
        <View style={styles.milestoneHeader}>
          <View>
            <Text style={styles.milestoneCount}>{earnedMilestones.length} / {milestones.length}</Text>
            <Text style={styles.cardText}>Milestones earned</Text>
          </View>
          {nextMilestone ? (
            <View style={styles.milestoneNext}>
              <Text style={styles.milestoneNextLabel}>NEXT</Text>
              <Text style={styles.milestoneNextTitle}>{nextMilestone.title}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.milestoneRow}>
          {topMilestones.map((milestone) => (
            <View key={milestone.id} style={milestone.earned ? styles.milestonePillEarned : styles.milestonePill}>
              <Text style={milestone.earned ? styles.milestonePillTextEarned : styles.milestonePillText}>
                {milestone.title}
              </Text>
            </View>
          ))}
        </View>
      </SentinelCard>

      <SentinelCard title="Performance Snapshot">
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{performance.bestRuckDistanceKm > 0 ? `${performance.bestRuckDistanceKm} km` : '--'}</Text>
            <Text style={styles.performanceLabel}>Best Ruck</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{performance.bestRunDistanceKm > 0 ? `${performance.bestRunDistanceKm} km` : '--'}</Text>
            <Text style={styles.performanceLabel}>Best Run</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{performance.longestSessionMinutes > 0 ? `${performance.longestSessionMinutes}m` : '--'}</Text>
            <Text style={styles.performanceLabel}>Longest</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{performance.consistencyLabel}</Text>
            <Text style={styles.performanceLabel}>Consistency</Text>
          </View>
        </View>
        <Text style={styles.cardText}>{performance.highlight}</Text>
      </SentinelCard>

      <SentinelCard title="Goal Tracking">
        <View style={styles.goalHeader}>
          <View style={styles.goalStat}>
            <Text style={styles.goalNumber}>{goalSummary.active}</Text>
            <Text style={styles.goalLabel}>Active Goals</Text>
          </View>
          <View style={styles.goalStat}>
            <Text style={styles.goalNumberComplete}>{goalSummary.complete}</Text>
            <Text style={styles.goalLabel}>Complete</Text>
          </View>
          <View style={styles.goalStat}>
            <Text style={styles.goalNumber}>{goalSummary.averageProgress > 0 ? `${goalSummary.averageProgress}%` : '--'}</Text>
            <Text style={styles.goalLabel}>Measured</Text>
          </View>
          <TouchableOpacity style={styles.goalButton} onPress={navigateToGoals}>
            <Text style={styles.goalButtonText}>Manage</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${goalSummary.averageProgress}%` }]} />
        </View>
        <Text style={styles.cardText}>{goalSummary.message}</Text>
        <View style={goalAction.status === 'warning' ? styles.goalActionWarn : styles.goalAction}>
          <Text style={goalAction.status === 'warning' ? styles.goalActionTitleWarn : styles.goalActionTitle}>{goalAction.title}</Text>
          <Text style={styles.goalActionText}>{goalAction.action}</Text>
        </View>
      </SentinelCard>

      <SentinelCard title="Readiness Trend">
        <View style={styles.chartContainer}>
          {trendChartData.length > 0 ? (
            trendChartData.map((data) => (
                <View key={data.id} style={styles.barColumn}>
                  <Text style={styles.barScore}>{data.score}</Text>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: data.heightPercentage, backgroundColor: data.barColor }]} />
                  </View>
                  <Text style={styles.barLabel}>{data.dateLabel}</Text>
                </View>
            ))
          ) : (
            <Text style={styles.cardText}>No readiness data available.</Text>
          )}
        </View>
      </SentinelCard>

      </>}

      <View style={styles.grid}>
        <MissionStat label="Ruck" value={ruckVal} status={ruckVal !== 'N/A' ? 'Latest session' : 'Awaiting data'} />
        <MissionStat label="Strength" value={strengthVal} status={strengthVal !== 'N/A' ? 'Force output' : 'Awaiting data'} />
        <MissionStat label="Cardio" value={cardioVal} status={cardioVal !== 'N/A' ? 'Aerobic base' : 'Awaiting data'} />
        <MissionStat label="Recovery" value={recoveryVal} status={recoveryVal !== 'N/A' ? 'Latest session' : 'Awaiting data'} />
      </View>

      <View style={weekLoadStatus.isWarn ? styles.loadCardWarn : styles.loadCard}>
        <View style={styles.loadHeader}>
          <View>
            <Text style={styles.loadKicker}>{"THIS WEEK'S LOAD"}</Text>
            <Text style={weekLoadStatus.isWarn ? styles.loadCountWarn : styles.loadCount}>
              {thisWeek.total} / {WEEKLY_TARGET} sessions
            </Text>
          </View>
          <View style={weekLoadStatus.isWarn ? styles.loadBadgeWarn : styles.loadBadge}>
            <Text style={weekLoadStatus.isWarn ? styles.loadBadgeTextWarn : styles.loadBadgeText}>
              {weekLoadStatus.label}
            </Text>
          </View>
        </View>

        <View style={styles.loadTrack}>
          <View style={[
            styles.loadFill,
            {
              width: `${weekProgress * 100}%`,
              backgroundColor: weekLoadStatus.isWarn ? '#ffb86b' : thisWeek.total >= WEEKLY_TARGET ? '#62d982' : '#4a9e6a',
            },
          ]} />
        </View>

        <SparkLine data={weeklyLoadData} width={240} height={28} color="#91e6a3" />

        {thisWeek.total > 0 ? (
          <View style={styles.pillRow}>
            {thisWeek.ruck > 0 && <View style={styles.pill}><Text style={styles.pillText}>Ruck {thisWeek.ruck}</Text></View>}
            {thisWeek.strength > 0 && <View style={styles.pill}><Text style={styles.pillText}>Strength {thisWeek.strength}</Text></View>}
            {thisWeek.run > 0 && <View style={styles.pill}><Text style={styles.pillText}>Run {thisWeek.run}</Text></View>}
            {thisWeek.mobility > 0 && <View style={styles.pill}><Text style={styles.pillText}>Mobility {thisWeek.mobility}</Text></View>}
            {thisWeek.test > 0 && <View style={styles.pill}><Text style={styles.pillText}>Test {thisWeek.test}</Text></View>}
            {thisWeek.recovery > 0 && <View style={styles.pill}><Text style={styles.pillText}>Recovery {thisWeek.recovery}</Text></View>}
          </View>
        ) : (
          <Text style={styles.loadNoData}>No sessions logged this week. Aim for {WEEKLY_TARGET} sessions.</Text>
        )}

        {thisWeek.fatigueWatch > 0 ? (
          <Text style={styles.loadWarnText}>
            {thisWeek.fatigueWatch} fatigue watch {thisWeek.fatigueWatch === 1 ? 'session' : 'sessions'} this week. Consider a recovery day.
          </Text>
        ) : thisWeek.averageReadiness !== '0.0' ? (
          <Text style={styles.loadSubText}>
            Avg readiness {thisWeek.averageReadiness}/10 · {trend.label} trend
          </Text>
        ) : null}
      </View>

      <View style={styles.connectSection}>
        <Text style={styles.connectKicker}>CONNECT</Text>
        <View style={styles.connectRow}>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={navigateToStrava}
            accessibilityRole="button"
            accessibilityLabel="Open Strava integration"
          >
            <View style={styles.connectPillDot} />
            <Text style={styles.connectPillText}>Strava</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={navigateToAtak}
            accessibilityRole="button"
            accessibilityLabel="Open ATAK integration"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotAtak]} />
            <Text style={styles.connectPillText}>ATAK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={navigateToGpx}
            accessibilityRole="button"
            accessibilityLabel="Open GPX Files"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotGpx]} />
            <Text style={styles.connectPillText}>GPX Files</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={() => router.push('/check-in')}
            accessibilityRole="button"
            accessibilityLabel="Log today's check-in"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotCheckin]} />
            <Text style={styles.connectPillText}>Check-in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={navigateToOfflineMap}
            accessibilityRole="button"
            accessibilityLabel="Open offline map tile cache"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotOffline]} />
            <Text style={styles.connectPillText}>Offline Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={navigateToNotifications}
            accessibilityRole="button"
            accessibilityLabel="Open notification settings"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotAlerts]} />
            <Text style={styles.connectPillText}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectPill}
            onPress={() => router.push('/progress')}
            accessibilityRole="button"
            accessibilityLabel="View progress charts"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotProgress]} />
            <Text style={styles.connectPillText}>Progress</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mission Alerts</Text>
          <Text style={styles.sectionTag}>WATCH</Text>
        </View>

        {readinessPercentage > 0 && readinessPercentage < 60 ? (
          <AlertCard
            type="alert"
            title="Recovery requires attention"
            description="Keep the next session controlled if sleep, soreness or resting fatigue worsens."
          />
        ) : null}

        {trend.status === 'warning' ? (
          <AlertCard
            type="alert"
            title="Readiness dropping"
            description="Readiness has fallen between your last two sessions. Reduce load and prioritise recovery before adding intensity."
          />
        ) : null}

        {thisWeek.fatigueWatch >= 2 ? (
          <AlertCard
            type="alert"
            title="Fatigue watch this week"
            description={`${thisWeek.fatigueWatch} sessions this week logged with readiness of 5 or below. Consider a rest day or recovery session.`}
          />
        ) : null}

        {latestRuck && getReadinessNumber(latestRuck.readiness) >= 7 && readinessPercentage >= 70 ? (
          <AlertCard
            type="info"
            title="Ruck progression available"
            description="Readiness is solid. Increase distance or load only if the previous ruck was completed without pain."
          />
        ) : null}

        {trend.status === 'good' && thisWeek.fatigueWatch === 0 && thisWeek.total >= 3 ? (
          <AlertCard
            type="info"
            title="Ready to progress"
            description="Readiness is improving and no fatigue flags this week. You can consider adding load or an extra session."
          />
        ) : null}

        {readinessPercentage === 0 && logs.length === 0 ? (
          <AlertCard
            type="info"
            title="No training data"
            description="Log your first session to start tracking readiness, load and recovery trends."
          />
        ) : null}
      </View>
    </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-log')}
        accessibilityRole="button"
        accessibilityLabel="Log a training session"
      >
        <Text style={styles.fabText}>＋  LOG SESSION</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c', position: 'relative' },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#91e6a3',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#07110c',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: { padding: 20, gap: 18, paddingBottom: 110, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  header: { gap: 10 },
  kicker: { color: '#8fbf8f', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#f2f5ef', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 15, lineHeight: 22 },
  readinessRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  metric: { color: '#ffffff', fontSize: 56, fontWeight: '900', marginTop: 8 },
  cardText: { color: '#aeb8aa', marginTop: 4, lineHeight: 20 },
  statusBadge: { backgroundColor: '#143d22', borderColor: '#46d16d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusBadgeText: { color: '#bfffcf', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  progressTrack: { height: 10, backgroundColor: '#07110c', borderRadius: 999, marginTop: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#26382c' },
  progressFill: { width: '82%', height: '100%', backgroundColor: '#62d982', borderRadius: 999 },
  readinessDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  detailText: { color: '#d8e6d4', backgroundColor: '#0b1710', borderWidth: 1, borderColor: '#213c2b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  briefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  briefTitleBlock: { flex: 1 },
  briefTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  briefTitleWarn: { color: '#ffb86b', fontSize: 22, fontWeight: '900' },
  briefBadge: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  briefBadgeWarn: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  briefBadgeText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  briefBadgeTextWarn: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
  briefActionBox: { backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 12, gap: 4, marginTop: 10 },
  briefActionLabel: { color: '#91e6a3', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  briefActionText: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  briefSecondary: { color: '#aeb8aa', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  performanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  performanceItem: { width: '47%', backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 12, gap: 3 },
  performanceValue: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  performanceLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  recoveryDebtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  recoveryDebtScore: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  recoveryDebtScoreWarn: { color: '#ffb86b', fontSize: 34, fontWeight: '900' },
  recoveryDebtBadge: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  recoveryDebtBadgeWarn: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  recoveryDebtBadgeText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  recoveryDebtBadgeTextWarn: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
  recoveryDebtAction: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  injuryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  injuryScore: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  injuryScoreWarn: { color: '#ffb86b', fontSize: 34, fontWeight: '900' },
  injuryBadge: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  injuryBadgeWarn: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  injuryBadgeText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  injuryBadgeTextWarn: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
  injuryAction: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  balanceScore: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  balanceScoreWarn: { color: '#ffb86b', fontSize: 34, fontWeight: '900' },
  balanceBadge: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  balanceBadgeWarn: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  balanceBadgeText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  balanceBadgeTextWarn: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
  balanceFocus: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  forecastHeader: { gap: 3 },
  forecastTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  forecastTitleWarn: { color: '#ffb86b', fontSize: 22, fontWeight: '900' },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  forecastDay: { alignItems: 'center', gap: 6, flex: 1 },
  forecastDayLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '900' },
  forecastDotGreen: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#91e6a3' },
  forecastDotAmber: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#f3d36b' },
  forecastDotRed: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffb86b' },
  adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  adherenceScore: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  adherenceScoreWarn: { color: '#ffb86b', fontSize: 34, fontWeight: '900' },
  adherenceBadge: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  adherenceBadgeWarn: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  adherenceBadgeText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  adherenceBadgeTextWarn: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
  adherenceAction: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  adherenceMissing: { color: '#8fbf8f', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  insightItem: { backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 12, gap: 4 },
  insightItemGood: { backgroundColor: '#102d1a', borderRadius: 14, borderWidth: 1, borderColor: '#2f6b3c', padding: 12, gap: 4 },
  insightItemWarn: { backgroundColor: '#21140b', borderRadius: 14, borderWidth: 1, borderColor: '#7a4a1f', padding: 12, gap: 4 },
  insightTitle: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  insightTitleWarn: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  insightText: { color: '#dfe8da', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  milestoneCount: { color: '#ffffff', fontSize: 28, fontWeight: '900' },
  milestoneNext: { backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 10, maxWidth: '48%' },
  milestoneNextLabel: { color: '#91e6a3', fontSize: 10, fontWeight: '900' },
  milestoneNextTitle: { color: '#dfe8da', fontSize: 12, fontWeight: '900', marginTop: 2 },
  milestoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  milestonePill: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  milestonePillEarned: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  milestonePillText: { color: '#8fbf8f', fontSize: 11, fontWeight: '900' },
  milestonePillTextEarned: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalStat: { flex: 1 },
  goalNumber: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  goalNumberComplete: { color: '#91e6a3', fontSize: 26, fontWeight: '900' },
  goalLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '800', marginTop: 2 },
  goalButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  goalButtonText: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  goalTrack: { height: 8, backgroundColor: '#07110c', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#26382c', marginTop: 12 },
  goalFill: { height: '100%', backgroundColor: '#91e6a3', borderRadius: 999 },
  goalAction: { backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 12, gap: 4, marginTop: 12 },
  goalActionWarn: { backgroundColor: '#21140b', borderRadius: 14, borderWidth: 1, borderColor: '#7a4a1f', padding: 12, gap: 4, marginTop: 12 },
  goalActionTitle: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  goalActionTitleWarn: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  goalActionText: { color: '#dfe8da', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { marginTop: 8, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#f2f5ef', fontSize: 23, fontWeight: '900' },
  sectionTag: { color: '#8fbf8f', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: '#26382c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140, marginTop: 4 },
  barColumn: { alignItems: 'center', width: 40 },
  barScore: { color: '#aeb8aa', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  barBackground: { width: 24, height: 100, backgroundColor: '#0b1710', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: '#213c2b' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '800', marginTop: 8 },

  reportToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a2e1f',
    backgroundColor: '#0a170e',
  },
  reportToggleText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loadCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 12 },
  loadCardWarn: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 12 },
  loadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  loadKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  loadCount: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  loadCountWarn: { color: '#ffb86b', fontSize: 24, fontWeight: '900', marginTop: 4 },
  loadBadge: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loadBadgeWarn: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loadBadgeText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  loadBadgeTextWarn: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  loadTrack: { height: 8, backgroundColor: '#07110c', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#26382c' },
  loadFill: { height: '100%', borderRadius: 999 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  loadNoData: { color: '#6f7d70', fontSize: 13, fontWeight: '800' },
  loadSubText: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  loadWarnText: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },

  // Connections section
  connectSection: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#203529',
    padding: 16,
    gap: 12,
  },
  connectKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  connectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  connectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#07110c',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#203529',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  connectPillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FC4C02',
  },
  connectPillDotAtak: { backgroundColor: '#3a7bd5' },
  connectPillDotGpx: { backgroundColor: '#2f6b3c' },
  connectPillDotCheckin: { backgroundColor: '#91e6a3' },
  connectPillDotOffline: { backgroundColor: '#4ECDC4' },
  connectPillDotAlerts: { backgroundColor: '#FFB86B' },
  connectPillDotProgress: { backgroundColor: '#4a9eff' },
  connectPillText: { color: '#f2f5ef', fontSize: 13, fontWeight: '800' },
});
