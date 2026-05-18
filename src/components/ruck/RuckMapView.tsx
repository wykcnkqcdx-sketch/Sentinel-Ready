import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, LayoutChangeEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { buildVisibleTiles, getMercatorRoutePoints, latLonToWorldPixel, worldPixelToLatLon } from '../../utils/mapTiles';
import type { MapLayerKey, MapTile, MapViewport } from '../../utils/mapTiles';
import type { TrackPoint } from '../../types/map';
import type { MapOverlay } from '../../utils/fieldMapping';
import { getResolvedTileUri } from '../../services/tileCache';

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
}

export function RuckMapView({
  routePoints,
  currentPosition,
  layer,
  zoom = 15,
  overlays,
  fullHeight = false,
  showGpsStatus = true,
  interactive = true,
}: RuckMapViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState<MapViewport>({ width: windowWidth, height: MAP_HEIGHT });
  const [mapZoom, setMapZoom] = useState(clampZoom(zoom));
  const [mapCenter, setMapCenter] = useState<TrackPoint | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const panStartRef = useRef<{ x: number; y: number; center: TrackPoint } | null>(null);
  const panFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

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

  useEffect(() => {
    return () => {
      if (panFrameRef.current != null) {
        cancelAnimationFrame(panFrameRef.current);
      }
    };
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) =>
      interactive && (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8),
    onPanResponderGrant: () => {
      panStartRef.current = { x: 0, y: 0, center };
    },
    onPanResponderMove: (_, gesture) => {
      const start = panStartRef.current;
      if (!start || viewport.width <= 0 || viewport.height <= 0) return;

      const pixel = latLonToWorldPixel(start.center.latitude, start.center.longitude, mapZoom);
      const next = worldPixelToLatLon(pixel.x - gesture.dx, pixel.y - gesture.dy, mapZoom);

      if (panFrameRef.current != null) {
        cancelAnimationFrame(panFrameRef.current);
      }
      panFrameRef.current = requestAnimationFrame(() => {
        setIsFollowing(false);
        setMapCenter(toTrackPoint(next.latitude, next.longitude));
        panFrameRef.current = null;
      });
    },
    onPanResponderRelease: () => {
      panStartRef.current = null;
    },
    onPanResponderTerminate: () => {
      panStartRef.current = null;
    },
  }), [center, interactive, mapZoom, viewport.height, viewport.width]);

  const tiles = useMemo(
    () => buildVisibleTiles(center, viewport, layer, mapZoom),
    [center, layer, mapZoom, viewport],
  );
  const uriMap = useResolvedTileUris(tiles);

  const projectedPoints = useMemo(
    () => Svg && Polyline && routePoints.length >= 2
      ? getMercatorRoutePoints(routePoints, center, viewport, mapZoom)
      : [],
    [center, mapZoom, routePoints, viewport],
  );

  const projectedCurrent = useMemo(
    () => Svg && Circle && currentPosition
      ? getMercatorRoutePoints([currentPosition], center, viewport, mapZoom)[0]
      : null,
    [center, currentPosition, mapZoom, viewport],
  );

  const polylinePoints = useMemo(
    () => projectedPoints.map((p) => `${p.x},${p.y}`).join(' '),
    [projectedPoints],
  );

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== viewport.width || height !== viewport.height)) {
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
      {...(interactive ? panResponder.panHandlers : {})}
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
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={3}
              strokeOpacity={0.9}
            />
          )}
          {Circle && projectedCurrent && (
            <Circle
              cx={projectedCurrent.x}
              cy={projectedCurrent.y}
              r={8}
              fill="#3B82F6"
              stroke="white"
              strokeWidth={2}
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
        </Svg>
      )}

      <View style={styles.crosshair} pointerEvents="none">
        <View style={styles.crosshairHorizontal} />
        <View style={styles.crosshairVertical} />
        <View style={styles.crosshairBox} />
      </View>

      <View style={styles.topHud} pointerEvents="none">
        <Text style={styles.hudTitle}>RUCK MAP</Text>
        <Text style={styles.hudText}>
          {formatCoord(center.latitude, 'N', 'S')}  {formatCoord(center.longitude, 'E', 'W')}  Z{Math.round(mapZoom)}
        </Text>
      </View>

      <View style={styles.scaleWrap} pointerEvents="none">
        <View style={styles.scaleBar} />
        <Text style={styles.scaleText}>FIELD GRID</Text>
      </View>

      {interactive ? (
        <>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.mapButton} onPress={() => adjustZoom(1)} accessibilityRole="button" accessibilityLabel="Zoom in">
              <MaterialCommunityIcons name="magnify-plus-outline" size={22} color="#dfe8da" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton} onPress={() => adjustZoom(-1)} accessibilityRole="button" accessibilityLabel="Zoom out">
              <MaterialCommunityIcons name="magnify-minus-outline" size={22} color="#dfe8da" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={recenterMap}
              accessibilityRole="button"
              accessibilityLabel="Recenter map on current position"
              accessibilityState={{ selected: isFollowing }}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={18}
                color={isFollowing ? '#07110c' : '#dfe8da'}
              />
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
    color: '#91e6a3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  hudText: {
    color: '#dfe8da',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
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
    borderColor: '#dfe8da',
  },
  scaleText: {
    color: '#dfe8da',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  zoomControls: {
    position: 'absolute',
    top: 72,
    right: 18,
    gap: 8,
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(3,10,7,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.24)',
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(3,10,7,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButtonText: {
    color: '#dfe8da',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  followButton: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(3,10,7,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(145,230,163,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  followButtonActive: {
    backgroundColor: '#91e6a3',
    borderColor: '#91e6a3',
  },
  followButtonText: {
    color: '#dfe8da',
    fontSize: 10,
    fontWeight: '900',
  },
  followButtonTextActive: {
    color: '#07110c',
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
    color: '#dfe8da',
    fontSize: 12,
    fontWeight: '900',
  },
});
