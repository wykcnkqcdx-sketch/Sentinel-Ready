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
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(zoom);
  const mapZoomRef = useRef(mapZoom);
  mapZoomRef.current = mapZoom;

  const liveCenter: TrackPoint =
    currentPosition ?? (routePoints.length > 0 ? routePoints[routePoints.length - 1] : DUBLIN);
  const center = mapCenter ?? liveCenter;

  // Stable refs so PanResponder closure never goes stale — avoids recreation mid-gesture
  const centerRef = useRef(center);
  centerRef.current = center;

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
    onMoveShouldSetPanResponder: (evt, gesture) => {
      if (!interactive) return false;
      if (evt.nativeEvent.touches.length === 2) return true;
      return Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8;
    },
    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches;
      if (touches.length === 2) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
        pinchStartZoomRef.current = mapZoomRef.current;
      } else {
        panStartRef.current = { x: 0, y: 0, center: centerRef.current };
      }
    },
    onPanResponderMove: (evt, gesture) => {
      const touches = evt.nativeEvent.touches;
      if (touches.length === 2 && pinchStartDistRef.current !== null) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / pinchStartDistRef.current;
        setIsFollowing(false);
        setMapZoom(clampZoom(pinchStartZoomRef.current + Math.log2(scale)));
      } else {
        const start = panStartRef.current;
        if (!start || viewport.width <= 0 || viewport.height <= 0) return;
        const pixel = latLonToWorldPixel(start.center.latitude, start.center.longitude, mapZoomRef.current);
        const next = worldPixelToLatLon(pixel.x - gesture.dx, pixel.y - gesture.dy, mapZoomRef.current);
        if (panFrameRef.current != null) cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = requestAnimationFrame(() => {
          setIsFollowing(false);
          setMapCenter(toTrackPoint(next.latitude, next.longitude));
          panFrameRef.current = null;
        });
      }
    },
    onPanResponderRelease: () => {
      panStartRef.current = null;
      pinchStartDistRef.current = null;
    },
    onPanResponderTerminate: () => {
      panStartRef.current = null;
      pinchStartDistRef.current = null;
    },
  }), [interactive, viewport.height, viewport.width]);

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

      {Svg && (Polyline || Circle) && (
        <Svg width={viewport.width} height={viewport.height} style={StyleSheet.absoluteFill}>
          {Polyline && projectedPoints.length >= 2 && (
            <>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="#06100b"
                strokeWidth={8}
                strokeOpacity={0.92}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="#91e6a3"
                strokeWidth={5}
                strokeOpacity={1}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )}
          {Circle && projectedPoints.length >= 1 && (
            <Circle
              cx={projectedPoints[0].x}
              cy={projectedPoints[0].y}
              r={6}
              fill="#07110c"
              stroke="#91e6a3"
              strokeWidth={3}
            />
          )}
          {Circle && projectedCurrent && (
            <Circle
              cx={projectedCurrent.x}
              cy={projectedCurrent.y}
              r={9}
              fill="#91e6a3"
              stroke="#07110c"
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
        </Svg>
      )}

      <View style={styles.topHud} pointerEvents="none">
        <Text style={styles.hudTitle}>SENTINEL MAP</Text>
        <Text style={styles.hudText}>
          {formatCoord(center.latitude, 'N', 'S')}  {formatCoord(center.longitude, 'E', 'W')}
        </Text>
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

          <TouchableOpacity style={styles.compassButton} onPress={() => nudgeMap(0, -128)} accessibilityRole="button" accessibilityLabel="Pan map north">
            <Text style={styles.compassText}>N</Text>
          </TouchableOpacity>
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
    backgroundColor: '#07110c',
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
    backgroundColor: 'rgba(7,17,12,0.18)',
  },
  topHud: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(5,14,9,0.86)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hudTitle: {
    color: '#91e6a3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  hudText: {
    color: '#b9c9b7',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  zoomControls: {
    position: 'absolute',
    top: 74,
    right: 14,
    gap: 8,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(5,14,9,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  mapButtonText: {
    color: '#dfe8da',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(5,14,9,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  followButtonActive: {
    backgroundColor: '#91e6a3',
    borderColor: '#91e6a3',
  },
  compassButton: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(5,14,9,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
});
