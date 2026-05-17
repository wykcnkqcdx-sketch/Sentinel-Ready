import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours } from '../../theme/colours';

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

export function LiveMetricsOverlay({
  distanceKm,
  elapsedSeconds,
  gpsQualityWarning,
  trackingState,
  targetPaceMinutesPerKm,
}: LiveMetricsOverlayProps) {
  const elapsedMinutes = elapsedSeconds / 60;
  const currentPace = distanceKm > 0 ? elapsedMinutes / distanceKm : 0;
  const paceDelta = currentPace > 0 && targetPaceMinutesPerKm && targetPaceMinutesPerKm > 0
    ? currentPace - targetPaceMinutesPerKm
    : 0;
  const paceStatus = paceDelta === 0
    ? null
    : Math.abs(paceDelta) <= 0.5
      ? 'ON PACE'
      : paceDelta < 0
        ? 'AHEAD'
        : 'BEHIND';

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.distance}>{distanceKm.toFixed(2)} km</Text>
      <Text style={styles.time}>{formatElapsed(elapsedSeconds)}</Text>

      {trackingState === 'paused' && (
        <View style={styles.pausedBadge}>
          <Text style={styles.pausedText}>PAUSED</Text>
        </View>
      )}

      {trackingState === 'idle' && (
        <Text style={styles.hint}>Press START to begin</Text>
      )}

      {trackingState !== 'idle' && paceStatus ? (
        <View style={paceStatus === 'BEHIND' ? styles.paceBadgeWarn : styles.paceBadgeGood}>
          <Text style={paceStatus === 'BEHIND' ? styles.paceBadgeTextWarn : styles.paceBadgeTextGood}>
            {paceStatus}
          </Text>
        </View>
      ) : null}

      {gpsQualityWarning && (
        <View style={styles.warningRow}>
          <View style={styles.warningDot} />
          <Text style={styles.warningText} numberOfLines={1}>
            {gpsQualityWarning.length > 30
              ? `${gpsQualityWarning.slice(0, 30)}…`
              : gpsQualityWarning}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    padding: 10,
    minWidth: 100,
  },
  distance: {
    color: colours.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  time: {
    color: colours.text,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  pausedBadge: {
    marginTop: 6,
    backgroundColor: colours.amber,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pausedText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    color: colours.mutedText,
    fontSize: 11,
    marginTop: 4,
  },
  paceBadgeGood: {
    marginTop: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#91e6a3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  paceBadgeWarn: {
    marginTop: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colours.amber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  paceBadgeTextGood: {
    color: '#91e6a3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paceBadgeTextWarn: {
    color: colours.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  warningDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colours.amber,
  },
  warningText: {
    color: colours.amber,
    fontSize: 11,
    flex: 1,
  },
});
