import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RuckTrackingState } from '@/src/hooks/useRuckTracking';
import { colours } from '@/src/theme/colours';

interface ControlRowProps {
  tracking: RuckTrackingState;
  onSave: () => void | Promise<void>;
  onDiscard?: () => void;
}

export function ControlRow({ tracking, onSave, onDiscard }: ControlRowProps) {
  const { trackingState } = tracking;

  return (
    <View style={styles.container}>
      {trackingState === 'idle' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={tracking.startRecording}>
          <Text style={styles.primaryText}>START</Text>
        </TouchableOpacity>
      ) : null}

      {trackingState === 'recording' ? (
        <>
          <TouchableOpacity style={styles.secondaryButton} onPress={tracking.pauseRecording}>
            <Text style={styles.secondaryText}>PAUSE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={tracking.stopRecording}>
            <Text style={styles.dangerText}>STOP</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {trackingState === 'paused' ? (
        <>
          <TouchableOpacity style={styles.primaryButton} onPress={tracking.resumeRecording}>
            <Text style={styles.primaryText}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={tracking.stopRecording}>
            <Text style={styles.dangerText}>STOP</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {trackingState === 'finished' ? (
        <>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              tracking.resetSession();
              onDiscard?.();
            }}
          >
            <Text style={styles.secondaryText}>DISCARD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onSave}>
            <Text style={styles.primaryText}>SAVE</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#B5852C',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colours.surface,
    borderColor: colours.border,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: colours.fail,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryText: {
    color: '#000D1A',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryText: {
    color: colours.text,
    fontSize: 13,
    fontWeight: '900',
  },
  dangerText: {
    color: colours.text,
    fontSize: 13,
    fontWeight: '900',
  },
});
