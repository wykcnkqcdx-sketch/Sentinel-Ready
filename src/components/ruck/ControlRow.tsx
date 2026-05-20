import { MaterialCommunityIcons } from '@expo/vector-icons';
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
          <View style={styles.btnContent}>
            <MaterialCommunityIcons name="play" size={16} color="#0F1115" />
            <Text style={styles.primaryLabel}>START RUCK</Text>
          </View>
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
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="pause" size={16} color="#A7ADB8" />
              <Text style={styles.ghostLabel}>PAUSE</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={tracking.stopRecording}
            accessibilityRole="button"
            accessibilityLabel="Stop ruck"
          >
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="stop" size={16} color="#e05050" />
              <Text style={styles.dangerLabel}>STOP</Text>
            </View>
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
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="play" size={16} color="#0F1115" />
              <Text style={styles.primaryLabel}>RESUME</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={tracking.stopRecording}
            accessibilityRole="button"
            accessibilityLabel="Stop ruck"
          >
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="stop" size={16} color="#e05050" />
              <Text style={styles.dangerLabel}>STOP</Text>
            </View>
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
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="close" size={16} color="#A7ADB8" />
              <Text style={styles.ghostLabel}>DISCARD</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save ruck"
          >
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="check" size={16} color="#0F1115" />
              <Text style={styles.primaryLabel}>SAVE RUCK</Text>
            </View>
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
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#FC4C02',
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 15,
  },
  primaryLabel: {
    color: '#0F1115',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  ghostBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 15,
  },
  ghostLabel: {
    color: '#A7ADB8',
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
