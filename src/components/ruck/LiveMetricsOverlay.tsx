import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface LiveMetricsOverlayProps {
  distanceKm: number;
  elapsedSeconds: number;
  gpsQualityWarning: string | null;
  trackingState: 'idle' | 'recording' | 'paused' | 'finished';
  targetPaceMinutesPerKm?: number;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatPaceMins(minutesPerKm: number): string {
  if (!minutesPerKm || minutesPerKm <= 0) return '--:--';
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const GPS_DOTS = 5;

export function LiveMetricsOverlay({
  distanceKm,
  elapsedSeconds,
  gpsQualityWarning,
  trackingState,
  targetPaceMinutesPerKm,
}: LiveMetricsOverlayProps) {
  const elapsedMinutes = elapsedSeconds / 60;
  const currentPace = distanceKm > 0.01 ? elapsedMinutes / distanceKm : 0;

  const paceDelta =
    currentPace > 0 && targetPaceMinutesPerKm && targetPaceMinutesPerKm > 0
      ? currentPace - targetPaceMinutesPerKm
      : null;

  const gpsSignal = gpsQualityWarning ? 1 : 4;

  const stateLabel =
    trackingState === 'paused' ? 'PAUSED'
    : trackingState === 'idle' ? 'READY'
    : trackingState === 'finished' ? 'DONE'
    : null;

  return (
    <View style={styles.bar}>
      {/* Distance */}
      <View style={styles.metric}>
        <Text style={styles.value}>{distanceKm.toFixed(2)}</Text>
        <Text style={styles.unit}>KM</Text>
      </View>

      <View style={styles.sep} />

      {/* Elapsed */}
      <View style={styles.metric}>
        <Text style={styles.value}>{formatElapsed(elapsedSeconds)}</Text>
        <Text style={styles.unit}>ELAPSED</Text>
      </View>

      <View style={styles.sep} />

      {/* Pace */}
      <View style={styles.metric}>
        <Text style={styles.value}>{formatPaceMins(currentPace)}</Text>
        <Text style={styles.unit}>/KM</Text>
      </View>

      <View style={styles.sep} />

      {/* GPS + State */}
      <View style={styles.gpsBlock}>
        <View style={styles.gpsDots}>
          {Array.from({ length: GPS_DOTS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < gpsSignal ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        {stateLabel ? (
          <View style={[styles.stateChip, trackingState === 'paused' && styles.stateChipAmber]}>
            <Text style={[styles.stateText, trackingState === 'paused' && styles.stateTextAmber]}>
              {stateLabel}
            </Text>
          </View>
        ) : null}
        {paceDelta !== null && trackingState === 'recording' ? (
          <View style={[styles.paceChip, paceDelta > 0.5 ? styles.paceChipWarn : styles.paceChipOk]}>
            <Text style={[styles.paceChipText, paceDelta > 0.5 ? styles.paceChipTextWarn : styles.paceChipTextOk]}>
              {paceDelta > 0.5 ? 'BEHIND' : paceDelta < -0.5 ? 'AHEAD' : 'ON TGT'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,14,9,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#172c20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    color: '#edf5ea',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: '#3a6b46',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sep: {
    width: 1,
    height: 28,
    backgroundColor: '#172c20',
  },
  gpsBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  gpsDots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
  },
  dot: {
    width: 4,
    borderRadius: 1,
  },
  dotActive: {
    backgroundColor: '#91e6a3',
    height: 12,
  },
  dotInactive: {
    backgroundColor: '#172c20',
    height: 6,
  },
  stateChip: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#235c32',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  stateChipAmber: {
    borderColor: '#6b3c16',
  },
  stateText: {
    color: '#91e6a3',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  stateTextAmber: {
    color: '#ffaa44',
  },
  paceChip: {
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  paceChipOk: { borderColor: '#235c32' },
  paceChipWarn: { borderColor: '#6b3c16' },
  paceChipText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  paceChipTextOk: { color: '#91e6a3' },
  paceChipTextWarn: { color: '#ffaa44' },
});
