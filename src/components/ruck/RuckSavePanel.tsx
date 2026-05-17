import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatDurationFromSeconds, formatPace } from './ruckPanelUtils';

export type RuckSaveDraft = {
  sessionType: string;
  packWeightKg: string;
  readiness: string;
  rpe: string;
  notes: string;
};

export const DEFAULT_RUCK_SAVE_DRAFT: RuckSaveDraft = {
  sessionType: 'GPS Tracked Ruck',
  packWeightKg: '15',
  readiness: '6',
  rpe: '6',
  notes: '',
};

const SAVE_NOTE_CHIPS = [
  'Feet OK',
  'Hot spots',
  'Pack rub',
  'Hydration low',
  'Calves tight',
  'Strong finish',
];

export const RuckSavePanel = memo(function RuckSavePanel({
  draft,
  distanceKm,
  elapsedSeconds,
  splitCount = 0,
  routeConfidence = 'High',
  rejectedPointCount = 0,
  onChange,
}: {
  draft: RuckSaveDraft;
  distanceKm: number;
  elapsedSeconds: number;
  splitCount?: number;
  routeConfidence?: 'High' | 'Medium' | 'Low';
  rejectedPointCount?: number;
  onChange: (draft: RuckSaveDraft) => void;
}) {
  const paceSeconds = distanceKm > 0 ? elapsedSeconds / distanceKm : 0;

  function addNoteChip(note: string) {
    const currentNotes = draft.notes.trim();
    if (currentNotes.toLowerCase().includes(note.toLowerCase())) return;
    onChange({ ...draft, notes: currentNotes ? `${currentNotes}. ${note}` : note });
  }

  return (
    <View style={styles.savePanel}>
      <View style={styles.saveHeader}>
        <Text style={styles.saveKicker}>SAVE RUCK</Text>
        <Text style={styles.saveSummary}>
          {distanceKm.toFixed(2)} km · {formatDurationFromSeconds(elapsedSeconds)}
          {paceSeconds > 0 ? ` · ${formatPace(paceSeconds / 60)}` : ''}
        </Text>
        <Text style={styles.saveMeta}>
          {splitCount} splits · {routeConfidence} GPS
          {rejectedPointCount > 0 ? ` · ${rejectedPointCount} points filtered` : ''}
        </Text>
      </View>

      <TextInput
        style={styles.saveInput}
        value={draft.sessionType}
        onChangeText={(sessionType) => onChange({ ...draft, sessionType })}
        placeholder="Session type"
        placeholderTextColor="#617061"
      />

      <View style={styles.saveGrid}>
        <View style={styles.saveField}>
          <Text style={styles.saveLabel}>KG</Text>
          <TextInput
            style={styles.saveInput}
            value={draft.packWeightKg}
            onChangeText={(packWeightKg) => onChange({ ...draft, packWeightKg })}
            keyboardType="numeric"
            placeholder="15"
            placeholderTextColor="#617061"
          />
        </View>
        <View style={styles.saveField}>
          <Text style={styles.saveLabel}>READINESS</Text>
          <TextInput
            style={styles.saveInput}
            value={draft.readiness}
            onChangeText={(readiness) => onChange({ ...draft, readiness })}
            keyboardType="numeric"
            placeholder="6"
            placeholderTextColor="#617061"
          />
        </View>
        <View style={styles.saveField}>
          <Text style={styles.saveLabel}>RPE</Text>
          <TextInput
            style={styles.saveInput}
            value={draft.rpe}
            onChangeText={(rpe) => onChange({ ...draft, rpe })}
            keyboardType="numeric"
            placeholder="6"
            placeholderTextColor="#617061"
          />
        </View>
      </View>

      <TextInput
        style={[styles.saveInput, styles.saveNotes]}
        value={draft.notes}
        onChangeText={(notes) => onChange({ ...draft, notes })}
        placeholder="Notes: feet, breathing, terrain, hot spots"
        placeholderTextColor="#617061"
        multiline
      />

      <View style={styles.noteChipRow}>
        {SAVE_NOTE_CHIPS.map((note) => (
          <TouchableOpacity
            key={note}
            style={styles.noteChip}
            onPress={() => addNoteChip(note)}
            accessibilityRole="button"
            accessibilityLabel={`Add note: ${note}`}
          >
            <Text style={styles.noteChipText}>{note}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  savePanel: {
    backgroundColor: '#0d1812',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    padding: 12,
    gap: 10,
  },
  saveHeader: { gap: 3 },
  saveKicker: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  saveSummary: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  saveMeta: { color: '#8fbf8f', fontSize: 11, fontWeight: '800' },
  saveGrid: { flexDirection: 'row', gap: 8 },
  saveField: { flex: 1, gap: 4 },
  saveLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '900' },
  saveInput: {
    backgroundColor: '#07110c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#203529',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  saveNotes: {
    minHeight: 62,
    textAlignVertical: 'top',
  },
  noteChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noteChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    backgroundColor: '#102d1a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteChipText: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
  },
});
