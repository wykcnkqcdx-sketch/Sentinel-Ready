import { ControlRow } from '@/src/components/ruck/ControlRow';
import { LiveMetricsOverlay } from '@/src/components/ruck/LiveMetricsOverlay';
import { MapLayerPicker } from '@/src/components/ruck/MapLayerPicker';
import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import { useRuckTracking } from '@/src/hooks/useRuckTracking';
import type { MapOverlay } from '@/src/utils/fieldMapping';
import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export type RuckSaveDraft = {
  sessionType: string;
  packWeightKg: string;
  readiness: string;
  rpe: string;
  notes: string;
};

export type RuckMissionDraft = {
  targetDistanceKm: string;
  targetMinutes: string;
  packWeightKg: string;
  checkpointIntervalKm: string;
};

export const DEFAULT_RUCK_SAVE_DRAFT: RuckSaveDraft = {
  sessionType: 'GPS Tracked Ruck',
  packWeightKg: '15',
  readiness: '6',
  rpe: '6',
  notes: '',
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

const SAVE_NOTE_CHIPS = [
  'Feet OK',
  'Hot spots',
  'Pack rub',
  'Hydration low',
  'Calves tight',
  'Strong finish',
];

function formatPace(pace: number): string {
  if (!pace) return '--';
  let mins = Math.floor(pace);
  let secs = Math.round((pace - mins) * 60);
  if (secs === 60) {
    mins += 1;
    secs = 0;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDuration(minutes: number): string {
  if (!minutes) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatDurationFromSeconds(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  return formatDuration(totalMinutes);
}

function getNumberInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function progressPercent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (value / target) * 100));
}

const MissionSetupPanel = memo(function MissionSetupPanel({
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

const MissionProgressPanel = memo(function MissionProgressPanel({
  draft,
  distanceKm,
  elapsedSeconds,
}: {
  draft: RuckMissionDraft;
  distanceKm: number;
  elapsedSeconds: number;
}) {
  const targetDistance = Math.max(0, getNumberInput(draft.targetDistanceKm, 0));
  const targetMinutes = Math.max(0, getNumberInput(draft.targetMinutes, 0));
  const checkpointInterval = Math.max(0, getNumberInput(draft.checkpointIntervalKm, 1));
  const elapsedMinutes = elapsedSeconds / 60;
  const distanceProgress = progressPercent(distanceKm, targetDistance);
  const timeProgress = progressPercent(elapsedMinutes, targetMinutes);
  const nextCheckpoint = checkpointInterval > 0
    ? Math.ceil(Math.max(distanceKm, 0.01) / checkpointInterval) * checkpointInterval
    : 0;
  const remainingKm = Math.max(0, targetDistance - distanceKm);
  const targetPace = targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : 0;
  const currentPace = distanceKm > 0 ? elapsedMinutes / distanceKm : 0;
  const paceDelta = currentPace > 0 && targetPace > 0 ? currentPace - targetPace : 0;

  return (
    <View style={styles.progressPanel} pointerEvents="none">
      <View style={styles.progressHeader}>
        <Text style={styles.missionKicker}>MISSION PROGRESS</Text>
        <Text style={styles.progressMeta}>
          {remainingKm.toFixed(1)} km left · {draft.packWeightKg || '0'} kg
        </Text>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>DIST</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${distanceProgress}%` }]} />
        </View>
        <Text style={styles.progressValue}>{Math.round(distanceProgress)}%</Text>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>TIME</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFillWarn, { width: `${timeProgress}%` }]} />
        </View>
        <Text style={styles.progressValue}>{Math.round(timeProgress)}%</Text>
      </View>
      <Text style={styles.progressHint}>
        Next checkpoint {nextCheckpoint > 0 ? `${nextCheckpoint.toFixed(1)} km` : '--'}
        {paceDelta !== 0 ? ` · ${paceDelta > 0 ? '+' : ''}${Math.abs(paceDelta).toFixed(1)} min/km target` : ''}
      </Text>
    </View>
  );
});

const RuckSavePanel = memo(function RuckSavePanel({
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

export type RuckTrackPanelProps = {
  tracking: ReturnType<typeof useRuckTracking>;
  overlays: MapOverlay[];
  loadingOverlay: boolean;
  missionDraft: RuckMissionDraft;
  saveDraft: RuckSaveDraft;
  onMissionDraftChange: (draft: RuckMissionDraft) => void;
  onSaveDraftChange: (draft: RuckSaveDraft) => void;
  onImportOverlay: () => void;
  onToggleOverlay: (id: string) => void;
  onRemoveOverlay: (id: string) => void;
  onSaveSession: () => void;
  onDiscardDraft: () => void;
};

export const RuckTrackPanel = memo(function RuckTrackPanel({
  tracking,
  overlays,
  loadingOverlay,
  missionDraft,
  saveDraft,
  onMissionDraftChange,
  onSaveDraftChange,
  onImportOverlay,
  onToggleOverlay,
  onRemoveOverlay,
  onSaveSession,
  onDiscardDraft,
}: RuckTrackPanelProps) {
  const targetDistance = Math.max(0, getNumberInput(missionDraft.targetDistanceKm, 0));
  const targetMinutes = Math.max(0, getNumberInput(missionDraft.targetMinutes, 0));
  const targetPaceMinutesPerKm = targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : undefined;

  return (
    <View style={styles.container}>
      <RuckMapView
        routePoints={tracking.routePoints}
        currentPosition={tracking.currentPosition}
        layer={tracking.activeLayer}
        overlays={overlays}
        fullHeight
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#07110c" stopOpacity="0.8" />
              <Stop offset="0.25" stopColor="#07110c" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.5" stopColor="#07110c" stopOpacity="0" />
              <Stop offset="1" stopColor="#07110c" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#topGrad)" />
          <Rect width="100%" height="100%" fill="url(#bottomGrad)" />
        </Svg>
      </View>

      <View style={styles.metricsWrapper}>
        <LiveMetricsOverlay
          distanceKm={tracking.distanceKm}
          elapsedSeconds={tracking.elapsedSeconds}
          gpsQualityWarning={tracking.gpsQualityWarning}
          trackingState={tracking.trackingState}
          targetPaceMinutesPerKm={targetPaceMinutesPerKm}
        />
      </View>

      {tracking.trackingState === 'idle' ? (
        <View style={styles.missionWrapper}>
          <MissionSetupPanel draft={missionDraft} onChange={onMissionDraftChange} />
        </View>
      ) : tracking.trackingState !== 'finished' ? (
        <View style={styles.missionWrapper}>
          <MissionProgressPanel
            draft={missionDraft}
            distanceKm={tracking.distanceKm}
            elapsedSeconds={tracking.elapsedSeconds}
          />
        </View>
      ) : null}

      <View style={styles.overlayBarWrapper}>
        <TouchableOpacity
          style={[styles.overlayImportBtn, loadingOverlay && styles.overlayImportBtnDisabled]}
          onPress={onImportOverlay}
          disabled={loadingOverlay}
          accessibilityRole="button"
          accessibilityLabel="Import map overlay"
        >
          <Text style={styles.overlayImportBtnText}>
            {loadingOverlay ? 'Loading…' : '+ Overlay'}
          </Text>
        </TouchableOpacity>

        {overlays.map(o => (
          <Animated.View key={o.id} entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
            <TouchableOpacity
              style={[styles.overlayChip, !o.visible && styles.overlayChipHidden]}
              onPress={() => onToggleOverlay(o.id)}
              onLongPress={() => onRemoveOverlay(o.id)}
              accessibilityRole="button"
              accessibilityLabel={`${o.name} overlay, ${o.visible ? 'visible' : 'hidden'}. Long press to remove.`}
              accessibilityHint="Tap to toggle visibility, long press to remove"
            >
              <View style={[styles.overlayDot, { backgroundColor: o.color }]} />
              <Text style={styles.overlayChipText} numberOfLines={1}>{o.name}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <View style={styles.layerPickerWrapper}>
        <MapLayerPicker
          activeLayer={tracking.activeLayer}
          onSelect={tracking.setLayer}
        />
      </View>

      <View style={styles.controlDock}>
        <ControlRow
          tracking={tracking}
          onSave={onSaveSession}
          onDiscard={onDiscardDraft}
        />
      </View>

      {tracking.trackingState === 'finished' ? (
        <RuckSavePanel
          draft={saveDraft}
          distanceKm={tracking.sessionResult?.distanceKm ?? tracking.distanceKm}
          elapsedSeconds={tracking.sessionResult?.elapsedSeconds ?? tracking.elapsedSeconds}
          splitCount={(tracking.sessionResult?.splits ?? tracking.splits).length}
          routeConfidence={tracking.sessionResult?.routeConfidence ?? tracking.routeConfidence}
          rejectedPointCount={tracking.sessionResult?.rejectedPointCount ?? tracking.rejectedPointCount}
          onChange={onSaveDraftChange}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  metricsWrapper: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  controlDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 92,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'rgba(7,17,12,0.92)',
    borderTopWidth: 1,
    borderTopColor: '#203529',
  },
  layerPickerWrapper: {
    position: 'absolute',
    bottom: 168,
    right: 16,
  },
  overlayBarWrapper: {
    position: 'absolute',
    bottom: 226,
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  overlayImportBtn: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#0d1812', borderWidth: 1, borderColor: '#2f6b3c' },
  overlayImportBtnDisabled: { borderColor: '#203529' },
  overlayImportBtnText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  overlayChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0d1812', borderWidth: 1, borderColor: '#2a3a2a', maxWidth: 130 },
  overlayChipHidden: { opacity: 0.4 },
  overlayDot: { width: 8, height: 8, borderRadius: 4 },
  overlayChipText: { color: '#c4cec0', fontSize: 11, fontWeight: '700', flexShrink: 1 },

  missionWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 286,
  },
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
  progressPanel: {
    backgroundColor: 'rgba(7,17,12,0.92)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    padding: 12,
    gap: 8,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  progressMeta: { color: '#dfe8da', fontSize: 11, fontWeight: '900' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressLabel: { width: 32, color: '#8fbf8f', fontSize: 9, fontWeight: '900' },
  progressTrack: { flex: 1, height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#203529' },
  progressFill: { height: '100%', backgroundColor: '#91e6a3' },
  progressFillWarn: { height: '100%', backgroundColor: '#ffb86b' },
  progressValue: { width: 34, color: '#ffffff', fontSize: 10, fontWeight: '900', textAlign: 'right' },
  progressHint: { color: '#aeb8aa', fontSize: 11, fontWeight: '800' },

  savePanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 150,
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
