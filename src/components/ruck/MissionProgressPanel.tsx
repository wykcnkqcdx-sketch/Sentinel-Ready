import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { buildLiveRuckSafetyAlerts } from '@/src/utils/ruckSafety';
import type { RuckMissionDraft } from './MissionSetupPanel';
import { formatDuration, getNumberInput, progressPercent } from './ruckPanelUtils';

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
  const elapsedMinutes = elapsedSeconds / 60;
  const distanceProgress = progressPercent(distanceKm, targetDistance);
  const timeProgress = progressPercent(elapsedMinutes, targetMinutes);
  const nextCheckpoint = checkpointInterval > 0
    ? Math.ceil(Math.max(distanceKm, 0.01) / checkpointInterval) * checkpointInterval
    : 0;
  const remainingKm = Math.max(0, targetDistance - distanceKm);
  const targetPace = targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : 0;
  const currentPace = distanceKm > 0 ? elapsedMinutes / distanceKm : 0;
  const paceDelta = currentPace > 0 && targetPace > 0 ? currentPace - targetPace : 0;
  const projectedFinishMinutes = currentPace > 0 && targetDistance > 0 ? currentPace * targetDistance : 0;
  const projectedDelta = projectedFinishMinutes > 0 && targetMinutes > 0
    ? projectedFinishMinutes - targetMinutes
    : 0;
  const packWeight = Math.max(0, getNumberInput(draft.packWeightKg, 0));
  const riskLevel =
    gpsQualityWarning || projectedDelta > 10 || packWeight >= 25 ? 'RED'
    : projectedDelta > 5 || packWeight >= 18 ? 'AMBER'
    : 'GREEN';
  const riskStyle = riskLevel === 'RED'
    ? styles.riskRed
    : riskLevel === 'AMBER'
      ? styles.riskAmber
      : styles.riskGreen;
  const riskTextStyle = riskLevel === 'GREEN' ? styles.riskTextDark : styles.riskTextLight;
  const alerts = buildLiveRuckSafetyAlerts({
    distanceKm,
    elapsedSeconds,
    targetDistanceKm: targetDistance,
    targetMinutes,
    packWeightKg: packWeight,
    gpsQualityWarning,
  }).slice(0, 2);

  return (
    <View style={styles.progressPanel} pointerEvents="none">
      <View style={styles.progressHeader}>
        <Text style={styles.missionKicker}>MISSION PROGRESS</Text>
        <Text style={styles.progressMeta}>
          {remainingKm.toFixed(1)} km left · {draft.packWeightKg || '0'} kg
        </Text>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>DIST</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${distanceProgress}%` }]} />
        </View>
        <Text style={styles.progressValue}>{Math.round(distanceProgress)}%</Text>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>TIME</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFillWarn, { width: `${timeProgress}%` }]} />
        </View>
        <Text style={styles.progressValue}>{Math.round(timeProgress)}%</Text>
      </View>
      <Text style={styles.progressHint}>
        Next checkpoint {nextCheckpoint > 0 ? `${nextCheckpoint.toFixed(1)} km` : '--'}
        {paceDelta !== 0 ? ` · ${paceDelta > 0 ? '+' : ''}${Math.abs(paceDelta).toFixed(1)} min/km target` : ''}
      </Text>
      <Text style={projectedDelta > 0 ? styles.progressWarn : styles.progressGood}>
        Projected finish {projectedFinishMinutes > 0 ? formatDuration(Math.round(projectedFinishMinutes)) : '--'}
        {projectedDelta !== 0 ? ` · ${projectedDelta > 0 ? '+' : ''}${Math.round(projectedDelta)} min` : ''}
      </Text>
      <View style={styles.riskRow}>
        <Text style={styles.progressLabel}>RISK</Text>
        <View style={[styles.riskBadge, riskStyle]}>
          <Text style={riskTextStyle}>{riskLevel}</Text>
        </View>
        <Text style={styles.riskReason} numberOfLines={1}>
          {riskLevel === 'RED'
            ? gpsQualityWarning ? 'GPS weak' : 'Adjust pace/load'
            : riskLevel === 'AMBER'
              ? 'Monitor effort'
              : 'Within plan'}
        </Text>
      </View>
      {alerts.length > 0 ? (
        <View style={styles.alertStack}>
          {alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertRow,
                alert.level === 'danger'
                  ? styles.alertDanger
                  : alert.level === 'warning'
                    ? styles.alertWarning
                    : styles.alertInfo,
              ]}
            >
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertText} numberOfLines={2}>{alert.message}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  progressPanel: {
    backgroundColor: 'rgba(7,17,12,0.92)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    padding: 12,
    gap: 8,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  missionKicker: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  progressMeta: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressLabel: { width: 32, color: '#b8c0b0', fontSize: 9, fontWeight: '900' },
  progressTrack: { flex: 1, height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(181,133,44,0.12)' },
  progressFill: { height: '100%', backgroundColor: '#B5852C' },
  progressFillWarn: { height: '100%', backgroundColor: '#ffaa44' },
  progressValue: { width: 34, color: '#ffffff', fontSize: 10, fontWeight: '900', textAlign: 'right' },
  progressHint: { color: '#b8c0b0', fontSize: 11, fontWeight: '800' },
  progressGood: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  progressWarn: { color: '#ffaa44', fontSize: 11, fontWeight: '900' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  riskGreen: { backgroundColor: '#B5852C' },
  riskAmber: { backgroundColor: '#ffaa44' },
  riskRed: { backgroundColor: '#d1493f' },
  riskTextDark: { color: '#080c05', fontSize: 10, fontWeight: '900' },
  riskTextLight: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  riskReason: { flex: 1, color: '#b8c0b0', fontSize: 11, fontWeight: '800' },
  alertStack: { gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(181,133,44,0.12)', paddingTop: 8 },
  alertRow: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 7, gap: 2 },
  alertInfo: { backgroundColor: '#0c1008', borderColor: 'rgba(181,133,44,0.3)' },
  alertWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderColor: 'rgba(255,170,68,0.3)' },
  alertDanger: { backgroundColor: '#261010', borderColor: '#8a2f2a' },
  alertTitle: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  alertText: { color: '#c4cec0', fontSize: 11, lineHeight: 15, fontWeight: '700' },
});
