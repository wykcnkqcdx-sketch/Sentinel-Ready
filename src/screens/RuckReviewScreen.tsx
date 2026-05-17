import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { isFatigueWatch } from '@/src/utils/trainingLogUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

function getRecoveryWarning(log: TrainingLog): { tone: 'good' | 'warn'; text: string } {
  const rpe = log.ruck?.rpe ?? 0;
  const readiness = Number(log.readiness) || 0;
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
  const logId = Number(id);

  const log = useMemo(
    () => logs.find((entry) => entry.id === logId && entry.category === 'Ruck') ?? null,
    [logs, logId],
  );

  const recovery = log ? getRecoveryWarning(log) : null;
  const recommendation = log ? getNextRecommendation(log) : null;
  const routePoints = log?.routePoints ?? [];
  const splits = log?.ruck?.splits ?? [];
  const confidence = log?.ruck?.routeConfidence ?? 'High';
  const rejected = log?.ruck?.rejectedPointCount ?? 0;
  const averageAccuracy = log?.ruck?.averageAccuracyMeters;

  if (isLoading) return <View style={styles.screen} />;

  if (!log || !log.ruck) {
    return (
      <View style={[styles.screen, styles.missingWrap]}>
        <Text style={styles.kicker}>RUCK REVIEW</Text>
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

      <Text style={styles.kicker}>RUCK REVIEW</Text>
      <Text style={styles.title}>{log.type}</Text>
      <Text style={styles.subtitle}>{log.date}</Text>

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
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 18, paddingBottom: 90, gap: 14 },
  missingWrap: { padding: 20, justifyContent: 'center', gap: 14 },
  backButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 2.2 },
  title: { color: '#ffffff', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, fontWeight: '800' },
  mapFrame: { height: 320, borderWidth: 1, borderColor: '#2f6b3c', overflow: 'hidden', backgroundColor: '#07110c' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31%', minWidth: 104, backgroundColor: '#0d1812', borderWidth: 1, borderColor: '#203529', borderRadius: 8, padding: 12, gap: 4 },
  statValue: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  card: { backgroundColor: '#0d1812', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 8 },
  warnCard: { backgroundColor: '#21140b', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', gap: 8 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  cardText: { color: '#c4cec0', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#203529', paddingTop: 8, gap: 10 },
  splitKm: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  splitText: { color: '#aeb8aa', fontSize: 13, fontWeight: '800' },
  primaryButton: { backgroundColor: '#91e6a3', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#07110c', fontSize: 14, fontWeight: '900' },
});
