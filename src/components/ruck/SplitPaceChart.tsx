import type { RuckSplit, TrackPoint } from '@/src/types/map';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

const CHART_H = 120;
const PAD_T = 8;
const PAD_B = 22;
const PAD_H = 8;
const EL_H = 18;

function formatPace(s: number): string {
  if (!s || !Number.isFinite(s)) return '--';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}/km`;
}

function formatSplit(s: number): string {
  const ms = Math.max(0, s);
  const m = Math.floor(ms / 60);
  const sec = Math.round(ms % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function sampleElevations(points: TrackPoint[], n: number): number[] | null {
  const alts = points.map((p) => p.altitude).filter((a): a is number => a != null && a > 0);
  if (alts.length < n * 2) return null;
  return Array.from({ length: n }, (_, i) => {
    const idx = Math.min(Math.round((i / n) * alts.length), alts.length - 1);
    return alts[idx];
  });
}

type Props = {
  splits: RuckSplit[];
  avgPaceSecondsPerKm: number;
  routePoints: TrackPoint[];
};

export const SplitPaceChart = memo(function SplitPaceChart({ splits, avgPaceSecondsPerKm, routePoints }: Props) {
  const [w, setW] = useState(300);
  const onLayout = useCallback((e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width), []);

  const elevations = useMemo(
    () => sampleElevations(routePoints, splits.length),
    [routePoints, splits.length],
  );

  const n = splits.length;
  const paces = splits.map((s) => s.splitSeconds);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const paceRange = maxPace - minPace;

  const barsH = CHART_H - PAD_T - PAD_B - (elevations ? EL_H : 0);
  const baseline = PAD_T + barsH;
  const barW = (w - PAD_H * 2) / n;

  // faster = taller bar (inverted pace axis so green bars visually "pop")
  const bars = splits.map((split, i) => {
    const norm = paceRange > 0 ? 1 - (split.splitSeconds - minPace) / paceRange : 0.65;
    const h = Math.max(4, barsH * norm);
    const x = PAD_H + i * barW;
    return {
      x,
      y: baseline - h,
      w: Math.max(1, barW - 3),
      h,
      faster: split.splitSeconds <= avgPaceSecondsPerKm,
      km: split.km,
    };
  });

  const avgNorm = paceRange > 0 ? 1 - (avgPaceSecondsPerKm - minPace) / paceRange : 0.65;
  const refY = baseline - barsH * Math.max(0, Math.min(1, avgNorm));

  let elevPts: string | undefined;
  if (elevations) {
    const elMin = Math.min(...elevations);
    const elMax = Math.max(...elevations);
    const elRange = elMax - elMin || 1;
    const elBase = PAD_T + barsH + EL_H;
    const pts = elevations.map((alt, i) => {
      const x = PAD_H + (i + 0.5) * barW;
      const y = elBase - EL_H * ((alt - elMin) / elRange);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    elevPts = `${PAD_H},${elBase} ${pts.join(' ')} ${(PAD_H + n * barW).toFixed(1)},${elBase}`;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SPLITS</Text>
        <Text style={styles.avg}>Avg {formatPace(avgPaceSecondsPerKm)}</Text>
      </View>

      <View onLayout={onLayout}>
        <Svg width={w} height={CHART_H}>
          {bars.map((b) => (
            <Rect
              key={b.km} x={b.x} y={b.y} width={b.w} height={b.h} rx={2}
              fill={b.faster ? '#91e6a3' : '#ffb86b'} opacity={0.85}
            />
          ))}
          <Line
            x1={PAD_H} y1={refY} x2={w - PAD_H} y2={refY}
            stroke="#ffffff" strokeWidth={1} strokeDasharray="4 3" opacity={0.35}
          />
          {elevPts ? <Polygon points={elevPts} fill="#91e6a3" opacity={0.18} /> : null}
          {bars.map((b) => (
            <SvgText
              key={`l${b.km}`} x={b.x + b.w / 2} y={CHART_H - 6}
              textAnchor="middle" fill="#8fbf8f" fontSize={9} fontWeight="700"
            >
              {b.km}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, styles.dotGreen]} />
          <Text style={styles.legendText}>Faster than avg</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, styles.dotAmber]} />
          <Text style={styles.legendText}>Slower than avg</Text>
        </View>
      </View>

      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.cKm]}>KM</Text>
        <Text style={[styles.th, styles.cTime]}>SPLIT</Text>
        <Text style={[styles.th, styles.cTime]}>ELAPSED</Text>
        <Text style={[styles.th, styles.cPace]}>PACE</Text>
      </View>
      {splits.map((split) => (
        <View key={split.km} style={styles.row}>
          <Text style={[styles.td, styles.cKm]}>{split.km}</Text>
          <Text style={[styles.td, styles.cTime]}>{formatSplit(split.splitSeconds)}</Text>
          <Text style={[styles.td, styles.cTime]}>{formatSplit(split.elapsedSeconds)}</Text>
          <Text style={[styles.td, styles.cPace]}>{formatPace(split.splitSeconds)}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  avg: { color: '#aeb8aa', fontSize: 12, fontWeight: '800' },
  legend: { flexDirection: 'row', gap: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#91e6a3' },
  dotAmber: { backgroundColor: '#ffb86b' },
  legendText: { color: '#8fbf8f', fontSize: 11, fontWeight: '800' },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#203529', paddingBottom: 5 },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a2c20' },
  th: { color: '#8fbf8f', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  td: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  cKm: { width: 32 },
  cTime: { flex: 1 },
  cPace: { flex: 1, textAlign: 'right' },
});
