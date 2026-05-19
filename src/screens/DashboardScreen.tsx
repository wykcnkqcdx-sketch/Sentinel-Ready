import { tokens as T } from '@/src/theme/tokens';
import WeeklyLoadRiskCard from '@/src/components/log/WeeklyLoadRiskCard';
import AlertCard from '@/src/components/ui/AlertCard';
import MissionStat from '@/src/components/ui/MissionStat';
import SentinelCard from '@/src/components/ui/SentinelCard';
import SparkLine from '@/src/components/charts/SparkLine';
import Svg, { Circle } from 'react-native-svg';
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
import { buildThreatAssessment } from '@/src/utils/threatUtils';
import { buildGoalAction, buildGoalSummary, buildPerformanceSnapshot, buildReadinessTrend, buildWeekSummary, buildWeeklyLoadRisk, getReadinessNumber } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { DimensionValue, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const { injuryNotes, testDate } = useUser();
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
  const threatAssessment = useMemo(() => buildThreatAssessment(logs, testDate), [logs, testDate]);
  const testCountdown = useMemo<{ days: number; color: string } | null>(() => {
    if (!testDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(testDate + 'T00:00:00');
    const days = Math.round((target.getTime() - now.getTime()) / 86400000);
    if (days < 0 || days > 90) return null;
    const color = days <= 13 ? T.dotRed : days <= 30 ? T.accentWarnBright : T.textAccent;
    return { days, color };
  }, [testDate]);

  const weeklyLoadData = useMemo(() => weeklyLoadSeries(logs, 8), [logs]);
  const [showFullReport, setShowFullReport] = useState(false);

  const weekAvgReadiness = Number(thisWeek.averageReadiness);
  const weekLoadStatus = useMemo(() => getWeeklyLoadStatus(thisWeek.total, thisWeek.fatigueWatch, weekAvgReadiness), [thisWeek.total, thisWeek.fatigueWatch, weekAvgReadiness]);
  const weekProgress = Math.min(thisWeek.total / WEEKLY_TARGET, 1);
  const alertCount = useMemo(() => [
    readinessPercentage > 0 && readinessPercentage < 60,
    trend.status === 'warning',
    thisWeek.fatigueWatch >= 2,
  ].filter(Boolean).length, [readinessPercentage, trend.status, thisWeek.fatigueWatch]);

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
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.kicker}>// OPERATIONS CENTRE //</Text>
            <Text style={styles.title}>COMMAND & STATUS</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: readinessStatus.prog + '55', backgroundColor: readinessStatus.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: readinessStatus.prog }]} />
            <Text style={[styles.statusPillText, { color: readinessStatus.textCol }]}>{readinessStatus.text}</Text>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </View>

      {testCountdown !== null && (
        <View style={[styles.testCountdownBanner, { borderColor: testCountdown.color + '55', backgroundColor: testCountdown.color + '0c' }]}>
          <View style={[styles.testCountdownDot, { backgroundColor: testCountdown.color }]} />
          <Text style={[styles.testCountdownLabel, { color: testCountdown.color }]}>
            {testCountdown.days === 0 ? 'TEST DAY' : `T-${testCountdown.days} DAYS`}
          </Text>
          <Text style={styles.testCountdownSub}>TO PHYSICAL TEST</Text>
        </View>
      )}

      <View style={styles.statusBoard}>
        <View style={[styles.statusBoardCell, { borderLeftColor: readinessStatus.prog }]}>
          <Text style={styles.statusBoardKicker}>READINESS</Text>
          <Text style={[styles.statusBoardValue, { color: readinessStatus.textCol }]}>{readinessStatus.text}</Text>
        </View>
        <View style={[styles.statusBoardCell, { borderLeftColor: weekLoadStatus.isWarn ? T.accentWarnBright : T.textAccent }]}>
          <Text style={styles.statusBoardKicker}>LOAD STATUS</Text>
          <Text style={[styles.statusBoardValue, { color: weekLoadStatus.isWarn ? T.accentWarnBright : T.textAccent }]}>{weekLoadStatus.label.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBoardCell, { borderLeftColor: alertCount > 0 ? T.dotRed : T.textAccent }]}>
          <Text style={styles.statusBoardKicker}>ACTIVE ALERTS</Text>
          <Text style={[styles.statusBoardValue, { color: alertCount > 0 ? T.dotRed : T.textAccent }]}>{alertCount}</Text>
        </View>
        <View style={[styles.statusBoardCell, { borderLeftColor: missionBrief.status === 'red' ? T.dotRed : missionBrief.status === 'green' ? T.textAccent : T.accentWarnBright }]}>
          <Text style={styles.statusBoardKicker}>SITREP</Text>
          <Text style={[styles.statusBoardValue, { color: missionBrief.status === 'red' ? T.dotRed : missionBrief.status === 'green' ? T.textAccent : T.accentWarnBright }]}>{missionBrief.status.toUpperCase()}</Text>
        </View>
      </View>

      <SentinelCard
        title="THREAT ASSESSMENT"
        variant={threatAssessment.overallLevel === 'RED' ? 'warning' : 'default'}
      >
        {/* Overall level banner */}
        <View style={[
          styles.threatBanner,
          { borderColor: threatAssessment.overallLevel === 'RED' ? T.dotRed + '55'
              : threatAssessment.overallLevel === 'AMBER' ? T.accentWarnBright + '55'
              : threatAssessment.overallLevel === 'GREEN' ? T.textAccent + '55'
              : T.borderDim }
        ]}>
          <View style={[
            styles.threatLevelDot,
            { backgroundColor: threatAssessment.overallLevel === 'RED' ? T.dotRed
                : threatAssessment.overallLevel === 'AMBER' ? T.accentWarnBright
                : threatAssessment.overallLevel === 'GREEN' ? T.textAccent
                : '#2e5038' }
          ]} />
          <Text style={[
            styles.threatLevelText,
            { color: threatAssessment.overallLevel === 'RED' ? T.dotRed
                : threatAssessment.overallLevel === 'AMBER' ? T.accentWarnBright
                : threatAssessment.overallLevel === 'GREEN' ? T.textAccent
                : '#3a6b46' }
          ]}>
            {threatAssessment.overallLevel === 'CLEAR' ? 'SYSTEM NOMINAL — NO THREATS DETECTED' : `THREAT LEVEL ${threatAssessment.overallLevel}`}
          </Text>
          {threatAssessment.actionableCount > 0 && (
            <View style={styles.threatCountBadge}>
              <Text style={styles.threatCountText}>{threatAssessment.actionableCount}</Text>
            </View>
          )}
        </View>

        {threatAssessment.threats.map((threat) => (
          <AlertCard
            key={threat.id}
            type={threat.level === 'RED' ? 'alert' : threat.level === 'AMBER' ? 'warning' : 'info'}
            title={threat.label}
            description={`${threat.message}\n→ ${threat.action}`}
          />
        ))}
      </SentinelCard>

      <SentinelCard title="READINESS ASSESSMENT" variant="success">
        <View style={styles.readinessRow}>
          <View style={styles.readinessRingWrap}>
            {(() => {
              const R = 52; const CIRC = 2 * Math.PI * R;
              const offset = CIRC * (1 - (readinessPercentage > 0 ? readinessPercentage : 0) / 100);
              return (
                <Svg width={120} height={120} style={styles.readinessRingSvg}>
                  <Circle cx={60} cy={60} r={R} fill="none" stroke={T.borderDim} strokeWidth={10} />
                  <Circle cx={60} cy={60} r={R} fill="none" stroke={readinessStatus.prog}
                    strokeWidth={10} strokeLinecap="round"
                    strokeDasharray={CIRC} strokeDashoffset={offset} />
                </Svg>
              );
            })()}
            <View style={styles.readinessRingOverlay}>
              <Text style={[styles.metric, { color: readinessStatus.prog }]}>
                {readinessPercentage > 0 ? `${readinessPercentage}` : '--'}
              </Text>
              <Text style={styles.metricUnit}>PCT</Text>
            </View>
          </View>
          <View style={styles.readinessSidePanel}>
            <Text style={styles.cardText}>{readinessStatus.msg}</Text>
            <View style={styles.readinessDetails}>
              <View style={styles.detailChip}>
                <View style={styles.detailChipDot} />
                <Text style={styles.detailText}>STR  {strengthStatus}</Text>
              </View>
              <View style={styles.detailChip}>
                <View style={styles.detailChipDot} />
                <Text style={styles.detailText}>END  {enduranceStatus}</Text>
              </View>
              <View style={styles.detailChip}>
                <View style={styles.detailChipDot} />
                <Text style={styles.detailText}>REC  {recoveryStatus}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${readinessPercentage}%` as any, backgroundColor: readinessStatus.prog }]} />
        </View>
      </SentinelCard>

      <SentinelCard title="SITREP" variant={missionBrief.status === 'red' ? 'warning' : missionBrief.status === 'green' ? 'success' : 'default'}>
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
          <Text style={styles.briefActionLabel}>DIRECTIVE</Text>
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
          {showFullReport ? '▲  COLLAPSE ASSESSMENT' : '▼  VIEW FULL ASSESSMENT'}
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

      <SentinelCard title="INTELLIGENCE ANALYSIS">
        {topInsights.map((insight) => (
          <View key={insight.title} style={
            insight.severity === 'warning' ? styles.insightItemWarn
            : insight.severity === 'good' ? styles.insightItemGood
            : styles.insightItem
          }>
            <Text style={styles.insightTag}>
              {insight.severity === 'warning' ? 'ALERT' : insight.severity === 'good' ? 'POSITIVE' : 'OBSERVED'}
            </Text>
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
        <MissionStat label="LOAD CARRIAGE" value={ruckVal} status={ruckVal !== 'N/A' ? 'LAST OP' : 'AWAITING DATA'} />
        <MissionStat label="FORCE OUTPUT" value={strengthVal} status={strengthVal !== 'N/A' ? 'LAST OUTPUT' : 'AWAITING DATA'} />
        <MissionStat label="AEROBIC BASE" value={cardioVal} status={cardioVal !== 'N/A' ? 'LAST LOG' : 'AWAITING DATA'} />
        <MissionStat label="RECOVERY STATE" value={recoveryVal} status={recoveryVal !== 'N/A' ? 'LAST LOG' : 'AWAITING DATA'} />
      </View>

      <View style={weekLoadStatus.isWarn ? styles.loadCardWarn : styles.loadCard}>
        <View style={styles.loadHeader}>
          <View>
            <Text style={styles.loadKicker}>WEEKLY OP LOAD</Text>
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
              backgroundColor: weekLoadStatus.isWarn ? T.textWarn : thisWeek.total >= WEEKLY_TARGET ? '#62d982' : T.textHint,
            },
          ]} />
        </View>

        <SparkLine data={weeklyLoadData} width={240} height={28} color={T.textAccent} />

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
        <Text style={styles.connectKicker}>SYSTEM ACCESS</Text>
        <View style={styles.connectRow}>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/progression')} accessibilityRole="button" accessibilityLabel="View performance progression charts">
            <View style={[styles.connectDot, { backgroundColor: '#FC4C02' }]} />
            <Text style={styles.connectCellText}>PROGRESSION</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/operator-profile')} accessibilityRole="button" accessibilityLabel="View operator personnel file">
            <View style={[styles.connectDot, { backgroundColor: '#3a7bd5' }]} />
            <Text style={styles.connectCellText}>PERSONNEL</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/ruck-library')} accessibilityRole="button" accessibilityLabel="Open ruck library">
            <View style={[styles.connectDot, { backgroundColor: T.borderGreen }]} />
            <Text style={styles.connectCellText}>RUCK LOG</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/daily-check')} accessibilityRole="button" accessibilityLabel="Log today's check-in">
            <View style={[styles.connectDot, { backgroundColor: T.textAccent }]} />
            <Text style={styles.connectCellText}>DAILY CHECK</Text>
          </Pressable>
        </View>
        <View style={styles.connectRow}>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/calendar')} accessibilityRole="button" accessibilityLabel="Open operations calendar">
            <View style={[styles.connectDot, { backgroundColor: '#3fc8e4' }]} />
            <Text style={styles.connectCellText}>OPS CALENDAR</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/weekly-brief')} accessibilityRole="button" accessibilityLabel="View weekly mission brief">
            <View style={[styles.connectDot, { backgroundColor: T.accentWarnBright }]} />
            <Text style={styles.connectCellText}>WEEKLY BRIEF</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/timeline')} accessibilityRole="button" accessibilityLabel="View incident timeline">
            <View style={[styles.connectDot, { backgroundColor: '#4a9eff' }]} />
            <Text style={styles.connectCellText}>TIMELINE</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.connectCell, pressed && styles.connectCellPressed]} onPress={() => router.push('/vault')} accessibilityRole="button" accessibilityLabel="Open intelligence vault">
            <View style={[styles.connectDot, { backgroundColor: '#c097f7' }]} />
            <Text style={styles.connectCellText}>INTEL VAULT</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE ALERTS</Text>
          <Text style={styles.sectionTag}>ACTIVE</Text>
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
        <Text style={styles.fabText}>+ LOG ACTIVITY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark, position: 'relative' },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: T.textAccent,
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: T.textAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: T.bgDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  content: { padding: 16, gap: 14, paddingBottom: 110, maxWidth: 1100, width: '100%', alignSelf: 'center' },

  // Test countdown
  testCountdownBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  testCountdownDot: { width: 8, height: 8, borderRadius: 4 },
  testCountdownLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  testCountdownSub: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2, flex: 1, textAlign: 'right' },

  // Header
  header: { gap: 0, marginBottom: 4 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3.5 },
  title: { color: T.textPrimaryDark, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  subtitle: { color: T.textMutedDark, fontSize: 14, lineHeight: 20, marginTop: 4 },
  headerDivider: { height: 1, backgroundColor: T.borderDim, marginTop: 14 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  // Readiness ring
  readinessRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  readinessRingWrap: { width: 120, height: 120, position: 'relative' },
  readinessRingSvg: { transform: [{ rotate: '-90deg' }] },
  readinessRingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metric: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  metricUnit: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: -2 },
  readinessSidePanel: { flex: 1, gap: 10 },
  cardText: { color: T.textSubtle, fontSize: 13, lineHeight: 19 },
  readinessDetails: { gap: 6 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailChipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.textAccent, opacity: 0.6 },
  detailText: { color: T.textAccent, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },

  // Legacy badge kept for statusBadge refs
  statusBadge: { backgroundColor: T.bgBadgeDark, borderColor: T.borderGreen, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  progressTrack: { height: 4, backgroundColor: '#0d1a12', borderRadius: 2, marginTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: T.borderDim },
  progressFill: { height: '100%', borderRadius: 2 },

  // Mission brief
  briefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  briefTitleBlock: { flex: 1 },
  briefTitle: { color: T.textPrimaryDark, fontSize: 20, fontWeight: '900' },
  briefTitleWarn: { color: T.accentWarnBright, fontSize: 20, fontWeight: '900' },
  briefBadge: { backgroundColor: T.bgBadgeDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderGreen, paddingHorizontal: 10, paddingVertical: 6 },
  briefBadgeWarn: { backgroundColor: T.bgWarnDeep, borderRadius: 4, borderWidth: 1, borderColor: T.borderWarnMedium, paddingHorizontal: 10, paddingVertical: 6 },
  briefBadgeText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  briefBadgeTextWarn: { color: T.accentWarnBright, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  briefActionBox: { backgroundColor: T.bgDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, padding: 12, gap: 4, marginTop: 10 },
  briefActionLabel: { color: T.textAccent, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  briefActionText: { color: T.textAction, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  briefSecondary: { color: T.textSubtle, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 6 },

  // Performance
  performanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  performanceItem: { width: '47%', backgroundColor: T.bgDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, padding: 12, gap: 3 },
  performanceValue: { color: T.textPrimaryDark, fontSize: 20, fontWeight: '900' },
  performanceLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },

  // Recovery debt
  recoveryDebtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  recoveryDebtScore: { color: T.textPrimaryDark, fontSize: 34, fontWeight: '900' },
  recoveryDebtScoreWarn: { color: T.accentWarnBright, fontSize: 34, fontWeight: '900' },
  recoveryDebtBadge: { backgroundColor: T.bgBadgeDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderGreen, paddingHorizontal: 10, paddingVertical: 6 },
  recoveryDebtBadgeWarn: { backgroundColor: T.bgWarnDeep, borderRadius: 4, borderWidth: 1, borderColor: T.borderWarnMedium, paddingHorizontal: 10, paddingVertical: 6 },
  recoveryDebtBadgeText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  recoveryDebtBadgeTextWarn: { color: T.accentWarnBright, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  recoveryDebtAction: { color: T.textAction, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 8 },

  // Injury
  injuryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  injuryScore: { color: T.textPrimaryDark, fontSize: 34, fontWeight: '900' },
  injuryScoreWarn: { color: T.accentWarnBright, fontSize: 34, fontWeight: '900' },
  injuryBadge: { backgroundColor: T.bgBadgeDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderGreen, paddingHorizontal: 10, paddingVertical: 6 },
  injuryBadgeWarn: { backgroundColor: T.bgWarnDeep, borderRadius: 4, borderWidth: 1, borderColor: T.borderWarnMedium, paddingHorizontal: 10, paddingVertical: 6 },
  injuryBadgeText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  injuryBadgeTextWarn: { color: T.accentWarnBright, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  injuryAction: { color: T.textAction, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 8 },

  // Balance
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  balanceScore: { color: T.textPrimaryDark, fontSize: 34, fontWeight: '900' },
  balanceScoreWarn: { color: T.accentWarnBright, fontSize: 34, fontWeight: '900' },
  balanceBadge: { backgroundColor: T.bgBadgeDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderGreen, paddingHorizontal: 10, paddingVertical: 6 },
  balanceBadgeWarn: { backgroundColor: T.bgWarnDeep, borderRadius: 4, borderWidth: 1, borderColor: T.borderWarnMedium, paddingHorizontal: 10, paddingVertical: 6 },
  balanceBadgeText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  balanceBadgeTextWarn: { color: T.accentWarnBright, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  balanceFocus: { color: T.textAction, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 8 },

  // Forecast
  forecastHeader: { gap: 3 },
  forecastTitle: { color: T.textPrimaryDark, fontSize: 20, fontWeight: '900' },
  forecastTitleWarn: { color: T.accentWarnBright, fontSize: 20, fontWeight: '900' },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  forecastDay: { alignItems: 'center', gap: 6, flex: 1 },
  forecastDayLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  forecastDotGreen: { width: 12, height: 12, borderRadius: 2, backgroundColor: T.textAccent },
  forecastDotAmber: { width: 12, height: 12, borderRadius: 2, backgroundColor: T.accentWarnBright },
  forecastDotRed: { width: 12, height: 12, borderRadius: 2, backgroundColor: T.dotRed },

  // Adherence
  adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  adherenceScore: { color: T.textPrimaryDark, fontSize: 34, fontWeight: '900' },
  adherenceScoreWarn: { color: T.accentWarnBright, fontSize: 34, fontWeight: '900' },
  adherenceBadge: { backgroundColor: T.bgBadgeDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderGreen, paddingHorizontal: 10, paddingVertical: 6 },
  adherenceBadgeWarn: { backgroundColor: T.bgWarnDeep, borderRadius: 4, borderWidth: 1, borderColor: T.borderWarnMedium, paddingHorizontal: 10, paddingVertical: 6 },
  adherenceBadgeText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  adherenceBadgeTextWarn: { color: T.accentWarnBright, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  adherenceAction: { color: T.textAction, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 8 },
  adherenceMissing: { color: T.textHintDark, fontSize: 11, lineHeight: 18, fontWeight: '800', letterSpacing: 0.5 },

  // Insights
  insightItem: { backgroundColor: T.bgDark, borderRadius: 4, borderLeftWidth: 2, borderLeftColor: T.borderDim, borderWidth: 1, borderColor: T.borderDim, padding: 12, gap: 4 },
  insightItemGood: { backgroundColor: T.bgPanelDeep, borderRadius: 4, borderLeftWidth: 2, borderLeftColor: T.textAccent, borderWidth: 1, borderColor: T.borderDim, padding: 12, gap: 4 },
  insightItemWarn: { backgroundColor: T.bgInsightWarn, borderRadius: 4, borderLeftWidth: 2, borderLeftColor: T.accentWarnBright, borderWidth: 1, borderColor: T.borderWarnFaint, padding: 12, gap: 4 },
  insightTitle: { color: T.textPrimaryDark, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  insightTitleWarn: { color: T.accentWarnBright, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  insightText: { color: T.textSubtle, fontSize: 12, lineHeight: 18, fontWeight: '600' },

  // Milestones
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  milestoneCount: { color: T.textPrimaryDark, fontSize: 28, fontWeight: '900' },
  milestoneNext: { backgroundColor: T.bgDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, padding: 10, maxWidth: '48%' },
  milestoneNextLabel: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  milestoneNextTitle: { color: T.textAction, fontSize: 12, fontWeight: '800', marginTop: 3 },
  milestoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  milestonePill: { borderWidth: 1, borderColor: '#1e3d28', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  milestonePillEarned: { backgroundColor: T.bgBadgeDark, borderWidth: 1, borderColor: T.borderGreen, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  milestonePillText: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  milestonePillTextEarned: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  // Goals
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalStat: { flex: 1 },
  goalNumber: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900' },
  goalNumberComplete: { color: T.textAccent, fontSize: 26, fontWeight: '900' },
  goalLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', marginTop: 2, letterSpacing: 2 },
  goalButton: { backgroundColor: T.textAccent, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 9 },
  goalButtonText: { color: T.bgDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  goalTrack: { height: 4, backgroundColor: T.bgDark, borderRadius: 2, overflow: 'hidden', borderWidth: 1, borderColor: T.borderDim, marginTop: 12 },
  goalFill: { height: '100%', backgroundColor: T.textAccent, borderRadius: 2 },
  goalAction: { backgroundColor: T.bgDark, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, padding: 12, gap: 4, marginTop: 12 },
  goalActionWarn: { backgroundColor: T.bgInsightWarn, borderRadius: 4, borderLeftWidth: 2, borderLeftColor: T.accentWarnBright, borderWidth: 1, borderColor: T.borderWarnFaint, padding: 12, gap: 4, marginTop: 12 },
  goalActionTitle: { color: T.textAccent, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  goalActionTitleWarn: { color: T.accentWarnBright, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  goalActionText: { color: T.textSubtle, fontSize: 12, lineHeight: 18, fontWeight: '600' },

  // Grid & sections
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { marginTop: 4, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: T.textPrimaryDark, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  sectionTag: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3 },

  // Readiness trend chart
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 130, marginTop: 4 },
  barColumn: { alignItems: 'center', width: 36 },
  barScore: { color: T.textMutedDark, fontSize: 10, fontWeight: '800', marginBottom: 6 },
  barBackground: { width: 20, height: 90, backgroundColor: T.bgPanelAlt, borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: T.borderDim },
  barFill: { width: '100%', borderRadius: 2 },
  barLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },

  reportToggle: {
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderDim,
    backgroundColor: T.bgPanelDeep,
  },
  reportToggleText: {
    color: T.textAccent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  // Weekly load
  loadCard: { backgroundColor: T.bgPanelAlt, borderRadius: 6, padding: 16, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: T.textAccent, borderColor: T.borderDim, gap: 12 },
  loadCardWarn: { backgroundColor: '#100c08', borderRadius: 6, padding: 16, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: T.accentWarnBright, borderColor: T.borderWarnFaint, gap: 12 },
  loadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  loadKicker: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  loadCount: { color: T.textPrimaryDark, fontSize: 22, fontWeight: '900', marginTop: 4 },
  loadCountWarn: { color: T.accentWarnBright, fontSize: 22, fontWeight: '900', marginTop: 4 },
  loadBadge: { backgroundColor: T.bgBadgeDark, borderWidth: 1, borderColor: T.borderGreen, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  loadBadgeWarn: { backgroundColor: T.bgWarnDeep, borderWidth: 1, borderColor: T.borderWarnMedium, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  loadBadgeText: { color: T.textAccent, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  loadBadgeTextWarn: { color: T.accentWarnBright, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  loadTrack: { height: 4, backgroundColor: T.bgDark, borderRadius: 2, overflow: 'hidden', borderWidth: 1, borderColor: T.borderDim },
  loadFill: { height: '100%', borderRadius: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: T.bgBadgeDark, borderWidth: 1, borderColor: T.borderGreen, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { color: T.textAccent, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  loadNoData: { color: '#3a5040', fontSize: 13, fontWeight: '700' },
  loadSubText: { color: T.textHintDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  loadWarnText: { color: T.accentWarnBright, fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },

  // Status board
  statusBoard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBoardCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: T.bgPanelAlt,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderDim,
    borderLeftWidth: 3,
    padding: 12,
    gap: 4,
  },
  statusBoardKicker: { color: T.textHintDark, fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  statusBoardValue: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  // Threat assessment
  threatBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  threatLevelDot: { width: 7, height: 7, borderRadius: 3.5 },
  threatLevelText: { flex: 1, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  threatCountBadge: { backgroundColor: T.dotRed + '22', borderRadius: 3, borderWidth: 1, borderColor: T.dotRed + '55', paddingHorizontal: 7, paddingVertical: 2 },
  threatCountText: { color: T.dotRed, fontSize: 10, fontWeight: '900' },

  // Insight tag
  insightTag: { color: T.textHintDark, fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },

  // Connect section
  connectSection: {
    backgroundColor: T.bgPanelAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.borderDim,
    padding: 14,
    gap: 10,
  },
  connectKicker: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  connectRow: { flexDirection: 'row', gap: 8 },
  connectCell: {
    flex: 1,
    backgroundColor: T.bgDark,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.borderDim,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 8,
    minHeight: 64,
  },
  connectCellPressed: { opacity: 0.7 },
  connectDot: { width: 8, height: 8, borderRadius: 4 },
  connectCellText: { color: '#b8cbb8', fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
});
