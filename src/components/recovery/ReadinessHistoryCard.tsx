import { computeCheckInScore, loadReadinessLogs } from '@/src/services/readinessService';
import type { ReadinessLog } from '@/src/types/map';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type DayEntry = {
  label: string;
  date: string;
  score: number | null;
  log: ReadinessLog | null;
};

function getBarColor(score: number | null): string {
  if (score === null) return 'rgba(181,133,44,0.12)';
  if (score >= 75) return '#5E7A2F';
  if (score >= 50) return '#ffaa44';
  return '#e05050';
}

function buildWeek(logs: ReadinessLog[]): DayEntry[] {
  const today = new Date();
  const days: DayEntry[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0=Sun
    // Map JS day (0=Sun) to M-T-W-T-F-S-S label
    const labelIdx = (dayOfWeek + 6) % 7; // Mon=0, Sun=6
    const log = logs.find((l) => l.date === dateStr) ?? null;
    days.push({
      label: DAY_LABELS[labelIdx],
      date: dateStr,
      score: log ? computeCheckInScore(log) : null,
      log,
    });
  }

  return days;
}

export default function ReadinessHistoryCard() {
  const [days, setDays] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReadinessLogs().then((logs) => {
      setDays(buildWeek(logs));
      setLoading(false);
    }).catch(() => {
      setDays(buildWeek([]));
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const scored = days.filter((d) => d.score !== null);
  const avg = scored.length > 0
    ? Math.round(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length)
    : null;
  const best = scored.length > 0
    ? scored.reduce((prev, cur) => (cur.score ?? 0) > (prev.score ?? 0) ? cur : prev, scored[0])
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>7-DAY READINESS TREND</Text>
      <View style={styles.kickerRule} />

      <View style={styles.chartRow}>
        {days.map((day, i) => {
          const score = day.score;
          const barH = score !== null ? Math.max(4, Math.round((score / 100) * 72)) : 4;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: barH, backgroundColor: getBarColor(score) }]} />
              </View>
              {score !== null && (
                <Text style={[styles.scoreLabel, { color: getBarColor(score) }]}>{score}</Text>
              )}
              <Text style={[styles.dayLabel, day.date === new Date().toISOString().slice(0, 10) && styles.dayLabelToday]}>
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryLabel}>AVG</Text>
          <Text style={styles.summaryValue}>{avg !== null ? `${avg}%` : '--'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryChip}>
          <Text style={styles.summaryLabel}>BEST DAY</Text>
          <Text style={styles.summaryValue}>{best ? best.label : '--'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryChip}>
          <Text style={styles.summaryLabel}>CHECK-INS</Text>
          <Text style={styles.summaryValue}>{scored.length}/7</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c1008',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.12)',
    borderTopWidth: 2,
    borderTopColor: '#B5852C',
    padding: 16,
    gap: 12,
  },
  kicker: {
    color: '#B5852C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  kickerRule: {
    height: 1,
    backgroundColor: 'rgba(181,133,44,0.3)',
    marginBottom: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 110,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    height: 110,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(181,133,44,0.08)',
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dayLabel: {
    color: '#b8c0b0',
    fontSize: 11,
    fontWeight: '900',
  },
  dayLabelToday: {
    color: '#B5852C',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#080c05',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.1)',
    padding: 10,
    gap: 8,
    alignItems: 'center',
  },
  summaryChip: { flex: 1, alignItems: 'center', gap: 3 },
  summaryLabel: { color: '#b8c0b0', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  summaryValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  summaryDivider: { width: 1, height: 28, backgroundColor: 'rgba(181,133,44,0.2)' },
});
