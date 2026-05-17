import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RuckTrackingState } from '@/src/hooks/useRuckTracking';

interface ControlRowProps {
  tracking: RuckTrackingState;
  onSave: () => void | Promise<void>;
  onDiscard?: () => void;
}

export function ControlRow({ tracking, onSave, onDiscard }: ControlRowProps) {
  const { trackingState } = tracking;

  return (
    <View style={styles.row}>
      {trackingState === 'idle' && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={tracking.startRecording}
          accessibilityRole="button"
          accessibilityLabel="Start ruck"
        >
          <Text style={styles.primaryLabel}>▶  START RUCK</Text>
        </TouchableOpacity>
      )}

      {trackingState === 'recording' && (
        <>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={tracking.pauseRecording}
            accessibilityRole="button"
            accessibilityLabel="Pause ruck"
          >
            <Text style={styles.ghostLabel}>⏸  PAUSE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={tracking.stopRecording}
            accessibilityRole="button"
            accessibilityLabel="Stop ruck"
          >
            <Text style={styles.dangerLabel}>⬛  STOP</Text>
          </TouchableOpacity>
        </>
      )}

      {trackingState === 'paused' && (
        <>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={tracking.resumeRecording}
            accessibilityRole="button"
            accessibilityLabel="Resume ruck"
          >
            <Text style={styles.primaryLabel}>▶  RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={tracking.stopRecording}
            accessibilityRole="button"
            accessibilityLabel="Stop ruck"
          >
            <Text style={styles.dangerLabel}>⬛  STOP</Text>
          </TouchableOpacity>
        </>
      )}

      {trackingState === 'finished' && (
        <>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => { tracking.resetSession(); onDiscard?.(); }}
            accessibilityRole="button"
            accessibilityLabel="Discard ruck"
          >
            <Text style={styles.ghostLabel}>✕  DISCARD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save ruck"
          >
            <Text style={styles.primaryLabel}>✓  SAVE RUCK</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#91e6a3',
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 15,
  },
  primaryLabel: {
    color: '#050e09',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  ghostBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#235c32',
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 15,
  },
  ghostLabel: {
    color: '#7aad82',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: '#1c0c0c',
    borderWidth: 1,
    borderColor: '#6b1e1e',
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 15,
  },
  dangerLabel: {
    color: '#e05050',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
