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
import { RuckSafetyAlerts } from '@/src/components/ruck/RuckSafetyAlerts';
import { getNumberInput } from '@/src/components/ruck/ruckPanelUtils';
import { useRuckTracking } from '@/src/hooks/useRuckTracking';
import type { MapOverlay } from '@/src/utils/fieldMapping';
import { formatElapsed, formatPace } from '@/src/utils/ruckSafetyUtils';
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
  const [displayMode, setDisplayMode] = useState<RuckDisplayMode>('map');

  const targetDistance = Math.max(0, getNumberInput(missionDraft.targetDistanceKm, 0));
  const targetMinutes = Math.max(0, getNumberInput(missionDraft.targetMinutes, 0));
  const packWeightKg = Math.max(0, getNumberInput(missionDraft.packWeightKg, 0));
  const targetPaceMinutesPerKm =
    targetDistance > 0 && targetMinutes > 0 ? targetMinutes / targetDistance : undefined;

  const isFinished = tracking.trackingState === 'finished';
  const isIdle = tracking.trackingState === 'idle';
  const mapStatus =
    tracking.trackingState === 'recording' ? 'Recording'
    : tracking.trackingState === 'paused' ? 'Paused'
    : tracking.trackingState === 'finished' ? 'Complete'
    : 'Ready';

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
                <Stop offset="0" stopColor="#0F1115" stopOpacity="0.92" />
                <Stop offset="0.22" stopColor="#0F1115" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.55" stopColor="#0F1115" stopOpacity="0" />
                <Stop offset="1" stopColor="#0F1115" stopOpacity="0.98" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#tg)" />
            <Rect width="100%" height="100%" fill="url(#bg)" />
          </Svg>
        </View>
      )}

      {/* ── HUD Column — flex layout, never overlaps tab bar ─────── */}
      <View style={styles.hud} pointerEvents="box-none">

        {displayMode === 'simple' ? (
          <View style={styles.recorderHeader} pointerEvents="none">
            <Text style={styles.recorderKicker}>SENTINEL RUCK</Text>
            <View style={styles.recorderStatus}>
              <MaterialCommunityIcons
                name={tracking.trackingState === 'recording' ? 'record-circle' : 'map-marker-radius'}
                size={13}
                color={tracking.trackingState === 'recording' ? '#FC4C02' : '#35C759'}
              />
              <Text style={styles.recorderStatusText}>
                {tracking.trackingState === 'recording'
                  ? 'RECORDING'
                  : tracking.trackingState === 'paused'
                    ? 'PAUSED'
                    : 'READY'}
              </Text>
            </View>
          </View>
        ) : (
          <View pointerEvents="none">
            <LiveMetricsOverlay
              distanceKm={tracking.distanceKm}
              elapsedSeconds={tracking.elapsedSeconds}
              gpsQualityWarning={tracking.gpsQualityWarning}
              trackingState={tracking.trackingState}
              targetPaceMinutesPerKm={targetPaceMinutesPerKm}
            />
          </View>
        )}

        {/* Mode toggle */}
        {!isFinished && (
          <View pointerEvents="auto">
            <RuckDisplayModeToggle mode={displayMode} onChange={setDisplayMode} />
          </View>
        )}

        {/* Middle content area */}
        <View style={styles.middle} pointerEvents="box-none">

          {/* SIMPLE: big outdoor numbers + safety alerts */}
          {showSimpleData && (
            <View style={styles.simpleWrapper}>
              <View style={styles.simplePanel} pointerEvents="none">
                <View style={styles.liveMetricBlock}>
                  <Text style={styles.liveMetricLabel}>TIME</Text>
                  <Text style={styles.liveTime}>{formatElapsed(tracking.elapsedSeconds)}</Text>
                </View>

                <View style={styles.liveDivider} />

                <View style={styles.liveMetricBlock}>
                  <Text style={styles.liveMetricLabel}>PACE</Text>
                  <Text style={styles.livePace}>
                    {formatPace(tracking.distanceKm, tracking.elapsedSeconds).replace('/km', '')}
                  </Text>
                  <Text style={styles.liveMetricUnit}>/ KM</Text>
                </View>

                <View style={styles.liveDivider} />

                <View style={styles.liveMetricBlock}>
                  <Text style={styles.liveMetricLabel}>DISTANCE</Text>
                  <View style={styles.liveDistanceRow}>
                    <Text style={styles.liveDistance}>{tracking.distanceKm.toFixed(2)}</Text>
                    <Text style={styles.liveDistanceUnit}>KM</Text>
                  </View>
                </View>
              </View>
              <RuckSafetyAlerts
                gpsQualityWarning={tracking.gpsQualityWarning}
                loadKg={packWeightKg > 0 ? packWeightKg : undefined}
                distanceKm={tracking.distanceKm}
                elapsedSeconds={tracking.elapsedSeconds}
                targetDistanceKm={targetDistance}
                targetMinutes={targetMinutes}
              />
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

          {/* MAP: Strava-style activity card and map tools */}
          {showMapTools && (
            <View style={styles.mapToolsWrapper} pointerEvents="auto">
              <View style={styles.activityCard}>
                <View style={styles.activityGrabber} />
                <View style={styles.activityHeader}>
                  <View style={styles.activityIcon}>
                    <MaterialCommunityIcons name="bag-personal" size={18} color="#0F1115" />
                  </View>
                  <View style={styles.activityTitleBlock}>
                    <Text style={styles.activityTitle}>Loaded Ruck</Text>
                    <Text style={styles.activityMeta}>{mapStatus} from your location</Text>
                  </View>
                  <View style={styles.activityBadge}>
                    <Text style={styles.activityBadgeText}>{tracking.activeLayer.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.activityStats}>
                  <View style={styles.activityStat}>
                    <Text style={styles.activityStatValue}>{tracking.distanceKm.toFixed(2)}</Text>
                    <Text style={styles.activityStatLabel}>km</Text>
                  </View>
                  <View style={styles.activityStatDivider} />
                  <View style={styles.activityStat}>
                    <Text style={styles.activityStatValue}>{formatElapsed(tracking.elapsedSeconds)}</Text>
                    <Text style={styles.activityStatLabel}>time</Text>
                  </View>
                  <View style={styles.activityStatDivider} />
                  <View style={styles.activityStat}>
                    <Text style={styles.activityStatValue}>
                      {formatPace(tracking.distanceKm, tracking.elapsedSeconds).replace('/km', '')}
                    </Text>
                    <Text style={styles.activityStatLabel}>/km</Text>
                  </View>
                </View>

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
                      color={loadingOverlay ? '#737A86' : '#FC4C02'}
                    />
                    <Text style={styles.overlayImportText}>
                      {loadingOverlay ? 'LOADING' : 'OVERLAY'}
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
    backgroundColor: '#0F1115',
  },
  darkMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 14, 9, 0.88)',
  },
  hud: {
    flex: 1,
    flexDirection: 'column',
  },
  middle: {
    flex: 1,
  },
  recorderHeader: {
    minHeight: 64,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: 'rgba(10, 14, 12, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#18231c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recorderKicker: {
    color: '#edf5ea',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  recorderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#203529',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(5,14,9,0.85)',
  },
  recorderStatusText: {
    color: '#FC4C02',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  simpleWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  simplePanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 20,
  },
  liveMetricBlock: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  liveMetricLabel: {
    color: '#8fbf8f',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  liveMetricUnit: {
    color: '#6f8a70',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  liveTime: {
    color: '#f5f7f2',
    fontSize: 64,
    fontWeight: '300',
    letterSpacing: 0,
    lineHeight: 72,
    fontVariant: ['tabular-nums'],
  },
  livePace: {
    color: '#ffffff',
    fontSize: 116,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 120,
    fontVariant: ['tabular-nums'],
  },
  liveDistanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  liveDistance: {
    color: '#f5f7f2',
    fontSize: 62,
    fontWeight: '900',
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
  },
  liveDistanceUnit: {
    color: '#8fbf8f',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    paddingBottom: 9,
  },
  liveDivider: {
    width: '100%',
    maxWidth: 300,
    height: 1,
    backgroundColor: '#1a251d',
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
  },
  activityCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(30,34,41,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },
  activityGrabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(223,232,218,0.28)',
    marginBottom: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FC4C02',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitleBlock: {
    flex: 1,
  },
  activityTitle: {
    color: '#edf5ea',
    fontSize: 17,
    fontWeight: '900',
  },
  activityMeta: {
    color: '#A7ADB8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  activityBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(252,76,2,0.32)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(252,76,2,0.14)',
  },
  activityBadgeText: {
    color: '#FC4C02',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
  },
  activityStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  activityStatValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  activityStatLabel: {
    color: '#A7ADB8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  activityStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    borderColor: 'rgba(252,76,2,0.32)',
  },
  overlayImportBtnDisabled: { borderColor: '#172c20' },
  overlayImportText: { color: '#FC4C02', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
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
