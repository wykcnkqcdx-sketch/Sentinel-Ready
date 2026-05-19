import { tokens as T } from '@/src/theme/tokens';
import BarChart from '@/src/components/charts/BarChart';
import SparkLine from '@/src/components/charts/SparkLine';
import { useTraining } from '@/src/screens/TrainingContext';
import { weeklyLoadSeries } from '@/src/utils/chartDataUtils';
import { getReadinessNumber } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { TouchableOpacity } from 'react-native';

const WEEKS = 12;

function fmtPace(s: number): string {
  if (!s || !Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}/km`;
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
        <View style={styles.panelRule} />
      </View>
      {children}
    </View>
  );
}

function StatBubble({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBubble}>
      <Text style={styles.statBubbleLabel}>{label}</Text>
      <Text style={[styles.statBubbleValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export default function ProgressionScreen() {
  const router = useRouter();
  const { logs, isLoading } = useTraining();
  const { width } = useWindowDimensions();
  const chartW = width - 64;

  const weekLabels = useMemo(() => {
    const out: string[] = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      out.push(i === 0 ? 'NOW' : `W${i}`);
    }
    return out;
  }, []);

  const weeklyLoad = useMemo(() => weeklyLoadSeries(logs, WEEKS), [logs]);

  const readinessData = useMemo(() => {
    const withR = [...logs]
      .filter((l) => getReadinessNumber(l.readiness) > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20);
    const values = withR.map((l) => getReadinessNumber(l.readiness));
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const latest = values.length > 0 ? values[values.length - 1] : 0;
    const trend = values.length >= 3
      ? (values[values.length - 1] > values[0] ? 'up' : values[values.length - 1] < values[0] ? 'down' : 'flat')
      : 'flat';
    return { values, min, max, avg, latest, trend };
  }, [logs]);

  const ruckPaceData = useMemo(() => {
    const rucks = [...logs]
      .filter((l) => l.category === 'Ruck' && l.ruck && l.ruck.paceSecondsPerKm > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);
    const paces = rucks.map((l) => l.ruck!.paceSecondsPerKm);
    const best = paces.length > 0 ? Math.min(...paces) : 0;
    const latest = paces.length > 0 ? paces[paces.length - 1] : 0;
    const improving = paces.length >= 2 && paces[paces.length - 1] < paces[0];
    return { paces: paces.map((p) => 1 / p), rawPaces: paces, best, latest, improving, count: rucks.length };
  }, [logs]);

  const categoryData = useMemo(() => {
    const WEEK_WINDOW = 8;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WEEK_WINDOW * 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const recent = logs.filter((l) => l.date >= cutoffStr);
    const counts: Record<string, number> = {};
    for (const l of recent) counts[l.category] = (counts[l.category] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [logs]);

  if (isLoading) return <View style={styles.screen} />;

  const readinessColor = readinessData.trend === 'up' ? '#91e6a3' : readinessData.trend === 'down' ? '#e05050' : '#ffaa44';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.kicker}>// OPERATIONS CENTRE //</Text>
          <Text style={styles.title}>PROGRESSION</Text>
          <View style={styles.divider} />
        </View>

        {/* Readiness Trend */}
        <ChartPanel
          title="READINESS TREND"
          subtitle={`LAST ${readinessData.values.length} SESSIONS`}
        >
          {readinessData.values.length >= 2 ? (
            <>
              <View style={styles.chartWrap}>
                <SparkLine data={readinessData.values} width={chartW} height={56} color={readinessColor} strokeWidth={2} />
                <View style={styles.axisLabels}>
                  <Text style={styles.axisLabel}>1</Text>
                  <Text style={styles.axisLabel}>10</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <StatBubble label="MIN" value={`${readinessData.min}`} />
                <StatBubble label="AVG" value={readinessData.avg.toFixed(1)} color={readinessColor} />
                <StatBubble label="MAX" value={`${readinessData.max}`} color="#91e6a3" />
                <StatBubble label="LATEST" value={`${readinessData.latest}`} color={readinessData.latest >= 7 ? '#91e6a3' : readinessData.latest >= 5 ? '#ffaa44' : '#e05050'} />
              </View>
            </>
          ) : (
            <Text style={styles.noData}>Log 2+ sessions to view trend</Text>
          )}
        </ChartPanel>

        {/* Weekly Load */}
        <ChartPanel title="WEEKLY LOAD" subtitle={`LAST ${WEEKS} WEEKS`}>
          {weeklyLoad.some((v) => v > 0) ? (
            <>
              <View style={styles.chartWrap}>
                <BarChart data={weeklyLoad} labels={weekLabels} width={chartW} height={72} />
              </View>
              <View style={styles.statRow}>
                <StatBubble label="PEAK WEEK" value={`${Math.max(...weeklyLoad)} sessions`} color="#91e6a3" />
                <StatBubble label="THIS WEEK" value={`${weeklyLoad[weeklyLoad.length - 1]} sessions`} />
                <StatBubble label="AVG WEEK" value={(weeklyLoad.reduce((s, v) => s + v, 0) / WEEKS).toFixed(1)} />
              </View>
            </>
          ) : (
            <Text style={styles.noData}>No sessions logged yet</Text>
          )}
        </ChartPanel>

        {/* Ruck Pace */}
        {ruckPaceData.count >= 2 && (
          <ChartPanel title="RUCK PACE TREND" subtitle={`LAST ${ruckPaceData.count} RUCK SESSIONS`}>
            <View style={styles.chartWrap}>
              <SparkLine
                data={ruckPaceData.paces}
                width={chartW}
                height={56}
                color={ruckPaceData.improving ? '#91e6a3' : '#ffaa44'}
                strokeWidth={2}
              />
              <Text style={styles.chartNote}>↑ faster</Text>
            </View>
            <View style={styles.statRow}>
              <StatBubble label="BEST" value={fmtPace(ruckPaceData.best)} color="#91e6a3" />
              <StatBubble label="LATEST" value={fmtPace(ruckPaceData.latest)} color={ruckPaceData.improving ? '#91e6a3' : '#ffaa44'} />
              <StatBubble label="TREND" value={ruckPaceData.improving ? 'FASTER ↑' : 'SLOWER ↓'} color={ruckPaceData.improving ? '#91e6a3' : '#e05050'} />
            </View>
          </ChartPanel>
        )}

        {/* Category mix */}
        {categoryData.length > 0 && (
          <ChartPanel title="CATEGORY MIX" subtitle="LAST 8 WEEKS">
            {categoryData.map(([cat, count]) => {
              const max = categoryData[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <View key={cat} style={styles.catMixRow}>
                  <Text style={styles.catMixLabel}>{cat.toUpperCase()}</Text>
                  <View style={styles.catMixTrack}>
                    <View style={[styles.catMixFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.catMixCount}>{count}</Text>
                </View>
              );
            })}
          </ChartPanel>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4, marginBottom: 8 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  panel: { marginHorizontal: 16, marginTop: 14, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  panelTitle: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  panelSubtitle: { color: '#1e3826', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  panelRule: { flex: 1, height: 1, backgroundColor: '#172c20' },

  chartWrap: { paddingHorizontal: 16, paddingBottom: 8, position: 'relative' },
  axisLabels: { position: 'absolute', right: 16, top: 0, height: 56, justifyContent: 'space-between' },
  axisLabel: { color: '#1e3826', fontSize: 8, fontWeight: '700' },
  chartNote: { color: '#1e3826', fontSize: 8, fontWeight: '700', marginTop: 2 },

  statRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: T.borderDim },
  statBubble: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, borderRightWidth: 1, borderRightColor: T.borderDim },
  statBubbleLabel: { color: T.textHintDark, fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  statBubbleValue: { color: T.textSubtle, fontSize: 12, fontWeight: '900' },

  catMixRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.borderDim },
  catMixLabel: { width: 70, color: T.textHintDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  catMixTrack: { flex: 1, height: 5, backgroundColor: '#172c20', borderRadius: 2.5, overflow: 'hidden' },
  catMixFill: { height: 5, backgroundColor: T.textAccent, borderRadius: 2.5 },
  catMixCount: { width: 20, color: T.textSubtle, fontSize: 11, fontWeight: '900', textAlign: 'right' },

  noData: { color: T.textHintDark, fontSize: 12, fontWeight: '700', paddingHorizontal: 14, paddingBottom: 14 },
});
