import { ControlRow } from '@/src/components/ruck/ControlRow';
import { LiveMetricsOverlay } from '@/src/components/ruck/LiveMetricsOverlay';
import { MapLayerPicker } from '@/src/components/ruck/MapLayerPicker';
import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import { useRuckTracking } from '@/src/hooks/useRuckTracking';
import type { MapOverlay } from '@/src/utils/fieldMapping';
import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

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
    </View>
  );
});

export type RuckTrackPanelProps = {
  tracking: ReturnType<typeof useRuckTracking>;
  overlays: MapOverlay[];
  loadingOverlay: boolean;
  saveDraft: RuckSaveDraft;
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
  saveDraft,
  onSaveDraftChange,
  onImportOverlay,
  onToggleOverlay,
  onRemoveOverlay,
  onSaveSession,
  onDiscardDraft,
}: RuckTrackPanelProps) {
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
        />
      </View>

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
          <TouchableOpacity
            key={o.id}
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
});