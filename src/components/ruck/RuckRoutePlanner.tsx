import { DS } from '@/constants/theme';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { TrackPoint } from '@/src/types/map';
import type { MapLayerKey } from '@/src/utils/mapTiles';
import {
  buildPlannedRouteFromPoints,
  calculateRouteDistanceKm,
  estimateRouteMinutes,
  formatEstimatedTime,
  formatRouteDistance,
  type PlannedRuckRoute,
} from '@/src/utils/ruckRouteUtils';
import { RuckMapView } from './RuckMapView';

const DEFAULT_LAYER: MapLayerKey = 'topo';

function makePoint(latitude: number, longitude: number): TrackPoint {
  return { latitude, longitude, altitude: null, accuracy: null, timestamp: Date.now() };
}

export function RuckRoutePlanner({
  onCancel,
  onStartPlan,
}: {
  onCancel: () => void;
  onStartPlan: (route: PlannedRuckRoute) => void;
}) {
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [routeName, setRouteName] = useState('Field Route');
  const [paceMinutesPerKm, setPaceMinutesPerKm] = useState('12');

  const distanceKm = useMemo(() => calculateRouteDistanceKm(points), [points]);
  const estimatedMinutes = useMemo(() => {
    const pace = Number(paceMinutesPerKm);
    return estimateRouteMinutes(distanceKm, Number.isFinite(pace) && pace > 0 ? pace : 12);
  }, [distanceKm, paceMinutesPerKm]);

  function handleDropWaypoint(latitude: number, longitude: number) {
    setPoints((prev) => [...prev, makePoint(latitude, longitude)]);
  }

  function handleUndo() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function handleStartPlan() {
    if (points.length < 2 || distanceKm < 0.1) {
      Alert.alert('Route too short', 'Drop at least a start point and finish point before starting a planned mission.');
      return;
    }
    onStartPlan({
      ...buildPlannedRouteFromPoints(points, routeName.trim() || 'Field Route'),
      estimatedMinutes,
    });
  }

  const checkpointCount = Math.max(0, points.length - 2);

  return (
    <View style={styles.container}>
      <RuckMapView
        routePoints={[]}
        plannedRoutePoints={points}
        currentPosition={points[points.length - 1] ?? null}
        layer={DEFAULT_LAYER}
        zoom={14}
        fullHeight
        interactive
        showGpsStatus={false}
        onDropWaypoint={handleDropWaypoint}
      />

      <View style={styles.topPanel} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backButton}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Return to route browser"
        >
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.instructionCard}>
          <Text style={styles.kicker}>PLAN ROUTE</Text>
          <Text style={styles.instructionText}>Tap the map to place start, checkpoints, and finish.</Text>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.label}>ROUTE NAME</Text>
            <TextInput
              style={styles.nameInput}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Field Route"
              placeholderTextColor={DS.textMuted}
            />
          </View>
          <View style={styles.paceBlock}>
            <Text style={styles.label}>PACE</Text>
            <TextInput
              style={styles.paceInput}
              value={paceMinutesPerKm}
              onChangeText={setPaceMinutesPerKm}
              keyboardType="numeric"
              placeholder="12"
              placeholderTextColor={DS.textMuted}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatRouteDistance(distanceKm)}</Text>
            <Text style={styles.statLabel}>DISTANCE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatEstimatedTime(estimatedMinutes)}</Text>
            <Text style={styles.statLabel}>EST TIME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{checkpointCount}</Text>
            <Text style={styles.statLabel}>CHECKPOINTS</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, points.length === 0 && styles.buttonDisabled]}
            onPress={handleUndo}
            disabled={points.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Undo last checkpoint"
          >
            <Text style={styles.secondaryButtonText}>UNDO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, points.length === 0 && styles.buttonDisabled]}
            onPress={() => setPoints([])}
            disabled={points.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Clear planned route"
          >
            <Text style={styles.secondaryButtonText}>CLEAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.startButton, points.length < 2 && styles.buttonDisabled]}
            onPress={handleStartPlan}
            disabled={points.length < 2}
            accessibilityRole="button"
            accessibilityLabel="Start planned ruck mission"
          >
            <Text style={styles.startButtonText}>START MISSION</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.bgPrimary },
  topPanel: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  backButton: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    backgroundColor: 'rgba(7,17,12,0.94)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  instructionCard: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    backgroundColor: 'rgba(7,17,12,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  kicker: { color: DS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  instructionText: { color: DS.textPrimary, fontSize: 12, fontWeight: '800' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    backgroundColor: 'rgba(7,17,12,0.97)',
    padding: 14,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', gap: 10 },
  nameBlock: { flex: 1, gap: 5 },
  paceBlock: { width: 82, gap: 5 },
  label: { color: DS.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  nameInput: {
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.bgPrimary,
    color: DS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 10,
  },
  paceInput: {
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.bgPrimary,
    color: DS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: DS.border,
    overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  statValue: { color: DS.textPrimary, fontSize: 13, fontWeight: '900' },
  statLabel: { color: DS.textSecondary, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: DS.border },
  actionsRow: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.bgCard,
  },
  secondaryButtonText: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  startButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.gold,
  },
  startButtonText: { color: DS.bgPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  buttonDisabled: { opacity: 0.45 },
});
