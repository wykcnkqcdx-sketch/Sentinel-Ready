import { DS } from '@/constants/theme';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { TrackPoint } from '@/src/types/map';
import type { MapLayerKey } from '@/src/utils/mapTiles';
import { formatCoordinate, parseCoordinate } from '@/src/utils/coordinates';
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
type PlannerMode = 'tap' | 'draw' | 'coord';

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
  const [mode, setMode] = useState<PlannerMode>('tap');
  const [coordinateInput, setCoordinateInput] = useState('');
  const [coordinateError, setCoordinateError] = useState('');

  const distanceKm = useMemo(() => calculateRouteDistanceKm(points), [points]);
  const estimatedMinutes = useMemo(() => {
    const pace = Number(paceMinutesPerKm);
    return estimateRouteMinutes(distanceKm, Number.isFinite(pace) && pace > 0 ? pace : 12);
  }, [distanceKm, paceMinutesPerKm]);

  function handleDropWaypoint(latitude: number, longitude: number) {
    setPoints((prev) => [...prev, makePoint(latitude, longitude)]);
  }

  function handleAddCoordinate() {
    const parsed = parseCoordinate(coordinateInput);
    if (!parsed) {
      setCoordinateError('Enter lat/long, DMS, UTM, or MGRS grid reference.');
      return;
    }

    setCoordinateError('');
    setPoints((prev) => [...prev, makePoint(parsed.latitude, parsed.longitude)]);
    setCoordinateInput('');
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
  const latestPoint = points[points.length - 1] ?? null;
  const modeHint =
    mode === 'draw'
      ? 'Drag on the map to sketch the route line.'
      : mode === 'coord'
        ? 'Enter a grid reference or lat/long, then add it to the route.'
        : 'Tap map locations to place start, checkpoints, and finish.';

  return (
    <View style={styles.container}>
      <RuckMapView
        routePoints={[]}
        plannedRoutePoints={points}
        currentPosition={mode === 'draw' ? null : latestPoint}
        layer={DEFAULT_LAYER}
        zoom={14}
        fullHeight
        interactive
        showGpsStatus={false}
        onDropWaypoint={mode === 'coord' ? undefined : handleDropWaypoint}
        routeDrawMode={mode === 'draw'}
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
          <Text style={styles.instructionText}>{modeHint}</Text>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.modeRow}>
          {(['tap', 'draw', 'coord'] as PlannerMode[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.modeButton, mode === item && styles.modeButtonActive]}
              onPress={() => {
                setMode(item);
                setCoordinateError('');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === item }}
            >
              <Text style={[styles.modeButtonText, mode === item && styles.modeButtonTextActive]}>
                {item === 'tap' ? 'TAP' : item === 'draw' ? 'DRAW' : 'GRID'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'coord' ? (
          <View style={styles.coordinateBlock}>
            <Text style={styles.label}>GRID / LAT LONG</Text>
            <View style={styles.coordinateRow}>
              <TextInput
                style={styles.coordinateInput}
                value={coordinateInput}
                onChangeText={(text) => {
                  setCoordinateInput(text);
                  if (coordinateError) setCoordinateError('');
                }}
                placeholder="53.34980, -6.26030 or 29U PV 12345 67890"
                placeholderTextColor={DS.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.addPointButton, coordinateInput.trim().length === 0 && styles.buttonDisabled]}
                onPress={handleAddCoordinate}
                disabled={coordinateInput.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel="Add coordinate to route"
              >
                <Text style={styles.addPointButtonText}>ADD</Text>
              </TouchableOpacity>
            </View>
            {coordinateError ? <Text style={styles.errorText}>{coordinateError}</Text> : null}
          </View>
        ) : null}

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

        {latestPoint ? (
          <View style={styles.latestPointRow}>
            <Text style={styles.latestPointLabel}>LAST POINT</Text>
            <Text style={styles.latestPointValue} numberOfLines={1}>
              {formatCoordinate(latestPoint.latitude, latestPoint.longitude, 'latlon')}
            </Text>
          </View>
        ) : null}

        {points.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pointRail}>
            {points.map((point, index) => (
              <View key={`${point.latitude}-${point.longitude}-${index}`} style={styles.pointChip}>
                <Text style={styles.pointChipIndex}>{index === 0 ? 'START' : index === points.length - 1 ? 'FINISH' : `CP ${index}`}</Text>
                <Text style={styles.pointChipText}>
                  {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
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
  modeRow: { flexDirection: 'row', gap: 8 },
  modeButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: DS.gold,
    borderColor: DS.gold,
  },
  modeButtonText: { color: DS.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  modeButtonTextActive: { color: DS.bgPrimary },
  coordinateBlock: { gap: 5 },
  coordinateRow: { flexDirection: 'row', gap: 8 },
  coordinateInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.bgPrimary,
    color: DS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 10,
  },
  addPointButton: {
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.gold,
    backgroundColor: DS.bgCard,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPointButtonText: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  errorText: { color: DS.warning, fontSize: 11, fontWeight: '800' },
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
  latestPointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: DS.border,
    paddingTop: 9,
  },
  latestPointLabel: { color: DS.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  latestPointValue: { flex: 1, color: DS.gold, fontSize: 11, fontWeight: '900', textAlign: 'right' },
  pointRail: { gap: 8, paddingRight: 4 },
  pointChip: {
    minWidth: 118,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.bgPrimary,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 2,
  },
  pointChipIndex: { color: DS.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  pointChipText: { color: DS.textSecondary, fontSize: 10, fontWeight: '800' },
});
