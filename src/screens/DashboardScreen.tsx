import { getCategoryPalette } from '@/constants/theme';
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
      return { text: 'NO DATA', bg: '#00253D', textCol: '#8FAEC8', prog: 'rgba(255,255,255,0.2)', msg: 'Log a session to calculate your readiness score.' };
    }
    if (readinessPercentage < 60) {
      return { text: 'RED', bg: 'rgba(204,42,42,0.15)', textCol: '#FFFFFF', prog: '#CC2A2A', msg: 'High fatigue detected. Prioritise recovery and rest today.' };
    }
    if (readinessPercentage < 75) {
      return { text: 'AMBER', bg: 'rgba(212,160,26,0.15)', textCol: '#FFFFFF', prog: '#D4A01A', msg: 'Moderate fatigue. Keep training volume controlled.' };
    }
    return { text: 'GREEN', bg: 'rgba(94,122,47,0.15)', textCol: '#FFFFFF', prog: '#5E7A2F', msg: 'Fit for training. Monitor fatigue and recovery.' };
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
      let barColor = '#5E7A2F';
      if (score < 6) barColor = '#CC2A2A';
      else if (score < 8) barColor = '#D4A01A';

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
  const navigateToRuck = useCallback(() => router.push('/(tabs)/ruck'), [router]);

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

      {/* MAPS HERO CARD */}
      <TouchableOpacity
        style={styles.mapsHero}
        onPress={navigateToRuck}
        accessibilityRole="button"
        accessibilityLabel="Open Maps and Ruck tracking"
        activeOpacity={0.85}
      >
        <View style={styles.mapsHeroTop}>
          <View>
            <Text style={styles.mapsHeroKicker}>MAPS & RUCK</Text>
            <Text style={styles.mapsHeroTitle}>Live Ruck Tracking</Text>
          </View>
          <View style={styles.mapsHeroBadge}>
            <Text style={styles.mapsHeroBadgeText}>GPS</Text>
          </View>
        </View>
        <View style={styles.mapsHeroStats}>
          <View style={styles.mapsHeroStat}>
            <Text style={styles.mapsHeroStatValue}>{latestRuck ? ruckVal : '--'}</Text>
            <Text style={styles.mapsHeroStatLabel}>LAST RUCK</Text>
          </View>
          <View style={styles.mapsHeroStatDivider} />
          <View style={styles.mapsHeroStat}>
            <Text style={styles.mapsHeroStatValue}>{performance.bestRuckDistanceKm > 0 ? `${performance.bestRuckDistanceKm} km` : '--'}</Text>
            <Text style={styles.mapsHeroStatLabel}>BEST DISTANCE</Text>
          </View>
          <View style={styles.mapsHeroStatDivider} />
          <View style={styles.mapsHeroStat}>
            <Text style={styles.mapsHeroStatValue}>{thisWeek.ruck > 0 ? `${thisWeek.ruck}` : '0'}</Text>
            <Text style={styles.mapsHeroStatLabel}>THIS WEEK</Text>
          </View>
        </View>
        <View style={styles.mapsHeroCta}>
          <Text style={styles.mapsHeroCtaText}>▶  START RUCK  →</Text>
        </View>
      </TouchableOpacity>

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
              backgroundColor: weekLoadStatus.isWarn ? '#D4A01A' : thisWeek.total >= WEEKLY_TARGET ? '#5E7A2F' : '#B5852C',
            },
          ]} />
        </View>

        <SparkLine data={weeklyLoadData} width={240} height={28} color="#B5852C" />

        {thisWeek.total > 0 ? (
          <View style={styles.pillRow}>
            {thisWeek.ruck > 0 && <View style={[styles.pill, { backgroundColor: getCategoryPalette('Ruck').bg, borderColor: getCategoryPalette('Ruck').border }]}><Text style={[styles.pillText, { color: getCategoryPalette('Ruck').color }]}>Ruck {thisWeek.ruck}</Text></View>}
            {thisWeek.strength > 0 && <View style={[styles.pill, { backgroundColor: getCategoryPalette('Strength').bg, borderColor: getCategoryPalette('Strength').border }]}><Text style={[styles.pillText, { color: getCategoryPalette('Strength').color }]}>Strength {thisWeek.strength}</Text></View>}
            {thisWeek.run > 0 && <View style={[styles.pill, { backgroundColor: getCategoryPalette('Run').bg, borderColor: getCategoryPalette('Run').border }]}><Text style={[styles.pillText, { color: getCategoryPalette('Run').color }]}>Run {thisWeek.run}</Text></View>}
            {thisWeek.mobility > 0 && <View style={[styles.pill, { backgroundColor: getCategoryPalette('Mobility').bg, borderColor: getCategoryPalette('Mobility').border }]}><Text style={[styles.pillText, { color: getCategoryPalette('Mobility').color }]}>Mobility {thisWeek.mobility}</Text></View>}
            {thisWeek.test > 0 && <View style={[styles.pill, { backgroundColor: getCategoryPalette('Test').bg, borderColor: getCategoryPalette('Test').border }]}><Text style={[styles.pillText, { color: getCategoryPalette('Test').color }]}>Test {thisWeek.test}</Text></View>}
            {thisWeek.recovery > 0 && <View style={[styles.pill, { backgroundColor: getCategoryPalette('Recovery').bg, borderColor: getCategoryPalette('Recovery').border }]}><Text style={[styles.pillText, { color: getCategoryPalette('Recovery').color }]}>Recovery {thisWeek.recovery}</Text></View>}
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
          <TouchableOpacity
            style={styles.connectPill}
            onPress={() => router.push('/body-comp')}
            accessibilityRole="button"
            accessibilityLabel="Open body composition tracker"
          >
            <View style={[styles.connectPillDot, styles.connectPillDotBodyComp]} />
            <Text style={styles.connectPillText}>Body Comp</Text>
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
  screen: { flex: 1, backgroundColor: '#000D1A', position: 'relative' },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#B5852C',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#B5852C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: { padding: 20, gap: 18, paddingBottom: 110, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  header: { gap: 10 },
  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#8FAEC8', fontSize: 15, lineHeight: 22 },
  readinessRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  metric: { color: '#FFFFFF', fontSize: 56, fontWeight: '900', marginTop: 8 },
  cardText: { color: '#8FAEC8', marginTop: 4, lineHeight: 20 },
  statusBadge: { backgroundColor: 'rgba(94,122,47,0.15)', borderColor: 'rgba(94,122,47,0.4)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  progressTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 20, overflow: 'hidden' },
  progressFill: { width: '82%', height: '100%', backgroundColor: '#5E7A2F', borderRadius: 999 },
  readinessDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  detailText: { color: '#FFFFFF', backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  briefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  briefTitleBlock: { flex: 1 },
  briefTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  briefTitleWarn: { color: '#D4A01A', fontSize: 22, fontWeight: '900' },
  briefBadge: { backgroundColor: '#003050', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  briefBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  briefBadgeText: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  briefBadgeTextWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  briefActionBox: { backgroundColor: '#000D1A', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, gap: 4, marginTop: 10 },
  briefActionLabel: { color: '#B5852C', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  briefActionText: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  briefSecondary: { color: '#8FAEC8', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  performanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  performanceItem: { width: '47%', backgroundColor: '#000D1A', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, gap: 3 },
  performanceValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  performanceLabel: { color: '#8FAEC8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  recoveryDebtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  recoveryDebtScore: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  recoveryDebtScoreWarn: { color: '#D4A01A', fontSize: 34, fontWeight: '900' },
  recoveryDebtBadge: { backgroundColor: '#003050', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  recoveryDebtBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  recoveryDebtBadgeText: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  recoveryDebtBadgeTextWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  recoveryDebtAction: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  injuryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  injuryScore: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  injuryScoreWarn: { color: '#D4A01A', fontSize: 34, fontWeight: '900' },
  injuryBadge: { backgroundColor: '#003050', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  injuryBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  injuryBadgeText: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  injuryBadgeTextWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  injuryAction: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  balanceScore: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  balanceScoreWarn: { color: '#D4A01A', fontSize: 34, fontWeight: '900' },
  balanceBadge: { backgroundColor: '#003050', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  balanceBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  balanceBadgeText: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  balanceBadgeTextWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  balanceFocus: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  forecastHeader: { gap: 3 },
  forecastTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  forecastTitleWarn: { color: '#D4A01A', fontSize: 22, fontWeight: '900' },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  forecastDay: { alignItems: 'center', gap: 6, flex: 1 },
  forecastDayLabel: { color: '#8FAEC8', fontSize: 10, fontWeight: '900' },
  forecastDotGreen: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#5E7A2F' },
  forecastDotAmber: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#D4A01A' },
  forecastDotRed: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#CC2A2A' },
  adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  adherenceScore: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  adherenceScoreWarn: { color: '#D4A01A', fontSize: 34, fontWeight: '900' },
  adherenceBadge: { backgroundColor: '#003050', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8 },
  adherenceBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  adherenceBadgeText: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  adherenceBadgeTextWarn: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
  adherenceAction: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 8 },
  adherenceMissing: { color: '#8FAEC8', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  insightItem: { backgroundColor: '#000D1A', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, gap: 4 },
  insightItemGood: { backgroundColor: 'rgba(94,122,47,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(94,122,47,0.25)', padding: 12, gap: 4 },
  insightItemWarn: { backgroundColor: 'rgba(212,160,26,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(212,160,26,0.25)', padding: 12, gap: 4 },
  insightTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  insightTitleWarn: { color: '#D4A01A', fontSize: 13, fontWeight: '900' },
  insightText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  milestoneCount: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  milestoneNext: { backgroundColor: '#000D1A', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, maxWidth: '48%' },
  milestoneNextLabel: { color: '#B5852C', fontSize: 10, fontWeight: '900' },
  milestoneNextTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginTop: 2 },
  milestoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  milestonePill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  milestonePillEarned: { backgroundColor: 'rgba(181,133,44,0.12)', borderWidth: 1, borderColor: 'rgba(181,133,44,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  milestonePillText: { color: '#8FAEC8', fontSize: 11, fontWeight: '900' },
  milestonePillTextEarned: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalStat: { flex: 1 },
  goalNumber: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  goalNumberComplete: { color: '#5E7A2F', fontSize: 26, fontWeight: '900' },
  goalLabel: { color: '#8FAEC8', fontSize: 11, fontWeight: '800', marginTop: 2 },
  goalButton: { backgroundColor: '#B5852C', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  goalButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  goalTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  goalFill: { height: '100%', backgroundColor: '#B5852C', borderRadius: 999 },
  goalAction: { backgroundColor: '#000D1A', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, gap: 4, marginTop: 12 },
  goalActionWarn: { backgroundColor: 'rgba(212,160,26,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(212,160,26,0.25)', padding: 12, gap: 4, marginTop: 12 },
  goalActionTitle: { color: '#B5852C', fontSize: 13, fontWeight: '900' },
  goalActionTitleWarn: { color: '#D4A01A', fontSize: 13, fontWeight: '900' },
  goalActionText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { marginTop: 8, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  sectionTag: { color: '#8FAEC8', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140, marginTop: 4 },
  barColumn: { alignItems: 'center', width: 40 },
  barScore: { color: '#8FAEC8', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  barBackground: { width: 24, height: 100, backgroundColor: '#000D1A', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: '#8FAEC8', fontSize: 10, fontWeight: '800', marginTop: 8 },

  reportToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.25)',
    backgroundColor: 'rgba(181,133,44,0.07)',
  },
  reportToggleText: {
    color: '#B5852C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loadCard: { backgroundColor: '#00253D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  loadCardWarn: { backgroundColor: 'rgba(212,160,26,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', gap: 12 },
  loadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  loadKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  loadCount: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  loadCountWarn: { color: '#D4A01A', fontSize: 24, fontWeight: '900', marginTop: 4 },
  loadBadge: { backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loadBadgeWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loadBadgeText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  loadBadgeTextWarn: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },
  loadTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  loadFill: { height: '100%', borderRadius: 999 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: 'rgba(181,133,44,0.1)', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  loadNoData: { color: '#4A6070', fontSize: 13, fontWeight: '800' },
  loadSubText: { color: '#8FAEC8', fontSize: 12, fontWeight: '800' },
  loadWarnText: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },

  // Connections section
  connectSection: {
    backgroundColor: '#00253D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  connectKicker: {
    color: '#B5852C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  connectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  connectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#003050',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  connectPillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B5852C',
  },
  connectPillDotAtak: { backgroundColor: '#1A74D4' },
  connectPillDotGpx: { backgroundColor: '#5E7A2F' },
  connectPillDotCheckin: { backgroundColor: '#B5852C' },
  connectPillDotOffline: { backgroundColor: '#4ECDC4' },
  connectPillDotAlerts: { backgroundColor: '#D4A01A' },
  connectPillDotProgress: { backgroundColor: '#1A74D4' },
  connectPillDotBodyComp: { backgroundColor: '#a78bfa' },
  connectPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // Maps hero card
  mapsHero: {
    backgroundColor: '#B5852C',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#B5852C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  mapsHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mapsHeroKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  mapsHeroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 2 },
  mapsHeroBadge: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  mapsHeroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  mapsHeroStats: { flexDirection: 'row', alignItems: 'center' },
  mapsHeroStat: { flex: 1, alignItems: 'center', gap: 3 },
  mapsHeroStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  mapsHeroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  mapsHeroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },
  mapsHeroCta: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  mapsHeroCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
