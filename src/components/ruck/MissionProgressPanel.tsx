import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { buildLiveRuckSafetyAlerts } from '@/src/utils/ruckSafety';
import type { RuckMissionDraft } from './MissionSetupPanel';
import { formatDuration, getNumberInput, progressPercent } from './ruckPanelUtils';

function TacticalBar({ value, color = '#91e6a3' }: { value: number; color?: string }) {
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: { flex: 1, height: 5, borderRadius: 2, backgroundColor: '#0d1a12', overflow: 'hidden', borderWidth: 1, borderColor: '#172c20' },
  fill: { height: '100%', borderRadius: 2 },
});

export const MissionProgressPanel = memo(function MissionProgressPanel({
  draft,
  distanceKm,
  elapsedSeconds,
  gpsQualityWarning,
}: {
  draft: RuckMissionDraft;
  distanceKm: number;
  elapsedSeconds: number;
  gpsQualityWarning: string | null;
}) {
  const targetDistance = Math.max(0, getNumberInput(draft.targetDistanceKm, 0));
  const targetMinutes = Math.max(0, getNumberInput(draft.targetMinutes, 0));
  const checkpointInterval = Math.max(0, getNumberInput(draft.checkpointIntervalKm, 1));
  const packWeight = Math.max(0, getNumberInput(draft.packWeightKg, 0));

  const elapsedMinutes = elapsedSeconds / 60;
  const distPct = progressPercent(distanceKm, targetDistance);
  const timePct = progressPercent(elapsedMinutes, targetMinutes);

  const nextCheckpoint = checkpointInterval > 0
    ? Math.ceil(Math.max(distanceKm, 0.01) / checkpointInterval) * checkpointInterval : 0;
  const remainingKm = Math.max(0, targetDistance - distanceKm);

  const targetPace = targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : 0;
  const currentPace = distanceKm > 0 ? elapsedMinutes / distanceKm : 0;
  const paceDelta = currentPace > 0 && targetPace > 0 ? currentPace - targetPace : 0;
  const projectedFinish = currentPace > 0 && targetDistance > 0 ? currentPace * targetDistance : 0;
  const projectedDelta = projectedFinish > 0 && targetMinutes > 0 ? projectedFinish - targetMinutes : 0;

  const riskLevel =
    gpsQualityWarning || projectedDelta > 10 || packWeight >= 25 ? 'RED'
    : projectedDelta > 5 || packWeight >= 18 ? 'AMBER' : 'GREEN';

  const riskColor =
    riskLevel === 'RED' ? '#e05050' : riskLevel === 'AMBER' ? '#ffaa44' : '#91e6a3';

  const riskAdvice =
    riskLevel === 'RED'
      ? gpsQualityWarning ? '⚠ GPS WEAK — REDUCE SPEED' : '⚠ REDUCE PACE · HIGH LOAD'
      : riskLevel === 'AMBER' ? '◆ MONITOR EFFORT · STAY HYDRATED'
      : '✓ WITHIN PLAN · MAINTAIN PACE';

  const alerts = buildLiveRuckSafetyAlerts({
    distanceKm, elapsedSeconds,
    targetDistanceKm: targetDistance, targetMinutes, packWeightKg: packWeight, gpsQualityWarning,
  }).slice(0, 1);

  return (
    <View style={styles.panel}>
      <View style={[styles.accentBar, { backgroundColor: riskColor }]} />
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>MISSION PROGRESS</Text>
          <Text style={styles.meta}>{remainingKm.toFixed(1)} km left · {draft.packWeightKg || '0'} kg</Text>
        </View>

        {/* Progress bars */}
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>DIST</Text>
          <TacticalBar value={distPct} color="#91e6a3" />
          <Text style={styles.barPct}>{Math.round(distPct)}%</Text>
        </View>
        <View style={styles.barDetail}>
          <Text style={styles.barDetailText}>{distanceKm.toFixed(2)} / {targetDistance} km</Text>
        </View>

        <View style={styles.barRow}>
          <Text style={styles.barLabel}>TIME</Text>
          <TacticalBar value={timePct} color={timePct > distPct + 10 ? '#ffaa44' : '#3fc8e4'} />
          <Text style={styles.barPct}>{Math.round(timePct)}%</Text>
        </View>
        <View style={styles.barDetail}>
          <Text style={styles.barDetailText}>{formatDuration(Math.round(elapsedMinutes))} / {formatDuration(targetMinutes)}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.divider} />
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>PACE vs TGT</Text>
            <Text style={[styles.statValue, paceDelta > 0.5 && { color: '#ffaa44' }]}>
              {paceDelta !== 0 ? `${paceDelta > 0 ? '+' : ''}${paceDelta.toFixed(1)} min/km` : 'ON PACE'}
            </Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>PROJ FINISH</Text>
            <Text style={[styles.statValue, projectedDelta > 5 && { color: '#ffaa44' }]}>
              {projectedFinish > 0 ? formatDuration(Math.round(projectedFinish)) : '--'}
              {projectedDelta !== 0 && projectedFinish > 0 ? ` (${projectedDelta > 0 ? '+' : ''}${Math.round(projectedDelta)}m)` : ''}
            </Text>
          </View>
          {nextCheckpoint > 0 && (
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>CHECKPOINT</Text>
              <Text style={styles.statValue}>{nextCheckpoint.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        {/* Risk */}
        <View style={styles.divider} />
        <View style={styles.riskRow}>
          <View style={[styles.riskBadge, { borderColor: riskColor + '55', backgroundColor: riskColor + '18' }]}>
            <Text style={[styles.riskText, { color: riskColor }]}>{riskLevel}</Text>
          </View>
          <Text style={[styles.riskAdvice, { color: riskColor }]}>{riskAdvice}</Text>
        </View>

        {alerts.map((a) => (
          <View key={a.id} style={[styles.alert, a.level === 'danger' ? styles.alertDanger : styles.alertWarn]}>
            <Text style={styles.alertTitle}>{a.title}</Text>
            <Text style={styles.alertMsg} numberOfLines={2}>{a.message}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: 'rgba(5,14,9,0.96)' },
  accentBar: { width: 3, flexShrink: 0 },
  inner: { flex: 1, padding: 14, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#3a6b46', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  meta: { color: '#7a9480', fontSize: 10, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 30, color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  barPct: { width: 28, color: '#edf5ea', fontSize: 10, fontWeight: '900', textAlign: 'right' },
  barDetail: { marginTop: -6, paddingLeft: 38 },
  barDetailText: { color: '#5a7a62', fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#172c20' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBlock: { flex: 1, gap: 2 },
  statLabel: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  statValue: { color: '#edf5ea', fontSize: 12, fontWeight: '900' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskBadge: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  riskText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  riskAdvice: { flex: 1, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  alert: { borderRadius: 4, borderWidth: 1, padding: 8, gap: 2, borderLeftWidth: 3 },
  alertWarn: { backgroundColor: '#110c06', borderColor: '#3a2210', borderLeftColor: '#ffaa44' },
  alertDanger: { backgroundColor: '#140808', borderColor: '#4a1a1a', borderLeftColor: '#e05050' },
  alertTitle: { color: '#edf5ea', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  alertMsg: { color: '#7a9480', fontSize: 11, lineHeight: 15 },
});
