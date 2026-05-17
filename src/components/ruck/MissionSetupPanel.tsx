import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type RuckMissionDraft = {
  targetDistanceKm: string;
  targetMinutes: string;
  packWeightKg: string;
  checkpointIntervalKm: string;
};

export const DEFAULT_RUCK_MISSION_DRAFT: RuckMissionDraft = {
  targetDistanceKm: '8',
  targetMinutes: '90',
  packWeightKg: '15',
  checkpointIntervalKm: '1',
};

const MISSION_PRESETS: { label: string; draft: RuckMissionDraft }[] = [
  {
    label: 'Base',
    draft: { targetDistanceKm: '8', targetMinutes: '90', packWeightKg: '15', checkpointIntervalKm: '1' },
  },
  {
    label: 'Tempo',
    draft: { targetDistanceKm: '6', targetMinutes: '60', packWeightKg: '12', checkpointIntervalKm: '1' },
  },
  {
    label: 'Long',
    draft: { targetDistanceKm: '12', targetMinutes: '150', packWeightKg: '18', checkpointIntervalKm: '2' },
  },
  {
    label: 'Heavy',
    draft: { targetDistanceKm: '5', targetMinutes: '70', packWeightKg: '25', checkpointIntervalKm: '1' },
  },
];

export const MissionSetupPanel = memo(function MissionSetupPanel({
  draft,
  onChange,
}: {
  draft: RuckMissionDraft;
  onChange: (draft: RuckMissionDraft) => void;
}) {
  function isActivePreset(preset: RuckMissionDraft) {
    return (
      draft.targetDistanceKm === preset.targetDistanceKm &&
      draft.targetMinutes === preset.targetMinutes &&
      draft.packWeightKg === preset.packWeightKg &&
      draft.checkpointIntervalKm === preset.checkpointIntervalKm
    );
  }

  return (
    <View style={styles.missionPanel}>
      <View style={styles.missionHeader}>
        <Text style={styles.missionKicker}>MISSION SETUP</Text>
        <Text style={styles.missionText}>Set intent before stepping off.</Text>
      </View>
      <View style={styles.presetRow}>
        {MISSION_PRESETS.map((preset) => {
          const active = isActivePreset(preset.draft);
          return (
            <TouchableOpacity
              key={preset.label}
              style={[styles.presetButton, active && styles.presetButtonActive]}
              onPress={() => onChange(preset.draft)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${preset.label} ruck preset`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{preset.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.missionGrid}>
        <View style={styles.missionField}>
          <Text style={styles.missionLabel}>KM</Text>
          <TextInput
            style={styles.missionInput}
            value={draft.targetDistanceKm}
            onChangeText={(targetDistanceKm) => onChange({ ...draft, targetDistanceKm })}
            keyboardType="numeric"
            placeholder="8"
            placeholderTextColor="#617061"
          />
        </View>
        <View style={styles.missionField}>
          <Text style={styles.missionLabel}>MIN</Text>
          <TextInput
            style={styles.missionInput}
            value={draft.targetMinutes}
            onChangeText={(targetMinutes) => onChange({ ...draft, targetMinutes })}
            keyboardType="numeric"
            placeholder="90"
            placeholderTextColor="#617061"
          />
        </View>
        <View style={styles.missionField}>
          <Text style={styles.missionLabel}>KG</Text>
          <TextInput
            style={styles.missionInput}
            value={draft.packWeightKg}
            onChangeText={(packWeightKg) => onChange({ ...draft, packWeightKg })}
            keyboardType="numeric"
            placeholder="15"
            placeholderTextColor="#617061"
          />
        </View>
        <View style={styles.missionField}>
          <Text style={styles.missionLabel}>CHK</Text>
          <TextInput
            style={styles.missionInput}
            value={draft.checkpointIntervalKm}
            onChangeText={(checkpointIntervalKm) => onChange({ ...draft, checkpointIntervalKm })}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor="#617061"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  missionPanel: {
    backgroundColor: 'rgba(7,17,12,0.92)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    padding: 12,
    gap: 10,
  },
  missionHeader: { gap: 2 },
  missionKicker: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  missionText: { color: '#aeb8aa', fontSize: 11, fontWeight: '800' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetButton: {
    flex: 1,
    minWidth: 64,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: '#102d1a',
  },
  presetButtonActive: {
    backgroundColor: '#91e6a3',
    borderColor: '#91e6a3',
  },
  presetText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  presetTextActive: { color: '#07110c' },
  missionGrid: { flexDirection: 'row', gap: 8 },
  missionField: { flex: 1, gap: 4 },
  missionLabel: { color: '#8fbf8f', fontSize: 9, fontWeight: '900' },
  missionInput: {
    backgroundColor: '#07110c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#203529',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
  },
});
