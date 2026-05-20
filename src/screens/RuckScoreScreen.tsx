import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { calculateRuckScore } from '@/src/utils/ruckScore';
import { calculateEnhancedPandolf, buildH2FDomains } from '@/src/utils/h2f';
import type { TrainingSession, ReadinessLog } from '@/src/types/map';
import { getLatestReadinessLog } from '@/src/services/readinessService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDurationMinutes(duration: string): number {
  const colonMatch = duration.match(/(\d+):(\d+)/);
  if (colonMatch) {
    const result = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
    return Math.max(1, result);
  }
  let mins = 0;
  const hrMatch = duration.match(/(\d+)\s*hr/i);
  if (hrMatch) mins += parseInt(hrMatch[1], 10) * 60;
  const minMatch = duration.match(/(\d+)\s*min/i);
  if (minMatch) mins += parseInt(minMatch[1], 10);
  if (!hrMatch && !minMatch) {
    const numMatch = duration.match(/(\d+)/);
    if (numMatch) mins = parseInt(numMatch[1], 10);
  }
  return Math.max(1, mins);
}

function logToSession(log: TrainingLog): TrainingSession {
  const readiness = Math.max(1, Math.min(10, Number(log.readiness) || 5));
  const rpe = Math.max(1, Math.min(10, 11 - readiness));
  const loadMatch = log.distanceLoad.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const loadKg = loadMatch ? parseFloat(loadMatch[1]) : undefined;
  return {
    id: String(log.id),
    type: log.category as TrainingSession['type'],
    title: `${log.type} — ${log.distanceLoad}`,
    score: 0,
    completedAt: log.date + 'T12:00:00',
    durationMinutes: parseDurationMinutes(log.duration),
    rpe,
    loadKg,
  };
}

type RuckMetrics = {
  distKm: number;
  loadKg: number;
  mins: number;
  paceMinPerKm: number;
  speedKph: number;
};

