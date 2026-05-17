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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export {
  DEFAULT_RUCK_MISSION_DRAFT,
  DEFAULT_RUCK_SAVE_DRAFT,
};
export type { RuckDisplayMode, RuckMissionDraft, RuckSaveDraft };

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
  const targetPaceMinutesPerKm =
    targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : undefined;

  const isFinished = tracking.trackingState === 'finished';
  const isIdle = tracking.trackingState === 'idle';

  const showMissionSetup = !isFinished && isIdle && displayMode === 'mission';
  const showMissionProgress = !isFinished && !isIdle && displayMode === 'mission';
  const showMapTools = !isFinished && displayMode === 'map';
  const showSimpleData = !isFinished && displayMode === 'simple';

  return (
    <View style={styles.screen}>

      {/* ── Map — always rendering for GPS continuity ─────────────── */}
      <View style={StyleSheet.absoluteFill}>
        <RuckMapView
          routePoints={tracking.routePoints}
          currentPosition={tracking.currentPosition}
          layer={tracking.activeLayer}
          overlays={showMapTools ? overlays : []}
          fullHeight
          interactive={showMapTools}
          showGpsStatus={false}
        />
      </View>

      {/* Dark overlay masks map in simple/mission/finished modes */}
      {displayMode !== 'map' && (
        <View style={styles.darkMask} pointerEvents="none" />
      )}

      {/* Gradient fade at top and bottom in map mode */}
      {displayMode === 'map' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#050e09" stopOpacity="0.92" />
                <Stop offset="0.22" stopColor="#050e09" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.55" stopColor="#050e09" stopOpacity="0" />
                <Stop offset="1" stopColor="#050e09" stopOpacity="0.98" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#tg)" />
            <Rect width="100%" height="100%" fill="url(#bg)" />
          </Svg>
        </View>
      )}

      {/* ── HUD Column — flex layout, never overlaps tab bar ─────── */}
      <View style={styles.hud} pointerEvents="box-none">

        {/* Top metrics bar */}
        <View pointerEvents="none">
          <LiveMetricsOverlay
            distanceKm={tracking.distanceKm}
            elapsedSeconds={tracking.elapsedSeconds}
            gpsQualityWarning={tracking.gpsQualityWarning}
            trackingState={tracking.trackingState}
            targetPaceMinutesPerKm={targetPaceMinutesPerKm}
          />
        </View>

        {/* Mode toggle */}
        {!isFinished && (
          <View pointerEvents="auto">
            <RuckDisplayModeToggle mode={displayMode} onChange={setDisplayMode} />
          </View>
        )}

        {/* Middle content area */}
        <View style={styles.middle} pointerEvents="box-none">

          {/* SIMPLE: big outdoor numbers */}
          {showSimpleData && (
            <View style={styles.simplePanel} pointerEvents="none">
              <Text style={styles.simpleDistance}>
                {tracking.distanceKm.toFixed(2)}
              </Text>
              <Text style={styles.simpleDistanceUnit}>KM</Text>
            </View>
          )}

          {/* MISSION: setup or progress */}
          {showMissionSetup && (
            <View style={styles.panelPad} pointerEvents="auto">
              <MissionSetupPanel draft={missionDraft} onChange={onMissionDraftChange} />
            </View>
          )}
          {showMissionProgress && (
            <View style={styles.panelPad} pointerEvents="none">
              <MissionProgressPanel
                draft={missionDraft}
                distanceKm={tracking.distanceKm}
                elapsedSeconds={tracking.elapsedSeconds}
                gpsQualityWarning={tracking.gpsQualityWarning}
              />
            </View>
          )}

          {/* MAP: overlay tools */}
          {showMapTools && (
            <View style={styles.mapToolsWrapper} pointerEvents="auto">
              <View style={styles.overlayRow}>
                <TouchableOpacity
                  style={[styles.overlayImportBtn, loadingOverlay && styles.overlayImportBtnDisabled]}
                  onPress={onImportOverlay}
                  disabled={loadingOverlay}
                  accessibilityRole="button"
                  accessibilityLabel="Import map overlay"
                >
                  <MaterialCommunityIcons
                    name={loadingOverlay ? 'progress-download' : 'map-plus'}
                    size={15}
                    color={loadingOverlay ? '#47614f' : '#91e6a3'}
                  />
                  <Text style={styles.overlayImportText}>
                    {loadingOverlay ? 'LOADING MAP' : 'IMPORT MAP'}
                  </Text>
                </TouchableOpacity>

                {overlays.map((overlay) => (
                  <Animated.View key={overlay.id} entering={FadeIn.duration(300)} exiting={FadeOut.duration(250)}>
                    <TouchableOpacity
                      style={[styles.overlayChip, !overlay.visible && styles.overlayChipHidden]}
                      onPress={() => onToggleOverlay(overlay.id)}
                      onLongPress={() => onRemoveOverlay(overlay.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${overlay.name}, ${overlay.visible ? 'visible' : 'hidden'}. Long press to remove.`}
                    >
                      <View style={[styles.overlayDot, { backgroundColor: overlay.color }]} />
                      <Text style={styles.overlayChipText} numberOfLines={1}>{overlay.name}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              <MapLayerPicker activeLayer={tracking.activeLayer} onSelect={tracking.setLayer} />
            </View>
          )}

          {/* FINISHED: save panel fills the middle area */}
          {isFinished && (
            <View style={styles.savePanelArea} pointerEvents="auto">
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
          )}
        </View>

        {/* ── Control dock — flex child, never absolute ─────────── */}
        <View style={styles.controlDock} pointerEvents="auto">
          <ControlRow
            tracking={tracking}
            onSave={onSaveSession}
            onDiscard={onDiscardDraft}
          />
        </View>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050e09',
  },
  darkMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 14, 9, 0.94)',
  },
  hud: {
    flex: 1,
    flexDirection: 'column',
  },
  middle: {
    flex: 1,
  },
  simplePanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  simpleDistance: {
    color: '#edf5ea',
    fontSize: 88,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 88,
    fontVariant: ['tabular-nums'],
  },
  simpleDistanceUnit: {
    color: '#3a6b46',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  panelPad: {
    padding: 14,
    flex: 1,
    justifyContent: 'flex-end',
  },
  mapToolsWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  overlayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  overlayImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(5,14,9,0.85)',
    borderWidth: 1,
    borderColor: '#235c32',
  },
  overlayImportBtnDisabled: { borderColor: '#172c20' },
  overlayImportText: { color: '#91e6a3', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  overlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(5,14,9,0.85)',
    borderWidth: 1,
    borderColor: '#172c20',
    maxWidth: 130,
  },
  overlayChipHidden: { opacity: 0.35 },
  overlayDot: { width: 6, height: 6, borderRadius: 3 },
  overlayChipText: { color: '#b8cbb8', fontSize: 10, fontWeight: '800', flexShrink: 1 },
  savePanelArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  controlDock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#172c20',
    backgroundColor: 'rgba(5,14,9,0.97)',
  },
});
