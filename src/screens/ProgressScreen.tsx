import BarChart from '@/src/components/charts/BarChart';
import SparkLine from '@/src/components/charts/SparkLine';
import { useTraining } from '@/src/screens/TrainingContext';
import type { ReadinessLog } from '@/src/types/map';
import {
  testScoreSeries,
  weeklyLoadSeries,
  weeklyRuckSeries,
  weeklyRunSeries,
  weeklyStrengthSeries,
} from '@/src/utils/chartDataUtils';
import { loadReadinessLogs } from '@/src/services/readinessService';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const WEEK_LABELS = ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'];
const WEEKS = 8;
const TEST_POINTS = 10;
const READINESS_DAYS = 14;

function getLast14Days(): string[] {
  return Array.from({ length: READINESS_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (READINESS_DAYS - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

export default function ProgressScreen() {
  const { logs, isLoading } = useTraining();
  const [readinessLogs, setReadinessLogs] = useState<ReadinessLog[]>([]);

  useEffect(() => {
    loadReadinessLogs().then(setReadinessLogs).catch((e) => console.warn('Failed to load readiness logs', e));
  }, []);

  const loadSeries = useMemo(() => weeklyLoadSeries(logs, WEEKS), [logs]);
  const ruckSeries = useMemo(() => weeklyRuckSeries(logs, WEEKS), [logs]);
  const runSeries = useMemo(() => weeklyRunSeries(logs, WEEKS), [logs]);
  const strengthSeries = useMemo(() => weeklyStrengthSeries(logs, WEEKS), [logs]);

  const run24Series = useMemo(
    () => testScoreSeries(logs, '2.4').slice(-TEST_POINTS),
    [logs]
  );
  const pushSeries = useMemo(
    () => testScoreSeries(logs, 'push').slice(-TEST_POINTS),
    [logs]
  );
  const sitSeries = useMemo(
    () => testScoreSeries(logs, 'sit').slice(-TEST_POINTS),
    [logs]
  );

  const sortedReadiness = useMemo(() => {
    const days = getLast14Days();
    const byDate = new Map(readinessLogs.map((r) => [r.date, r]));
    return days
      .map((d) => byDate.get(d))
      .filter((r): r is ReadinessLog => r !== undefined);
  }, [readinessLogs]);

  const moodSeries = useMemo(
    () => sortedReadiness.map((r) => r.mood ?? 0),
    [sortedReadiness]
  );
  const sleepSeries = useMemo(
    () => sortedReadiness.map((r) => r.sleepHours ?? 0),
    [sortedReadiness]
  );
  const stressSeries = useMemo(
    () => sortedReadiness.map((r) => r.stress ?? 0),
    [sortedReadiness]
  );

  if (isLoading) return <View style={styles.screen} />;

  const latestRun24 = run24Series[run24Series.length - 1]?.score;
  const latestPush = pushSeries[pushSeries.length - 1]?.score;
  const latestSit = sitSeries[sitSeries.length - 1]?.score;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>Progress Charts</Text>
      </View>

      {/* Section 1 — Weekly Load */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>WEEKLY LOAD</Text>
        <View style={styles.card}>
          <BarChart data={loadSeries} labels={WEEK_LABELS} width={280} height={90} />
          <View style={styles.sparkRows}>
            <SparkRow label="Ruck" data={ruckSeries} />
            <SparkRow label="Run" data={runSeries} />
            <SparkRow label="Strength" data={strengthSeries} />
          </View>
        </View>
      </View>

      {/* Section 2 — Test Scores */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>TEST SCORES</Text>
        <View style={styles.testGrid}>
          <TestCard
            label="2.4km Run"
            series={run24Series.map((p) => p.score)}
            latest={latestRun24}
            unit="min"
          />
          <TestCard
            label="Push-ups"
            series={pushSeries.map((p) => p.score)}
            latest={latestPush}
            unit="reps"
          />
          <TestCard
            label="Sit-ups"
            series={sitSeries.map((p) => p.score)}
            latest={latestSit}
            unit="reps"
          />
        </View>
      </View>

      {/* Section 3 — Readiness Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>READINESS TREND</Text>
        <View style={styles.card}>
          {sortedReadiness.length < 2 ? (
            <Text style={styles.emptyText}>No check-in data yet</Text>
          ) : (
            <View style={styles.sparkRows}>
              <SparkRow label="Mood" data={moodSeries} color="#B5852C" />
              <SparkRow label="Sleep hrs" data={sleepSeries} color="#4a9eff" />
              <SparkRow label="Stress" data={stressSeries} color="#ffaa44" />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

type SparkRowProps = {
  label: string;
  data: number[];
  color?: string;
};

function SparkRow({ label, data, color = '#B5852C' }: SparkRowProps) {
  return (
    <View style={styles.sparkRow}>
      <Text style={styles.sparkLabel}>{label}</Text>
      <SparkLine data={data} width={120} height={24} color={color} />
    </View>
  );
}

type TestCardProps = {
  label: string;
  series: number[];
  latest: number | undefined;
  unit: string;
};

function TestCard({ label, series, latest, unit }: TestCardProps) {
  return (
    <View style={styles.testCard}>
      <Text style={styles.testCardLabel}>{label}</Text>
      {series.length < 2 ? (
        <Text style={styles.emptyText}>No test data yet</Text>
      ) : (
        <>
          <Text style={styles.testScore}>
            {latest !== undefined ? latest : '--'}
            <Text style={styles.testUnit}> {unit}</Text>
          </Text>
          <SparkLine data={series} width={100} height={28} color="#B5852C" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080c05' },
  content: { padding: 20, gap: 20, paddingBottom: 50 },
  pageHeader: { gap: 6 },
  kicker: { color: '#b8c0b0', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  section: { gap: 10 },
  sectionHeader: {
    color: '#B5852C',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#001829',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#141810',
    padding: 14,
    gap: 12,
  },
  sparkRows: { gap: 8 },
  sparkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sparkLabel: { color: '#b8c0b0', fontSize: 11, fontWeight: '700', width: 64 },
  testGrid: { gap: 10 },
  testCard: {
    backgroundColor: '#001829',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#141810',
    padding: 14,
    gap: 6,
  },
  testCardLabel: {
    color: '#B5852C',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  testScore: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  testUnit: { color: '#b8c0b0', fontSize: 14, fontWeight: '700' },
  emptyText: { color: '#4a5a44', fontSize: 13, fontWeight: '700' },
});