function parseRuckMetrics(log: TrainingLog): RuckMetrics {
  const distMatch = log.distanceLoad.match(/(\d+(?:\.\d+)?)\s*km/i);
  const loadMatch = log.distanceLoad.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const distKm = distMatch ? parseFloat(distMatch[1]) : 0;
  const loadKg = loadMatch ? parseFloat(loadMatch[1]) : 0;
  const mins = parseDurationMinutes(log.duration);
  const paceMinPerKm = distKm > 0 && mins > 0 ? mins / distKm : 12;
  const speedKph = distKm > 0 && mins > 0 ? (distKm / mins) * 60 : 4.5;
  return { distKm, loadKg, mins, paceMinPerKm, speedKph };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERRAIN_OPTIONS = [
  { label: 'Road', value: 1.0 },
  { label: 'Trail', value: 1.1 },
  { label: 'Off-road', value: 1.2 },
  { label: 'Rough', value: 1.5 },
] as const;

const BODY_MASS_OPTIONS = [65, 70, 75, 80, 85, 90, 95, 100] as const;

// ---------------------------------------------------------------------------
// ScoreBar
// ---------------------------------------------------------------------------

function ScoreBar({ points, max, colour }: { points: number; max: number; colour: string }) {
  const pct = Math.min(100, (points / Math.max(1, max)) * 100);
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct}%` as any, backgroundColor: colour }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 3 },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function RuckScoreScreen() {
  const [terrainFactor, setTerrainFactor] = useState(1.0);
  const [bodyMassKg, setBodyMassKg] = useState(80);
  const [latestReadiness, setLatestReadiness] = useState<ReadinessLog | null>(null);
  const router = useRouter();

  const { logs } = useTraining();

  useEffect(() => {
    getLatestReadinessLog().then(setLatestReadiness);
  }, []);

  const ruckLogs = useMemo(
    () =>
      [...logs.filter(l => l.category === 'Ruck')].sort(
        (a, b) => b.date.localeCompare(a.date) || b.id - a.id
      ),
    [logs]
  );

  const latestRuck = useMemo(() => ruckLogs[0] ?? null, [ruckLogs]);
  const sessions = useMemo(() => logs.map(logToSession), [logs]);
  const latestMetrics = useMemo(() => (latestRuck ? parseRuckMetrics(latestRuck) : null), [latestRuck]);

  const pandolfResult = useMemo(() => {
    if (!latestMetrics || latestMetrics.distKm === 0) return null;
    return calculateEnhancedPandolf({
      bodyMassKg,
      loadKg: latestMetrics.loadKg,
      speedKph: latestMetrics.speedKph,
      gradePercent: 0,
      terrainFactor,
    });
  }, [latestMetrics, bodyMassKg, terrainFactor]);

  const ruckScore = useMemo(() => {
    if (!latestMetrics || latestMetrics.distKm === 0) return null;
    return calculateRuckScore({
      distanceKm: latestMetrics.distKm,
      loadKg: latestMetrics.loadKg,
      bodyMassKg,
      paceMinPerKm: latestMetrics.paceMinPerKm,
      ascentM: 0,
      terrainFactor,
    });
  }, [latestMetrics, bodyMassKg, terrainFactor]);

  const h2fDomains = useMemo(
    () => buildH2FDomains(sessions, latestReadiness ?? undefined),
    [sessions, latestReadiness],
  );
  const physicalDomain = useMemo(() => h2fDomains.find(d => d.id === 'physical') ?? null, [h2fDomains]);

  const scoreColour = !ruckScore
    ? '#A7ADB8'
    : ruckScore.score >= 82
    ? '#FC4C02'
    : ruckScore.score >= 68
    ? '#F5A623'
    : '#ff8080';

  if (ruckLogs.length === 0) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { justifyContent: 'center', flex: 1 }]}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No ruck sessions yet</Text>
          <Text style={styles.emptyText}>
            {'Log a ruck session with category "Ruck" and include distance in km and load in kg to see your Pandolf score and metabolic output.'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Header */}
      <Text style={styles.kicker}>PANDOLF EQUATION</Text>
      <Text style={styles.title}>Ruck Score</Text>
      <Text style={styles.subtitle}>
        Metabolic load, scoring factors and physical readiness from your latest ruck session.
      </Text>

      {/* Controls card */}
      <View style={styles.controlCard}>
        <Text style={styles.controlSectionLabel}>TERRAIN</Text>
        <View style={styles.pillRow}>
          {TERRAIN_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.pill, terrainFactor === opt.value && styles.pillActive]}
              onPress={() => setTerrainFactor(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: terrainFactor === opt.value }}
            >
              <Text style={[styles.pillText, terrainFactor === opt.value && styles.pillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.controlSectionLabel, { marginTop: 14 }]}>BODY MASS (kg)</Text>
        <View style={styles.pillRow}>
          {BODY_MASS_OPTIONS.map(kg => (
            <TouchableOpacity
              key={kg}
              style={[styles.pill, bodyMassKg === kg && styles.pillActive]}
              onPress={() => setBodyMassKg(kg)}
              accessibilityRole="radio"
              accessibilityState={{ selected: bodyMassKg === kg }}
            >
              <Text style={[styles.pillText, bodyMassKg === kg && styles.pillTextActive]}>
                {kg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {latestRuck && (
          <Text style={styles.controlHint}>
            Using: {latestRuck.date} · {latestRuck.distanceLoad}
          </Text>
        )}
      </View>

      {/* Score card */}
      {ruckScore && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeaderRow}>
            <View>
              <Text style={styles.scoreKicker}>RUCK SCORE</Text>
              <Text style={[styles.scoreBig, { color: scoreColour }]}>{ruckScore.score}</Text>
            </View>
            <View style={styles.scoreRight}>
              <Text style={styles.scoreSubLabel}>Load-adjusted pace</Text>
              <Text style={styles.scoreSubValue}>{ruckScore.loadAdjustedPace} min/km</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {ruckScore.factors.map(f => (
            <View key={f.label} style={styles.factorRow}>
              <View style={styles.factorLeft}>
                <Text style={styles.factorLabel}>{f.label}</Text>
                <Text style={styles.factorValue}>{f.value}</Text>
              </View>
              <ScoreBar
                points={f.points}
                max={22}
                colour={f.points >= 14 ? '#FC4C02' : f.points >= 8 ? '#F5A623' : '#ff8080'}
              />
              <Text style={styles.factorPoints}>{f.points}</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <Text style={styles.findingText}>{'⚡'} {ruckScore.finding}</Text>
          <Text style={styles.recommendationText}>{ruckScore.recommendation}</Text>
        </View>
      )}

      {/* Pandolf metabolic card */}
      {pandolfResult && (
        <View style={styles.pandolfCard}>
          <Text style={styles.pandolfKicker}>METABOLIC OUTPUT</Text>
          <View style={styles.pandolfStatRow}>
            <View style={styles.pandolfStat}>
              <Text style={styles.pandolfNumber}>{pandolfResult.wattsCorrected}</Text>
              <Text style={styles.pandolfLabel}>Watts</Text>
            </View>
            <View style={styles.pandolfDivider} />
            <View style={styles.pandolfStat}>
              <Text style={styles.pandolfNumber}>{pandolfResult.metabolicCostKcalHour}</Text>
              <Text style={styles.pandolfLabel}>kcal/hr</Text>
            </View>
            <View style={styles.pandolfDivider} />
            <View style={styles.pandolfStat}>
              <Text style={styles.pandolfNumber}>{Math.round(pandolfResult.loadRatio * 100)}%</Text>
              <Text style={styles.pandolfLabel}>Load ratio</Text>
            </View>
          </View>
          <Text style={styles.pandolfNote}>
            {pandolfResult.loadRatio >= 0.27
              ? 'Load exceeds 27% bodyweight — Pandolf correction applied.'
              : `Load is ${Math.round(pandolfResult.loadRatio * 100)}% of bodyweight — within standard range.`}
          </Text>
        </View>
      )}

      {/* H2F physical card */}
      {physicalDomain && (
        <View style={[styles.h2fCard, {
          borderColor: physicalDomain.status === 'GREEN' ? 'rgba(252,76,2,0.3)'
            : physicalDomain.status === 'AMBER' ? 'rgba(245,166,35,0.3)'
            : '#7a2020',
        }]}>
          <View style={styles.h2fHeaderRow}>
            <Text style={styles.h2fKicker}>H2F PHYSICAL</Text>
            <View style={[styles.h2fBadge, {
              backgroundColor: physicalDomain.status === 'GREEN' ? '#0d2e18'
                : physicalDomain.status === 'AMBER' ? '#2a1f0d'
                : '#2a0d0d',
            }]}>
              <Text style={[styles.h2fBadgeText, {
                color: physicalDomain.status === 'GREEN' ? '#FC4C02'
                  : physicalDomain.status === 'AMBER' ? '#F5A623'
                  : '#ff8080',
              }]}>{physicalDomain.status}</Text>
            </View>
          </View>
          <Text style={styles.h2fValue}>{physicalDomain.value}</Text>
          <Text style={styles.h2fDetail}>{physicalDomain.detail}</Text>
        </View>
      )}

      {/* Check-in link */}
      <TouchableOpacity
        style={styles.checkInLink}
        onPress={() => router.push('/check-in')}
        accessibilityRole="button"
        accessibilityLabel="Log today's check-in"
      >
        <Text style={styles.checkInLinkText}>
          {latestReadiness && latestReadiness.date === new Date().toISOString().slice(0, 10)
            ? '✓ Check-in logged today'
            : "Log today's check-in →"}
        </Text>
      </TouchableOpacity>

      {/* Recent sessions summary */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Ruck Sessions</Text>
        <Text style={styles.sectionTag}>{ruckLogs.length} TOTAL</Text>
      </View>

      {ruckLogs.slice(0, 8).map(log => {
        const m = parseRuckMetrics(log);
        const s = m.distKm > 0
          ? calculateRuckScore({
              distanceKm: m.distKm,
              loadKg: m.loadKg,
              bodyMassKg,
              paceMinPerKm: m.paceMinPerKm,
              ascentM: 0,
              terrainFactor,
            })
          : null;
        const sc = s?.score ?? null;
        const scColour = !sc
          ? '#A7ADB8'
          : sc >= 82
          ? '#FC4C02'
          : sc >= 68
          ? '#F5A623'
          : '#ff8080';
        return (
          <View key={log.id} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyDate}>{log.date}</Text>
              <Text style={styles.historyDetail}>
                {m.distKm > 0 ? `${m.distKm} km` : '—'}
                {m.loadKg > 0 ? ` · ${m.loadKg} kg` : ''}
                {m.paceMinPerKm > 0 ? ` · ${m.paceMinPerKm.toFixed(1)} min/km` : ''}
              </Text>
            </View>
            {sc !== null && (
              <Text style={[styles.historyScore, { color: scColour }]}>{sc}</Text>
            )}
          </View>
        );
      })}

    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  kicker: { color: '#FC4C02', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#A7ADB8', fontSize: 15, lineHeight: 22 },

  emptyCard: { backgroundColor: '#1E2229', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  emptyText: { color: '#A7ADB8', fontSize: 14, lineHeight: 21 },

  controlCard: { backgroundColor: '#1E2229', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  controlSectionLabel: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pillActive: { backgroundColor: 'rgba(252,76,2,0.3)', borderColor: 'rgba(252,76,2,0.3)' },
  pillText: { color: '#A7ADB8', fontSize: 12, fontWeight: '900' },
  pillTextActive: { color: '#FFFFFF' },
  controlHint: { color: '#A7ADB8', fontSize: 11, marginTop: 4 },

  scoreCard: { backgroundColor: '#252B35', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', gap: 12 },
  scoreHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  scoreKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  scoreBig: { fontSize: 56, fontWeight: '900', lineHeight: 60 },
  scoreRight: { alignItems: 'flex-end', gap: 3 },
  scoreSubLabel: { color: '#A7ADB8', fontSize: 10, fontWeight: '800' },
  scoreSubValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factorLeft: { width: 110, gap: 1 },
  factorLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  factorValue: { color: '#A7ADB8', fontSize: 11 },
  factorPoints: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', width: 24, textAlign: 'right' },
  findingText: { color: '#F5A623', fontSize: 13, fontWeight: '800', lineHeight: 20 },
  recommendationText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  pandolfCard: { backgroundColor: '#1E2229', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  pandolfKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  pandolfStatRow: { flexDirection: 'row', alignItems: 'center' },
  pandolfStat: { flex: 1, alignItems: 'center', gap: 4 },
  pandolfNumber: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  pandolfLabel: { color: '#A7ADB8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  pandolfDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  pandolfNote: { color: '#A7ADB8', fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 10 },

  h2fCard: { backgroundColor: '#1E2229', borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  h2fHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2fKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  h2fBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  h2fBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  h2fValue: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  h2fDetail: { color: '#A7ADB8', fontSize: 13, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  sectionTag: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderColor: '#274b32', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },

  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E2229', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  historyLeft: { gap: 3 },
  historyDate: { color: '#A7ADB8', fontSize: 12, fontWeight: '800' },
  historyDetail: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  historyScore: { fontSize: 22, fontWeight: '900' },

  checkInLink: { backgroundColor: '#0d2e18', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)' },
  checkInLinkText: { color: '#FC4C02', fontSize: 13, fontWeight: '900' },
});
