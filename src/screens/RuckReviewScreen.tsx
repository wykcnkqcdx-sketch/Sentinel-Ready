import { DS } from '@/constants/theme';
import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { exportSessionAsCoT, loadFTSConfig } from '@/src/services/atak';
import type { TrainingSession } from '@/src/types/map';
import { exportSessionGpx } from '@/src/utils/gpxExport';
import { buildSavedRuckSafetyAlerts } from '@/src/utils/ruckSafety';
import { isFatigueWatch } from '@/src/utils/trainingLogUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m ${String(secs).padStart(2, '0')}s`;
}

function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

function formatMinutes(minutes: number): string {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m`;
}

function getRecoveryWarning(log: TrainingLog): { tone: 'good' | 'warn'; text: string } {
  const rpe = log.ruck?.rpe ?? 0;
  const confidence = log.ruck?.routeConfidence ?? 'High';

  if (isFatigueWatch(log.readiness) || rpe >= 8) {
    return {
      tone: 'warn',
      text: 'High strain signal. Prioritize sleep, hydration, foot care, and an easy recovery day before another loaded session.',
    };
  }

  if (confidence === 'Low') {
    return {
      tone: 'warn',
      text: 'GPS confidence was low. Use the session for effort notes, but avoid making distance progression decisions from this route alone.',
    };
  }

  return {
    tone: 'good',
    text: 'Recovery signal looks manageable. Check feet and calves tonight, then progress only one variable next session.',
  };
}

function getNextRecommendation(log: TrainingLog): string {
  const distance = log.ruck?.distanceKm ?? 0;
  const load = log.ruck?.packWeightKg ?? 0;
  const rpe = log.ruck?.rpe ?? 0;
  const readiness = Number(log.readiness) || 0;

  if (readiness <= 5 || rpe >= 8) {
    return `Hold at ${distance.toFixed(1)} km and ${load.toFixed(0)} kg. Keep the next ruck easy and stop if lower-leg pain or hot spots show up.`;
  }

  if (distance < 10) {
    return `Add up to 1 km next time while holding load at ${load.toFixed(0)} kg. Keep pace conversational and posture strict.`;
  }

  return `Hold distance near ${distance.toFixed(1)} km. If recovery is good, add 1-2 kg or improve pace slightly, but not both.`;
}

function getMissionOutcome(log: TrainingLog): { label: string; tone: 'good' | 'warn' | 'bad'; text: string } {
  const mission = log.ruck?.mission;
  const ruck = log.ruck;
  if (!ruck || !mission) {
    return {
      label: 'Baseline',
      tone: 'good',
      text: 'No mission target was stored for this ruck. Use this session as a baseline for the next planned effort.',
    };
  }

  const distanceMet = ruck.distanceKm >= mission.targetDistanceKm * 0.98;
  const timeMet = ruck.durationSeconds / 60 <= mission.targetMinutes * 1.05;
  const gpsOk = ruck.routeConfidence !== 'Low';
  const effortHigh = ruck.rpe >= 8 || isFatigueWatch(log.readiness);

  if (distanceMet && timeMet && gpsOk && !effortHigh) {
    return {
      label: 'Mission Met',
      tone: 'good',
      text: 'Distance and time were inside target with usable GPS confidence. This is a clean progression point.',
    };
  }

  if (!gpsOk || effortHigh) {
    return {
      label: 'Review Required',
      tone: 'bad',
      text: !gpsOk
        ? 'GPS confidence was low, so avoid using this route as a hard progression benchmark.'
        : 'Effort or readiness suggests this was a high strain session. Hold load and distance next time.',
    };
  }

  return {
    label: 'Partial',
    tone: 'warn',
    text: distanceMet
      ? 'Distance was met, but time was outside target. Hold distance and improve pace before adding load.'
      : 'Time was controlled, but distance target was missed. Repeat the mission before progressing.',
  };
}

function logToSession(log: TrainingLog): TrainingSession {
  return {
    id: String(log.id),
    type: 'Ruck',
    title: `${log.type} - ${log.distanceLoad}`,
    score: 0,
    durationMinutes: Math.round((log.ruck?.durationSeconds ?? 0) / 60),
    rpe: log.ruck?.rpe ?? 6,
    loadKg: log.ruck?.packWeightKg,
    routePoints: log.routePoints,
    note: log.notes,
    routeConfidence: log.ruck?.routeConfidence,
    rejectedPointCount: log.ruck?.rejectedPointCount,
    averageAccuracyMeters: log.ruck?.averageAccuracyMeters,
    completedAt: `${log.date}T12:00:00`,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function RuckReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { logs, isLoading } = useTraining();
  const [exportingGpx, setExportingGpx] = useState(false);
  const [exportingCot, setExportingCot] = useState(false);
  const logId = Number(id);

  const log = useMemo(
    () => logs.find((entry) => entry.id === logId && entry.category === 'Ruck') ?? null,
    [logs, logId],
  );

  const recovery = log ? getRecoveryWarning(log) : null;
  const recommendation = log ? getNextRecommendation(log) : null;
  const routePoints = useMemo(() => log?.routePoints ?? [], [log]);
  const splits = log?.ruck?.splits ?? [];
  const confidence = log?.ruck?.routeConfidence ?? 'High';
  const rejected = log?.ruck?.rejectedPointCount ?? 0;
  const averageAccuracy = log?.ruck?.averageAccuracyMeters;
  const canExportGpx = routePoints.length >= 2;
  const mission = log?.ruck?.mission;
  const outcome = log ? getMissionOutcome(log) : null;
  const actualMinutes = log?.ruck ? log.ruck.durationSeconds / 60 : 0;
  const distanceDelta = mission && log?.ruck ? log.ruck.distanceKm - mission.targetDistanceKm : 0;
  const timeDelta = mission ? actualMinutes - mission.targetMinutes : 0;
  const safetyAlerts = log?.ruck ? buildSavedRuckSafetyAlerts({
    distanceKm: log.ruck.distanceKm,
    elapsedSeconds: log.ruck.durationSeconds,
    targetDistanceKm: mission?.targetDistanceKm ?? 0,
    targetMinutes: mission?.targetMinutes ?? 0,
    packWeightKg: log.ruck.packWeightKg,
    gpsQualityWarning: null,
    readiness: Number(log.readiness) || 0,
    rpe: log.ruck.rpe,
    routeConfidence: log.ruck.routeConfidence ?? 'High',
  }) : [];

  const handleExportGpx = useCallback(async () => {
    if (!log) return;
    if (!canExportGpx) {
      Alert.alert('No Route Data', 'This ruck does not have enough GPS points to export as GPX.');
      return;
    }

    setExportingGpx(true);
    try {
      await exportSessionGpx(logToSession(log));
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Could not export GPX.');
    } finally {
      setExportingGpx(false);
    }
  }, [canExportGpx, log]);

  const handleExportCot = useCallback(async () => {
    if (!log) return;
    if (!canExportGpx) {
      Alert.alert('No Route Data', 'This ruck does not have enough GPS points to export to ATAK.');
      return;
    }

    setExportingCot(true);
    try {
      const config = await loadFTSConfig();
      if (!config?.host) {
        Alert.alert('ATAK Not Configured', 'Open the ATAK screen and configure your FreeTAKServer host before exporting CoT.');
        return;
      }

      const result = await exportSessionAsCoT(config, routePoints, log.notes);
      Alert.alert(
        'CoT Export Complete',
        `Sent ${result.sent} track points to ${config.host}.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
      );
    } catch (error) {
      Alert.alert('CoT Export Failed', error instanceof Error ? error.message : 'Could not export to ATAK.');
    } finally {
      setExportingCot(false);
    }
  }, [canExportGpx, log, routePoints]);

  if (isLoading) return <View style={styles.screen} />;

  if (!log || !log.ruck) {
    return (
      <View style={[styles.screen, styles.missingWrap]}>
        <Text style={styles.kicker}>MISSION COMPLETE DEBRIEF</Text>
        <Text style={styles.title}>Session not found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/ruck')}>
          <Text style={styles.primaryButtonText}>Back to Ruck</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/ruck')}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.kicker}>MISSION COMPLETE DEBRIEF</Text>
      <Text style={styles.title}>{log.type}</Text>
      <Text style={styles.subtitle}>{log.date}</Text>

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportButton, (!canExportGpx || exportingGpx) && styles.exportButtonDisabled]}
          onPress={handleExportGpx}
          disabled={!canExportGpx || exportingGpx}
          accessibilityRole="button"
          accessibilityLabel="Export this ruck as GPX"
        >
          <Text style={styles.exportButtonText}>{exportingGpx ? 'Exporting...' : 'Export GPX'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryExportButton, (!canExportGpx || exportingCot) && styles.exportButtonDisabled]}
          onPress={handleExportCot}
          disabled={!canExportGpx || exportingCot}
          accessibilityRole="button"
          accessibilityLabel="Export this ruck to ATAK as CoT"
        >
          <Text style={styles.secondaryExportButtonText}>{exportingCot ? 'Sending...' : 'Send CoT'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapFrame}>
        <RuckMapView
          routePoints={routePoints}
          currentPosition={routePoints[routePoints.length - 1] ?? null}
          layer="topo"
          zoom={15}
          showGpsStatus={false}
        />
      </View>

      <View style={styles.statGrid}>
        <Stat label="Distance" value={`${log.ruck.distanceKm.toFixed(2)} km`} />
        <Stat label="Duration" value={formatDuration(log.ruck.durationSeconds)} />
        <Stat label="Pace" value={formatPace(log.ruck.paceSecondsPerKm)} />
        <Stat label="Pack" value={`${log.ruck.packWeightKg.toFixed(0)} kg`} />
        <Stat label="RPE" value={`${log.ruck.rpe}/10`} />
        <Stat label="Readiness" value={`${log.readiness}/10`} />
      </View>

      {outcome ? (
        <View style={
          outcome.tone === 'bad' ? styles.badCard
          : outcome.tone === 'warn' ? styles.warnCard
          : styles.card
        }>
          <Text style={styles.cardKicker}>SESSION OUTCOME</Text>
          <Text style={styles.cardTitle}>{outcome.label}</Text>
          <Text style={styles.cardText}>{outcome.text}</Text>
        </View>
      ) : null}

      {mission ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>PLANNED VS ACTUAL</Text>
          <View style={styles.planRow}>
            <View style={styles.planStat}>
              <Text style={styles.planLabel}>Distance</Text>
              <Text style={styles.planValue}>
                {log.ruck.distanceKm.toFixed(2)} / {mission.targetDistanceKm.toFixed(1)} km
              </Text>
              <Text style={distanceDelta >= 0 ? styles.planGood : styles.planWarn}>
                {distanceDelta >= 0 ? '+' : ''}{distanceDelta.toFixed(2)} km
              </Text>
            </View>
            <View style={styles.planStat}>
              <Text style={styles.planLabel}>Time</Text>
              <Text style={styles.planValue}>
                {formatMinutes(actualMinutes)} / {formatMinutes(mission.targetMinutes)}
              </Text>
              <Text style={timeDelta <= 0 ? styles.planGood : styles.planWarn}>
                {timeDelta > 0 ? '+' : ''}{Math.round(timeDelta)} min
              </Text>
            </View>
            <View style={styles.planStat}>
              <Text style={styles.planLabel}>Checkpoints</Text>
              <Text style={styles.planValue}>{mission.checkpointIntervalKm.toFixed(1)} km</Text>
              <Text style={styles.planMeta}>interval</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={confidence === 'Low' ? styles.warnCard : styles.card}>
        <Text style={styles.cardKicker}>GPS CONFIDENCE</Text>
        <Text style={styles.cardTitle}>{confidence}</Text>
        <Text style={styles.cardText}>
          {rejected} rejected points
          {averageAccuracy != null ? ` · ${averageAccuracy.toFixed(1)} m avg accuracy` : ''}
          {routePoints.length > 0 ? ` · ${routePoints.length} route points` : ''}
        </Text>
      </View>

      <View style={recovery?.tone === 'warn' ? styles.warnCard : styles.card}>
        <Text style={styles.cardKicker}>RECOVERY WARNING</Text>
        <Text style={styles.cardText}>{recovery?.text}</Text>
      </View>

      {safetyAlerts.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>SAFETY ALERTS</Text>
          {safetyAlerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.safetyAlert,
                alert.level === 'danger'
                  ? styles.safetyDanger
                  : alert.level === 'warning'
                    ? styles.safetyWarning
                    : styles.safetyInfo,
              ]}
            >
              <Text style={styles.safetyTitle}>{alert.title}</Text>
              <Text style={styles.safetyText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardKicker}>NEXT RUCK</Text>
        <Text style={styles.cardText}>{recommendation}</Text>
      </View>

      {splits.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>SPLITS</Text>
          {splits.map((split) => (
            <View key={split.km} style={styles.splitRow}>
              <Text style={styles.splitKm}>{split.km} km</Text>
              <Text style={styles.splitText}>{formatDuration(split.splitSeconds)}</Text>
              <Text style={styles.splitText}>{formatDuration(split.elapsedSeconds)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {log.notes ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>NOTES</Text>
          <Text style={styles.cardText}>{log.notes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.bgPrimary },
  content: { padding: 10, paddingBottom: 90, gap: 12, maxWidth: 820, width: '100%', alignSelf: 'center' },
  missingWrap: { padding: 20, justifyContent: 'center', gap: 14 },
  backButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(181,133,44,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: DS.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 2.2 },
  title: { color: DS.goldSoft, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: DS.textSecondary, fontSize: 14, fontWeight: '800' },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exportButton: { alignSelf: 'flex-start', backgroundColor: DS.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  exportButtonDisabled: { opacity: 0.45 },
  exportButtonText: { color: '#080c05', fontSize: 13, fontWeight: '900' },
  secondaryExportButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: DS.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryExportButtonText: { color: DS.gold, fontSize: 13, fontWeight: '900' },
  mapFrame: { height: 320, borderWidth: 1, borderColor: DS.borderHighlight, overflow: 'hidden', backgroundColor: '#080c05' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31%', minWidth: 104, backgroundColor: DS.bgCard, borderWidth: 1, borderColor: DS.border, borderRadius: 8, padding: 12, gap: 4 },
  statValue: { color: DS.textPrimary, fontSize: 18, fontWeight: '900' },
  statLabel: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  card: { backgroundColor: DS.bgCard, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: DS.border, gap: 8 },
  warnCard: { backgroundColor: DS.bgWarn, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: DS.borderWarn, gap: 8 },
  badCard: { backgroundColor: '#261010', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#8a2f2a', gap: 8 },
  cardKicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardTitle: { color: DS.textPrimary, fontSize: 22, fontWeight: '900' },
  cardText: { color: DS.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  planRow: { flexDirection: 'row', gap: 10 },
  planStat: { flex: 1, gap: 4 },
  planLabel: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  planValue: { color: DS.textPrimary, fontSize: 14, fontWeight: '900' },
  planGood: { color: DS.gold, fontSize: 11, fontWeight: '900' },
  planWarn: { color: DS.warning, fontSize: 11, fontWeight: '900' },
  planMeta: { color: DS.textSecondary, fontSize: 11, fontWeight: '800' },
  safetyAlert: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 4 },
  safetyInfo: { backgroundColor: DS.bgCard, borderColor: DS.borderHighlight },
  safetyWarning: { backgroundColor: DS.bgWarn, borderColor: DS.borderWarn },
  safetyDanger: { backgroundColor: '#261010', borderColor: '#8a2f2a' },
  safetyTitle: { color: DS.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  safetyText: { color: DS.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: DS.border, paddingTop: 8, gap: 10 },
  splitKm: { color: DS.textPrimary, fontSize: 13, fontWeight: '900' },
  splitText: { color: DS.textSecondary, fontSize: 13, fontWeight: '800' },
  primaryButton: { backgroundColor: DS.gold, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#080c05', fontSize: 14, fontWeight: '900' },
});
