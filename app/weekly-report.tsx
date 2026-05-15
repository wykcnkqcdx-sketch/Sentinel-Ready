import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildWeeklyReport } from '@/src/utils/reportBuilder';
import dfiftJson from '@/src/data/standards/dfift-standards.json';
import type { DfiftStandards } from '@/src/types/dfift';
import { buildDfiftSnapshot } from '@/src/utils/dfiftUtils';
import { buildRecoveryDebt } from '@/src/utils/recoveryUtils';
import {
  buildGoalSummary,
  buildGoalAction,
  buildPerformanceSnapshot,
  buildNextWeekRecommendation,
  buildWeekSummary,
  calculateTrainingLogHealthScore,
  getTrainingLogHealthLabel,
  WeekSummary,
} from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatWeekRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${s.toLocaleDateString('en-GB', opts)} – ${e.toLocaleDateString('en-GB', opts)}`;
}

function CategoryPill({ label, count, warn }: { label: string; count: number; warn?: boolean }) {
  if (count === 0) return null;
  return (
    <View style={warn ? styles.pillWarning : styles.pill}>
      <Text style={warn ? styles.pillTextWarning : styles.pillText}>{label} {count}</Text>
    </View>
  );
}

function WeekCard({ title, week, isThisWeek }: { title: string; week: WeekSummary; isThisWeek: boolean }) {
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
}

export default function WeeklyReportScreen() {
  const { logs, goals, isLoading } = useTraining();
  const { gender, injuryNotes } = useUser();
  const router = useRouter();
  if (isLoading) return <View style={styles.screen} />;

  const thisWeek = buildWeekSummary(logs, 0);
  const lastWeek = buildWeekSummary(logs, 1);
  const twoWeeksAgo = buildWeekSummary(logs, 2);
  const healthScore = calculateTrainingLogHealthScore(logs);
  const healthLabel = getTrainingLogHealthLabel(healthScore);
  const nextWeekAdvice = buildNextWeekRecommendation(thisWeek, lastWeek);
  const goalSummary = buildGoalSummary(goals);
  const goalAction = buildGoalAction(goals, logs);
  const performance = buildPerformanceSnapshot(logs);
  const dfiftStandards = dfiftJson as DfiftStandards;
  const dfiftSnapshot = buildDfiftSnapshot(logs, dfiftStandards, gender);
  const recoveryDebt = buildRecoveryDebt(logs, injuryNotes);
  const report = buildWeeklyReport(logs, new Date(), goals, { standards: dfiftStandards, gender }, { injuryNotes });

  const healthIsWarn = healthScore < 60;
  const nextWeekIsWarn = nextWeekAdvice.toLowerCase().includes('prioritise') || nextWeekAdvice.toLowerCase().includes('hold');
  const nextWeekIsGood = nextWeekAdvice.toLowerCase().includes('ready to progress');

  async function shareReport() {
    try {
      await Share.share({
        title: report.title,
        message: report.text,
      });
    } catch {
      Alert.alert('Share Failed', 'The weekly report could not be shared. You can still select the report text below.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

      <View style={styles.goalCard}>
        <Text style={styles.cardKicker}>GOALS</Text>
        <Text style={styles.goalTitle}>{goalSummary.active} active / {goalSummary.complete} complete</Text>
        <Text style={styles.goalProgress}>{goalSummary.averageProgress > 0 ? `${goalSummary.averageProgress}% average measured progress` : 'No measured progress yet'}</Text>
        <Text style={styles.adviceText}>{goalSummary.message}</Text>
        <Text style={styles.goalAction}>{goalAction.title}: {goalAction.action}</Text>
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

      <View style={styles.exportCard}>
        <View style={styles.exportHeader}>
          <View style={styles.exportHeaderText}>
            <Text style={styles.cardKicker}>EXPORT REPORT</Text>
            <Text style={styles.exportTitle}>Copy-ready weekly report</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={shareReport}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        <Text selectable style={styles.reportText}>{report.text}</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-log')}>
        <Text style={styles.addButtonText}>Add Training Log</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 18, paddingBottom: 50, gap: 14 },
  header: { gap: 6 },
  backButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 6 },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },

  thisWeekCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 12 },
  lastWeekCard: { backgroundColor: '#0a1510', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 12 },
  weekCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  weekRange: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginTop: 3 },
  totalBadge: { backgroundColor: '#1e3a27', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  totalBadgeSecondary: { backgroundColor: '#0d1812', borderWidth: 1, borderColor: '#203529', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  totalBadgeText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  totalBadgeTextSecondary: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  noDataText: { color: '#6f7d70', fontSize: 13, fontWeight: '800' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillWarning: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  pillTextWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 3 },
  statNumber: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  statNumberWarning: { color: '#ffb86b', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '800' },

  healthCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 10 },
  healthCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  healthScore: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthScoreWarning: { color: '#ffb86b', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthPill: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillWarning: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillText: { color: '#91e6a3', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthPillTextWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthMessage: { color: '#aeb8aa', fontSize: 13, lineHeight: 19 },
  healthMessageWarning: { color: '#ffb86b', fontSize: 13, lineHeight: 19, fontWeight: '800' },

  adviceCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 8 },
  adviceCardGood: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 8 },
  adviceCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 8 },
  adviceTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  adviceTitleGood: { color: '#91e6a3', fontSize: 20, fontWeight: '900' },
  adviceTitleWarning: { color: '#ffb86b', fontSize: 20, fontWeight: '900' },
  adviceText: { color: '#aeb8aa', fontSize: 13, lineHeight: 20 },
  adviceTextWarning: { color: '#c8a070', fontSize: 13, lineHeight: 20 },
  goalCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 8 },
  goalTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  goalProgress: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  goalAction: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  performanceCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 8 },
  recoveryCardWarn: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 8 },
  recoveryTitleWarn: { color: '#ffb86b', fontSize: 20, fontWeight: '900' },

  exportCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 12 },
  exportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  exportHeaderText: { flex: 1 },
  exportTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 3 },
  shareButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  shareButtonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  reportText: { color: '#dfe8da', backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 12, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },

  addButton: { backgroundColor: '#91e6a3', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  addButtonText: { color: '#07110c', fontSize: 15, fontWeight: '900' },
});
