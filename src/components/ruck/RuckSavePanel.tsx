import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

const NOTE_CHIPS = ['Feet OK', 'Hot spots', 'Pack rub', 'Hydration low', 'Calves tight', 'Strong finish'];
const RPE_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const READINESS_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={stat.block}>
      <View style={stat.topBar} />
      <View style={stat.inner}>
        <Text style={stat.label}>{label}</Text>
        <Text style={stat.value}>{value}</Text>
      </View>
    </View>
  );
}

const stat = StyleSheet.create({
  block: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', overflow: 'hidden', backgroundColor: '#080f0b' },
  topBar: { height: 2, backgroundColor: '#91e6a3' },
  inner: { padding: 10, gap: 3 },
  label: { color: '#5a9465', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  value: { color: '#91e6a3', fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
});

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
    const cur = draft.notes.trim();
    if (cur.toLowerCase().includes(note.toLowerCase())) return;
    onChange({ ...draft, notes: cur ? `${cur}. ${note}` : note });
  }

  const confidenceColor =
    routeConfidence === 'High' ? '#91e6a3'
    : routeConfidence === 'Medium' ? '#ffaa44'
    : '#e05050';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.panel}>
        <View style={styles.accentBar} />
        <View style={styles.panelInner}>
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>◆ SESSION SUMMARY</Text>
            <View style={[styles.confidenceBadge, { borderColor: confidenceColor + '55' }]}>
              <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                GPS {routeConfidence.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatBlock label="DISTANCE" value={`${distanceKm.toFixed(2)} km`} />
            <StatBlock label="TIME" value={formatDurationFromSeconds(elapsedSeconds)} />
            <StatBlock label="AVG PACE" value={paceSeconds > 0 ? formatPace(paceSeconds / 60) : '--'} />
            <StatBlock label="PACK" value={`${draft.packWeightKg} kg`} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{splitCount} splits</Text>
            {rejectedPointCount > 0 && (
              <Text style={[styles.metaText, { color: '#ffaa44' }]}>{rejectedPointCount} pts filtered</Text>
            )}
          </View>
        </View>
      </View>

      {/* Session type */}
      <TextInput
        style={styles.typeInput}
        value={draft.sessionType}
        onChangeText={(sessionType) => onChange({ ...draft, sessionType })}
        placeholder="Session type"
        placeholderTextColor="#2e5038"
      />

      {/* RPE */}
      <View style={styles.panel}>
        <View style={[styles.accentBar, { backgroundColor: '#3fc8e4' }]} />
        <View style={styles.panelInner}>
          <Text style={styles.sectionLabel}>EFFORT · RPE</Text>
          <View style={styles.chipRow}>
            {RPE_VALUES.map((v) => {
              const active = draft.rpe === v;
              const color = Number(v) >= 8 ? '#e05050' : Number(v) >= 6 ? '#ffaa44' : '#91e6a3';
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.rpeChip, active && { backgroundColor: color + '22', borderColor: color }]}
                  onPress={() => onChange({ ...draft, rpe: v })}
                  accessibilityRole="button"
                  accessibilityLabel={`RPE ${v}`}
                >
                  <Text style={[styles.rpeText, active && { color }]}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Readiness */}
      <View style={styles.panel}>
        <View style={[styles.accentBar, { backgroundColor: '#91e6a3' }]} />
        <View style={styles.panelInner}>
          <Text style={styles.sectionLabel}>READINESS AFTER</Text>
          <View style={styles.chipRow}>
            {READINESS_VALUES.map((v) => {
              const active = draft.readiness === v;
              const color = Number(v) <= 4 ? '#e05050' : Number(v) <= 6 ? '#ffaa44' : '#91e6a3';
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.rpeChip, active && { backgroundColor: color + '22', borderColor: color }]}
                  onPress={() => onChange({ ...draft, readiness: v })}
                  accessibilityRole="button"
                  accessibilityLabel={`Readiness ${v}`}
                >
                  <Text style={[styles.rpeText, active && { color }]}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Note chips */}
      <View style={styles.panel}>
        <View style={[styles.accentBar, { backgroundColor: '#ffaa44' }]} />
        <View style={styles.panelInner}>
          <Text style={styles.sectionLabel}>FIELD NOTES</Text>
          <View style={styles.noteRow}>
            {NOTE_CHIPS.map((note) => {
              const active = draft.notes.toLowerCase().includes(note.toLowerCase());
              return (
                <TouchableOpacity
                  key={note}
                  style={[styles.noteChip, active && styles.noteChipActive]}
                  onPress={() => addNoteChip(note)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add note: ${note}`}
                >
                  <Text style={[styles.noteText, active && styles.noteTextActive]}>{note}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={styles.notesInput}
            value={draft.notes}
            onChangeText={(notes) => onChange({ ...draft, notes })}
            placeholder="Additional notes…"
            placeholderTextColor="#2e5038"
            multiline
          />
        </View>
      </View>

    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { gap: 10, paddingBottom: 8 },
  panel: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  accentBar: { width: 3, flexShrink: 0, backgroundColor: '#91e6a3' },
  panelInner: { flex: 1, padding: 14, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#5a9465', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  confidenceDot: { width: 5, height: 5, borderRadius: 3 },
  confidenceText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaText: { color: '#5a9465', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  typeInput: {
    backgroundColor: '#0a1610',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#172c20',
    color: '#edf5ea',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionLabel: { color: '#5a9465', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  chipRow: { flexDirection: 'row', gap: 4 },
  rpeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#172c20',
    backgroundColor: '#050e09',
  },
  rpeText: { color: '#5a9465', fontSize: 12, fontWeight: '900' },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noteChip: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#172c20',
    backgroundColor: '#050e09',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteChipActive: {
    backgroundColor: 'rgba(255,170,68,0.1)',
    borderColor: '#6b3c16',
  },
  noteText: { color: '#5a9465', fontSize: 11, fontWeight: '800' },
  noteTextActive: { color: '#ffaa44' },
  notesInput: {
    backgroundColor: '#050e09',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#172c20',
    color: '#edf5ea',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 58,
    textAlignVertical: 'top',
  },
});
