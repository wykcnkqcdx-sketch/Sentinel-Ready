import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import { SplitPaceChart } from '@/src/components/ruck/SplitPaceChart';
import { useTraining } from '@/src/screens/TrainingContext';
import { exportSessionAsCoT, loadFTSConfig } from '@/src/services/atak';
import type { TrainingSession } from '@/src/types/map';
import { exportSessionGpx } from '@/src/utils/gpxExport';
import { buildSavedRuckSafetyAlerts } from '@/src/utils/ruckSafety';
import { buildAAR, type AARLine } from '@/src/utils/aarUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function logToSession(log: ReturnType<typeof useTraining>['logs'][0]): TrainingSession {
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

function AARLineRow({ line }: { line: AARLine }) {
  const valueStyle = line.tone === 'good' ? styles.toneGood
    : line.tone === 'warn' ? styles.toneWarn
    : line.tone === 'bad' ? styles.toneBad
    : styles.toneNeutral;
  return (
    <View style={styles.aarLineRow}>
      <Text style={styles.aarLabel}>{line.label}</Text>
      <Text style={[styles.aarValue, valueStyle]}>{line.value}</Text>
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

  const aar = useMemo(() => log ? buildAAR(log) : null, [log]);
  const routePoints = log?.routePoints ?? [];
  const splits = log?.ruck?.splits ?? [];
  const canExportGpx = routePoints.length >= 2;
  const mission = log?.ruck?.mission;

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
    if (!log || !canExportGpx) {
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
    if (!log || !canExportGpx) {
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

  const handleShareAAR = useCallback(async () => {
    if (!aar) return;
    const lines = [
      '// AFTER ACTION REVIEW //',
      aar.title,
      `${aar.date}  ·  ${aar.operationRef}`,
      `OUTCOME: ${aar.outcome}`,
      '',
      ...aar.sections.flatMap((s) => [
        `--- ${s.heading} ---`,
        ...s.lines.map((l) => `${l.label}: ${l.value}`),
        '',
      ]),
    ];
    try { await Share.share({ message: lines.join('\n') }); } catch {}
  }, [aar]);

  if (isLoading) return <View style={styles.screen} />;

  if (!log || !log.ruck || !aar) {
    return (
      <View style={[styles.screen, styles.missingWrap]}>
        <Text style={styles.kicker}>AFTER ACTION REVIEW</Text>
        <Text style={styles.title}>Session not found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/ruck')}>
          <Text style={styles.primaryButtonText}>BACK TO RUCK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const outcomeBannerStyle = aar.outcomeTone === 'bad' ? styles.outcomeBad
    : aar.outcomeTone === 'warn' ? styles.outcomeWarn
    : styles.outcomeGood;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/ruck')}>
        <Text style={styles.backButtonText}>← RUCK</Text>
      </TouchableOpacity>

      <View style={styles.classificationBar}>
        <Text style={styles.classificationText}>{aar.classification}</Text>
      </View>

      <Text style={styles.kicker}>AFTER ACTION REVIEW</Text>
      <Text style={styles.title}>{aar.title}</Text>
      <Text style={styles.subtitle}>{aar.date} · {aar.operationRef}</Text>

      <View style={[styles.outcomeBanner, outcomeBannerStyle]}>
        <Text style={styles.outcomeLabel}>OUTCOME</Text>
        <Text style={styles.outcomeValue}>{aar.outcome}</Text>
      </View>

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportButton, (!canExportGpx || exportingGpx) && styles.exportButtonDisabled]}
          onPress={handleExportGpx}
          disabled={!canExportGpx || exportingGpx}
          accessibilityRole="button"
          accessibilityLabel="Export this ruck as GPX"
        >
          <Text style={styles.exportButtonText}>{exportingGpx ? 'EXPORTING...' : 'EXPORT GPX'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryExportButton, (!canExportGpx || exportingCot) && styles.exportButtonDisabled]}
          onPress={handleExportCot}
          disabled={!canExportGpx || exportingCot}
          accessibilityRole="button"
          accessibilityLabel="Export this ruck to ATAK as CoT"
        >
          <Text style={styles.secondaryExportButtonText}>{exportingCot ? 'SENDING...' : 'SEND CoT'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryExportButton}
          onPress={handleShareAAR}
          accessibilityRole="button"
          accessibilityLabel="Share AAR as text"
        >
          <Text style={styles.secondaryExportButtonText}>SHARE AAR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapFrame}>
        <RuckMapView
          routePoints={routePoints}
          currentPosition={routePoints[routePoints.length - 1] ?? null}
          layer="topo"
          zoom={15}
          showGpsStatus={false}
          interactive={false}
        />
      </View>

      {aar.sections.map((section) => (
        <View key={section.id} style={[
          styles.aarCard,
          section.id === 'sustain' ? styles.aarCardGood
          : section.id === 'improve' ? styles.aarCardWarn
          : styles.aarCard,
        ]}>
          <Text style={styles.aarHeading}>{section.heading}</Text>
          {section.lines.map((line, i) => <AARLineRow key={i} line={line} />)}
        </View>
      ))}

      {safetyAlerts.length > 0 && (
        <View style={styles.aarCard}>
          <Text style={styles.aarHeading}>⚠ SAFETY FLAGS</Text>
          {safetyAlerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.safetyAlert,
                alert.level === 'danger' ? styles.safetyDanger
                : alert.level === 'warning' ? styles.safetyWarning
                : styles.safetyInfo,
              ]}
            >
              <Text style={styles.safetyTitle}>{alert.title}</Text>
              <Text style={styles.safetyText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )}

      {splits.length > 0 && (
        <View style={styles.aarCard}>
          <Text style={styles.aarHeading}>SPLIT ANALYSIS</Text>
          <SplitPaceChart
            splits={splits}
            avgPaceSecondsPerKm={log.ruck.paceSecondsPerKm}
            routePoints={routePoints}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 18, paddingBottom: 90, gap: 12 },
  missingWrap: { padding: 20, justifyContent: 'center', gap: 14 },
  backButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#35523e', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonText: { color: '#c8f7d0', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  classificationBar: { backgroundColor: '#0d1a12', borderWidth: 1, borderColor: '#1a3a22', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  classificationText: { color: '#4e7558', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  kicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  title: { color: '#edf5ea', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#7a9480', fontSize: 13, fontWeight: '800' },
  outcomeBanner: { borderRadius: 4, borderWidth: 1, padding: 14, gap: 4 },
  outcomeGood: { backgroundColor: '#0a2010', borderColor: '#1e5c2c' },
  outcomeWarn: { backgroundColor: '#1c1308', borderColor: '#5c3a14' },
  outcomeBad: { backgroundColor: '#1c0808', borderColor: '#5c1a1a' },
  outcomeLabel: { color: '#4e7558', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  outcomeValue: { color: '#edf5ea', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exportButton: { alignSelf: 'flex-start', backgroundColor: '#91e6a3', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  exportButtonDisabled: { opacity: 0.45 },
  exportButtonText: { color: '#07110c', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  secondaryExportButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#35523e', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryExportButtonText: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  mapFrame: { height: 280, borderWidth: 1, borderColor: '#1e3826', overflow: 'hidden', borderRadius: 4 },
  aarCard: { backgroundColor: '#0a1610', borderRadius: 4, borderWidth: 1, borderColor: '#172c20', padding: 14, gap: 10 },
  aarCardGood: { backgroundColor: '#0a1a10', borderColor: '#1e4228' },
  aarCardWarn: { backgroundColor: '#130e06', borderColor: '#3d2a10' },
  aarHeading: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  aarLineRow: { gap: 3 },
  aarLabel: { color: '#4e7558', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  aarValue: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  toneGood: { color: '#91e6a3' },
  toneWarn: { color: '#ffaa44' },
  toneBad: { color: '#e05050' },
  toneNeutral: { color: '#c4cec0' },
  safetyAlert: { borderRadius: 4, borderWidth: 1, padding: 10, gap: 4 },
  safetyInfo: { backgroundColor: '#0a1610', borderColor: '#172c20' },
  safetyWarning: { backgroundColor: '#130e06', borderColor: '#5c3a14' },
  safetyDanger: { backgroundColor: '#1c0808', borderColor: '#5c1a1a' },
  safetyTitle: { color: '#edf5ea', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  safetyText: { color: '#c4cec0', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  primaryButton: { backgroundColor: '#91e6a3', borderRadius: 4, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#07110c', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
});
