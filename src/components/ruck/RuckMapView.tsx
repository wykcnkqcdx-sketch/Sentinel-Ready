import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { buildVisibleTiles, getMercatorRoutePoints, latLonToWorldPixel, worldPixelToLatLon } from '../../utils/mapTiles';
import type { MapLayerKey, MapTile, MapViewport } from '../../utils/mapTiles';
import type { TrackPoint } from '../../types/map';
import type { MapOverlay } from '../../utils/fieldMapping';
import { getResolvedTileUri } from '../../services/tileCache';
import { formatCoordinate } from '../../utils/coordinates';
import { bearingBetween, distanceBetween } from '../../utils/mapUtils';
import { CompassOverlay } from './CompassOverlay';
import type { WaypointMarker } from '../../services/waypointService';
import { waypointColor, waypointSymbol } from '../../services/waypointService';

let Svg: React.ComponentType<any> | null = null;
let Polyline: React.ComponentType<any> | null = null;
let Circle: React.ComponentType<any> | null = null;
let Polygon: React.ComponentType<any> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnSvg = require('react-native-svg');
  Svg = rnSvg.default;
  Polyline = rnSvg.Polyline;
  Circle = rnSvg.Circle;
  Polygon = rnSvg.Polygon;
} catch {
  // react-native-svg not available; route overlay will be skipped
}

const DUBLIN: TrackPoint = { latitude: 53.3498, longitude: -6.2603, altitude: null, accuracy: null, timestamp: 0 };
const MAP_HEIGHT = 300;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function toTrackPoint(latitude: number, longitude: number): TrackPoint {
  return { latitude, longitude, altitude: null, accuracy: null, timestamp: 0 };
}

