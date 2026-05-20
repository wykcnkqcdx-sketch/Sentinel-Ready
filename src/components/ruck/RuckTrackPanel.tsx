import { ControlRow } from '@/src/components/ruck/ControlRow';
import { LiveMetricsOverlay } from '@/src/components/ruck/LiveMetricsOverlay';
import { MapLayerPicker } from '@/src/components/ruck/MapLayerPicker';
import {
  DEFAULT_RUCK_MISSION_DRAFT,
  MissionSetupPanel,
  type RuckMissionDraft,
} from '@/src/components/ruck/MissionSetupPanel';
import { MissionProgressPanel } from '@/src/components/ruck/MissionProgressPanel';
import {
  RuckDisplayModeToggle,
  type RuckDisplayMode,
} from '@/src/components/ruck/RuckDisplayModeToggle';
import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import {
  DEFAULT_RUCK_SAVE_DRAFT,
  RuckSavePanel,
  type RuckSaveDraft,
} from '@/src/components/ruck/RuckSavePanel';
import { getNumberInput } from '@/src/components/ruck/ruckPanelUtils';
import { useRuckTracking } from '@/src/hooks/useRuckTracking';
import type { MapOverlay } from '@/src/utils/fieldMapping';
import React, { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export {
  DEFAULT_RUCK_MISSION_DRAFT,
  DEFAULT_RUCK_SAVE_DRAFT,
};
export type {
  RuckDisplayMode,
  RuckMissionDraft,
  RuckSaveDraft,
};

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
  const [displayMode, setDisplayMode] = useState<RuckDisplayMode>('simple');
  const targetDistance = Math.max(0, getNumberInput(missionDraft.targetDistanceKm, 0));
  const targetMinutes = Math.max(0, getNumberInput(missionDraft.targetMinutes, 0));
  const targetPaceMinutesPerKm = targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : undefined;

  const isFinished = tracking.trackingState === 'finished';
  const showMissionSetup = !isFinished && tracking.trackingState === 'idle' && displayMode === 'mission';
  const showMissionProgress = !isFinished && tracking.trackingState !== 'idle' && displayMode === 'mission';
  const showMapTools = !isFinished && displayMode === 'map';
  const mapInteractive = !isFinished && displayMode === 'map';

  return (
    <View style={styles.container}>
      <RuckMapView
        routePoints={tracking.routePoints}
        currentPosition={tracking.currentPosition}
        layer={tracking.activeLayer}
        overlays={showMapTools ? overlays : []}
        fullHeight
        interactive={mapInteractive}
        showGpsStatus={mapInteractive}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0F1115" stopOpacity="0.8" />
              <Stop offset="0.25" stopColor="#0F1115" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.5" stopColor="#0F1115" stopOpacity="0" />
              <Stop offset="1" stopColor="#0F1115" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#topGrad)" />
          <Rect width="100%" height="100%" fill="url(#bottomGrad)" />
        </Svg>
      </View>

      {!isFinished ? (
        <View style={styles.modeWrapper}>
          <RuckDisplayModeToggle mode={displayMode} onChange={setDisplayMode} />
        </View>
      ) : null}

      <View style={styles.metricsWrapper}>
        <LiveMetricsOverlay
          distanceKm={tracking.distanceKm}
          elapsedSeconds={tracking.elapsedSeconds}
          gpsQualityWarning={tracking.gpsQualityWarning}
          trackingState={tracking.trackingState}
          targetPaceMinutesPerKm={targetPaceMinutesPerKm}
        />
      </View>

      {showMissionSetup ? (
        <View style={styles.missionWrapper}>
          <MissionSetupPanel draft={missionDraft} onChange={onMissionDraftChange} />
        </View>
      ) : null}

      {showMissionProgress ? (
        <View style={styles.missionWrapper}>
          <MissionProgressPanel
            draft={missionDraft}
            distanceKm={tracking.distanceKm}
            elapsedSeconds={tracking.elapsedSeconds}
            gpsQualityWarning={tracking.gpsQualityWarning}
          />
        </View>
      ) : null}

      {showMapTools ? (
        <>
          <View style={styles.overlayBarWrapper}>
            <TouchableOpacity
              style={[styles.overlayImportBtn, loadingOverlay && styles.overlayImportBtnDisabled]}
              onPress={onImportOverlay}
              disabled={loadingOverlay}
              accessibilityRole="button"
              accessibilityLabel="Import map overlay"
            >
              <Text style={styles.overlayImportBtnText}>
                {loadingOverlay ? 'Loading...' : '+ Overlay'}
              </Text>
            </TouchableOpacity>

            {overlays.map((overlay) => (
              <Animated.View key={overlay.id} entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
                <TouchableOpacity
                  style={[styles.overlayChip, !overlay.visible && styles.overlayChipHidden]}
                  onPress={() => onToggleOverlay(overlay.id)}
                  onLongPress={() => onRemoveOverlay(overlay.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${overlay.name} overlay, ${overlay.visible ? 'visible' : 'hidden'}. Long press to remove.`}
                  accessibilityHint="Tap to toggle visibility, long press to remove"
                >
                  <View style={[styles.overlayDot, { backgroundColor: overlay.color }]} />
                  <Text style={styles.overlayChipText} numberOfLines={1}>{overlay.name}</Text>
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
        </>
      ) : null}

      <View style={styles.controlDock}>
        <ControlRow
          tracking={tracking}
          onSave={onSaveSession}
          onDiscard={onDiscardDraft}
        />
      </View>

      {isFinished ? (
        <View style={styles.savePanelWrapper}>
          <RuckSavePanel
            draft={saveDraft}
            distanceKm={tracking.sessionResult?.distanceKm ?? tracking.distanceKm}
            elapsedSeconds={tracking.sessionResult?.elapsedSeconds ?? tracking.elapsedSeconds}
            splitCount={(tracking.sessionResult?.splits ?? tracking.splits).length}
            routeConfidence={tracking.sessionResult?.routeConfidence ?? tracking.routeConfidence}
            rejectedPointCount={tracking.sessionResult?.rejectedPointCount ?? tracking.rejectedPointCount}
            onChange={onSaveDraftChange}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeWrapper: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  metricsWrapper: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 140,
  },
  missionWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 286,
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
    borderTopColor: 'rgba(255,255,255,0.08)',
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
  overlayImportBtn: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#1E2229',
    borderWidth: 1,
    borderColor: 'rgba(252,76,2,0.3)',
  },
  overlayImportBtnDisabled: { borderColor: 'rgba(255,255,255,0.08)' },
  overlayImportBtnText: { color: '#FC4C02', fontSize: 11, fontWeight: '900' },
  overlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#1E2229',
    borderWidth: 1,
    borderColor: '#2a3a2a',
    maxWidth: 130,
  },
  overlayChipHidden: { opacity: 0.4 },
  overlayDot: { width: 8, height: 8, borderRadius: 4 },
  overlayChipText: { color: '#c4cec0', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  savePanelWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 150,
  },
});