function formatCoord(value: number, positive: string, negative: string) {
  const hemi = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(5)}${hemi}`;
}

function useResolvedTileUris(tiles: MapTile[]): Map<string, string> {
  const [uriMap, setUriMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const map = new Map<string, string>();
    Promise.all(
      tiles.map(async (tile) => {
        const parts = tile.id.split('-');
        const layer = parts[0] as MapLayerKey;
        const y = Number(parts[parts.length - 1]);
        const x = Number(parts[parts.length - 2]);
        const zoom = Number(parts[parts.length - 3]);
        try {
          const uri = await getResolvedTileUri(layer, zoom, x, y);
          map.set(tile.id, uri);
        } catch {
          map.set(tile.id, tile.url);
        }
      }),
    ).then(() => {
      if (!cancelled) setUriMap(new Map(map));
    });
    return () => {
      cancelled = true;
    };
  }, [tiles]);

  return uriMap;
}

export interface RuckMapViewProps {
  routePoints: TrackPoint[];
  currentPosition: TrackPoint | null;
  layer: MapLayerKey;
  zoom?: number;
  overlays?: MapOverlay[];
  fullHeight?: boolean;
  showGpsStatus?: boolean;
  interactive?: boolean;
  heading?: number | null;
  waypoints?: WaypointMarker[];
  onDropWaypoint?: (latitude: number, longitude: number) => void;
  measureMode?: boolean;
}

type MeasurePoint = { latitude: number; longitude: number };

export function RuckMapView({
  routePoints,
  currentPosition,
  layer,
  zoom = 15,
  overlays,
  fullHeight = false,
  showGpsStatus = true,
  interactive = true,
  heading = null,
  waypoints = [],
  onDropWaypoint,
  measureMode = false,
}: RuckMapViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState<MapViewport>({ width: windowWidth, height: MAP_HEIGHT });
  const [mapZoom, setMapZoom] = useState(clampZoom(zoom));
  const [mapCenter, setMapCenter] = useState<TrackPoint | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [measureA, setMeasureA] = useState<MeasurePoint | null>(null);
  const [measureB, setMeasureB] = useState<MeasurePoint | null>(null);
  const panStartRef = useRef<{ x: number; y: number; center: TrackPoint } | null>(null);

  const liveCenter: TrackPoint =
    currentPosition ?? (routePoints.length > 0 ? routePoints[routePoints.length - 1] : DUBLIN);
  const center = mapCenter ?? liveCenter;

  useEffect(() => {
    setMapZoom(clampZoom(zoom));
  }, [zoom]);

  useEffect(() => {
    if (isFollowing) {
      setMapCenter(liveCenter);
    }
  }, [isFollowing, liveCenter]);

  const tapStartRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => interactive,
    onMoveShouldSetPanResponder: (_, gesture) =>
      interactive && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
    onPanResponderGrant: (e) => {
      panStartRef.current = { x: 0, y: 0, center };
      tapStartRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    },
    onPanResponderMove: (_, gesture) => {
      const start = panStartRef.current;
      if (!start || viewport.width <= 0 || viewport.height <= 0) return;

      const pixel = latLonToWorldPixel(start.center.latitude, start.center.longitude, mapZoom);
      const next = worldPixelToLatLon(pixel.x - gesture.dx, pixel.y - gesture.dy, mapZoom);
      setIsFollowing(false);
      setMapCenter(toTrackPoint(next.latitude, next.longitude));
    },
    onPanResponderRelease: (_, gesture) => {
      // Treat as tap if movement was minimal
      if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6 && tapStartRef.current) {
        handleMapTap(tapStartRef.current.x, tapStartRef.current.y);
      }
      panStartRef.current = null;
      tapStartRef.current = null;
    },
    onPanResponderTerminate: () => {
      panStartRef.current = null;
      tapStartRef.current = null;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [center, interactive, mapZoom, viewport.height, viewport.width, measureMode, measureA, measureB, onDropWaypoint]);

  const tiles = buildVisibleTiles(center, viewport, layer, mapZoom);
  const uriMap = useResolvedTileUris(tiles);

  const projectedPoints = Svg && Polyline && routePoints.length >= 2
    ? getMercatorRoutePoints(routePoints, center, viewport, mapZoom)
    : [];

  const projectedCurrent = Svg && Circle && currentPosition
    ? getMercatorRoutePoints([currentPosition], center, viewport, mapZoom)[0]
    : null;

  const polylinePoints = projectedPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const mgrsLabel = useMemo(
    () => formatCoordinate(center.latitude, center.longitude, 'mgrs'),
    [center.latitude, center.longitude],
  );

  // Measure: range & bearing between two tapped points
  const measureResult = useMemo(() => {
    if (!measureA || !measureB) return null;
    const a: TrackPoint = { ...measureA, altitude: null, accuracy: null, timestamp: 0 };
    const b: TrackPoint = { ...measureB, altitude: null, accuracy: null, timestamp: 0 };
    return {
      distanceKm: distanceBetween(a, b),
      bearing: bearingBetween(a, b),
    };
  }, [measureA, measureB]);

  function handleMapTap(screenX: number, screenY: number) {
    const pixel = latLonToWorldPixel(center.latitude, center.longitude, mapZoom);
    const tappedLat = worldPixelToLatLon(
      pixel.x + screenX - viewport.width / 2,
      pixel.y + screenY - viewport.height / 2,
      mapZoom,
    );

    if (measureMode) {
      if (!measureA) {
        setMeasureA(tappedLat);
        setMeasureB(null);
      } else if (!measureB) {
        setMeasureB(tappedLat);
      } else {
        // Reset on third tap
        setMeasureA(tappedLat);
        setMeasureB(null);
      }
      return;
    }

    if (onDropWaypoint) {
      onDropWaypoint(tappedLat.latitude, tappedLat.longitude);
    }
  }

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewport({ width, height });
    }
  }

  function adjustZoom(delta: number) {
    setIsFollowing(false);
    setMapZoom((value) => clampZoom(value + delta));
  }

  function nudgeMap(dx: number, dy: number) {
    const pixel = latLonToWorldPixel(center.latitude, center.longitude, mapZoom);
    const next = worldPixelToLatLon(pixel.x + dx, pixel.y + dy, mapZoom);
    setIsFollowing(false);
    setMapCenter(toTrackPoint(next.latitude, next.longitude));
  }

  function recenterMap() {
    setIsFollowing(true);
    setMapCenter(liveCenter);
  }

  return (
    <View
      style={[styles.container, fullHeight && styles.fullHeight]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {tiles.map((tile) => (
        <Image key={tile.id} source={{ uri: uriMap.get(tile.id) ?? tile.url }} style={tile.style} />
      ))}

      <View style={styles.tacticalTint} pointerEvents="none" />
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={`v-${index}`} style={[styles.gridLineVertical, { left: `${(index + 1) * 16.66}%` }]} />
        ))}
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`h-${index}`} style={[styles.gridLineHorizontal, { top: `${(index + 1) * 25}%` }]} />
        ))}
      </View>

      {Svg && (Polyline || Circle) && (
        <Svg width={viewport.width} height={viewport.height} style={StyleSheet.absoluteFill}>
          {Polyline && projectedPoints.length >= 2 && (
            <>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="#0F1115"
                strokeWidth={8}
                strokeOpacity={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="#FC4C02"
                strokeWidth={5}
                strokeOpacity={1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
          {Circle && projectedPoints.length >= 1 && (
            <Circle
              cx={projectedPoints[0].x}
              cy={projectedPoints[0].y}
              r={6}
              fill="#0F1115"
              stroke="#35C759"
              strokeWidth={3}
            />
          )}
          {Circle && projectedCurrent && (
            <Circle
              cx={projectedCurrent.x}
              cy={projectedCurrent.y}
              r={9}
              fill="#FC4C02"
              stroke="#0F1115"
              strokeWidth={3}
            />
          )}

          {overlays && overlays.length > 0 && overlays.filter(o => o.visible).map(overlay => (
            <React.Fragment key={overlay.id}>
              {Polyline && overlay.lines.map(line => {
                const pts = getMercatorRoutePoints(
                  line.points.map(p => ({ latitude: p.lat, longitude: p.lon, altitude: null, accuracy: null, timestamp: 0 })),
                  center, viewport, mapZoom
                );
                if (pts.length < 2) return null;
                return (
                  <Polyline
                    key={line.id}
                    points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={overlay.color}
                    strokeWidth={2}
                    strokeOpacity={0.85}
                    strokeDasharray="6,3"
                  />
                );
              })}

              {Circle && overlay.points.map(point => {
                const pts = getMercatorRoutePoints(
                  [{ latitude: point.latitude, longitude: point.longitude, altitude: null, accuracy: null, timestamp: 0 }],
                  center, viewport, mapZoom
                );
                if (pts.length < 1) return null;
                return (
                  <Circle
                    key={point.id}
                    cx={pts[0].x}
                    cy={pts[0].y}
                    r={5}
                    fill={overlay.color}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                );
              })}

              {Polygon && overlay.polygons.map(polygon =>
                polygon.rings.map((ring, ringIndex) => {
                  const pts = getMercatorRoutePoints(
                    ring.map(p => ({ latitude: p.lat, longitude: p.lon, altitude: null, accuracy: null, timestamp: 0 })),
                    center, viewport, mapZoom
                  );
                  if (pts.length < 3) return null;
                  return (
                    <Polygon
                      key={`${polygon.id}-ring${ringIndex}`}
                      points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                      fill={overlay.color}
                      fillOpacity={0.15}
                      stroke={overlay.color}
                      strokeWidth={1.5}
                      strokeOpacity={0.8}
                    />
                  );
                })
              )}
            </React.Fragment>
          ))}

          {/* Waypoints */}
          {Circle && waypoints.map((wp) => {
            const pts = getMercatorRoutePoints(
              [{ latitude: wp.latitude, longitude: wp.longitude, altitude: null, accuracy: null, timestamp: 0 }],
              center, viewport, mapZoom,
            );
            if (pts.length < 1) return null;
            const color = waypointColor(wp.type);
            return (
              <React.Fragment key={wp.id}>
                <Circle cx={pts[0].x} cy={pts[0].y} r={10} fill={color} fillOpacity={0.85} stroke="#ffffff" strokeWidth={1.5} />
              </React.Fragment>
            );
          })}

          {/* Measure mode: line between points + markers */}
          {measureMode && Circle && Polyline && (() => {
            const ptA = measureA ? getMercatorRoutePoints(
              [{ latitude: measureA.latitude, longitude: measureA.longitude, altitude: null, accuracy: null, timestamp: 0 }],
              center, viewport, mapZoom,
            )[0] : null;
            const ptB = measureB ? getMercatorRoutePoints(
              [{ latitude: measureB.latitude, longitude: measureB.longitude, altitude: null, accuracy: null, timestamp: 0 }],
              center, viewport, mapZoom,
            )[0] : null;
            return (
              <>
                {ptA && <Circle cx={ptA.x} cy={ptA.y} r={8} fill="#B5852C" stroke="#ffffff" strokeWidth={2} />}
                {ptB && <Circle cx={ptB.x} cy={ptB.y} r={8} fill="#ffaa44" stroke="#ffffff" strokeWidth={2} />}
                {ptA && ptB && (
                  <Polyline
                    points={`${ptA.x},${ptA.y} ${ptB.x},${ptB.y}`}
                    fill="none"
                    stroke="#ffaa44"
                    strokeWidth={2}
                    strokeDasharray="8,4"
                  />
                )}
              </>
            );
          })()}
        </Svg>
      )}

      <View style={styles.crosshair} pointerEvents="none">
        <View style={styles.crosshairHorizontal} />
        <View style={styles.crosshairVertical} />
        <View style={styles.crosshairBox} />
      </View>

      <View style={styles.topHud} pointerEvents="none">
        <Text style={styles.hudTitle}>{measureMode ? '[ MEASURE MODE ]' : 'RUCK MAP'}</Text>
        <Text style={styles.hudText}>
          {formatCoord(center.latitude, 'N', 'S')}  {formatCoord(center.longitude, 'E', 'W')}  Z{Math.round(mapZoom)}
        </Text>
        <Text style={styles.hudMgrs}>{mgrsLabel}</Text>
      </View>

      <View style={styles.scaleWrap} pointerEvents="none">
        <View style={styles.scaleBar} />
        <Text style={styles.scaleText}>FIELD GRID</Text>
      </View>

      {heading != null && (
        <View style={styles.compassWrap} pointerEvents="none">
          <CompassOverlay heading={heading} />
        </View>
      )}

      {measureMode && measureResult && (
        <View style={styles.measureBanner} pointerEvents="none">
          <Text style={styles.measureText}>
            {measureResult.distanceKm < 1
              ? `${Math.round(measureResult.distanceKm * 1000)} m`
              : `${measureResult.distanceKm.toFixed(2)} km`}
            {'  '}
            {Math.round(measureResult.bearing)}°
          </Text>
        </View>
      )}
      {measureMode && !measureA && (
        <View style={styles.measureBanner} pointerEvents="none">
          <Text style={styles.measureText}>Tap to set point A</Text>
        </View>
      )}
      {measureMode && measureA && !measureB && (
        <View style={styles.measureBanner} pointerEvents="none">
          <Text style={styles.measureText}>Tap to set point B</Text>
        </View>
      )}

      {interactive ? (
        <>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.mapButton} onPress={() => adjustZoom(1)} accessibilityRole="button" accessibilityLabel="Zoom in">
              <Text style={styles.mapButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton} onPress={() => adjustZoom(-1)} accessibilityRole="button" accessibilityLabel="Zoom out">
              <Text style={styles.mapButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={recenterMap}
              accessibilityRole="button"
              accessibilityLabel="Recenter map on current position"
              accessibilityState={{ selected: isFollowing }}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>CTR</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panPad}>
            <TouchableOpacity style={[styles.panButton, styles.panNorth]} onPress={() => nudgeMap(0, -128)} accessibilityRole="button" accessibilityLabel="Pan map north">
              <Text style={styles.panText}>N</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.panButton, styles.panWest]} onPress={() => nudgeMap(-128, 0)} accessibilityRole="button" accessibilityLabel="Pan map west">
              <Text style={styles.panText}>W</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.panButton, styles.panEast]} onPress={() => nudgeMap(128, 0)} accessibilityRole="button" accessibilityLabel="Pan map east">
              <Text style={styles.panText}>E</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.panButton, styles.panSouth]} onPress={() => nudgeMap(0, 128)} accessibilityRole="button" accessibilityLabel="Pan map south">
              <Text style={styles.panText}>S</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {showGpsStatus && !currentPosition && (
        <View style={styles.gpsOverlay} pointerEvents="none">
          <Text style={styles.gpsText}>Acquiring GPS...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: MAP_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  fullHeight: {
    flex: 1,
    height: undefined,
  },
  gpsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  gpsText: {
    color: '#9ca3af',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tacticalTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,17,12,0.14)',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(145,230,163,0.16)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(145,230,163,0.16)',
  },
  crosshair: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 46,
    height: 46,
    marginLeft: -23,
    marginTop: -23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 46,
    height: 1,
    backgroundColor: 'rgba(145,230,163,0.75)',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: 46,
    backgroundColor: 'rgba(145,230,163,0.75)',
  },
  crosshairBox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.9)',
  },
  topHud: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(3,10,7,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.34)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hudTitle: {
    color: '#B5852C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  hudText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  hudMgrs: {
    color: 'rgba(145,230,163,0.8)',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  scaleWrap: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    gap: 3,
  },
  scaleBar: {
    width: 72,
    height: 5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
  },
  scaleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  zoomControls: {
    position: 'absolute',
    top: 72,
    right: 12,
    gap: 6,
  },
  mapButton: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: 'rgba(3,10,7,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  followButton: {
    minWidth: 38,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(3,10,7,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  followButtonActive: {
    backgroundColor: '#B5852C',
    borderColor: '#B5852C',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  followButtonTextActive: {
    color: '#080c05',
  },
  panPad: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    width: 104,
    height: 104,
  },
  panButton: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(3,10,7,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panNorth: {
    top: 0,
    left: 35,
  },
  panWest: {
    top: 35,
    left: 0,
  },
  panEast: {
    top: 35,
    right: 0,
  },
  panSouth: {
    bottom: 0,
    left: 35,
  },
  panText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  compassWrap: {
    position: 'absolute',
    bottom: 14,
    right: 130,
  },
  measureBanner: {
    position: 'absolute',
    bottom: 14,
    left: '50%',
    transform: [{ translateX: -70 }],
    backgroundColor: 'rgba(3,10,7,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,170,68,0.4)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  measureText: {
    color: '#ffaa44',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
