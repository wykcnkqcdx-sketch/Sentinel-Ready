import React, { useEffect, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { buildVisibleTiles, getMercatorRoutePoints } from '../../utils/mapTiles';
import type { MapLayerKey, MapTile, MapViewport } from '../../utils/mapTiles';
import type { TrackPoint } from '../../types/map';
import type { MapOverlay } from '../../utils/fieldMapping';
import { getResolvedTileUri } from '../../services/tileCache';

let Svg: React.ComponentType<any> | null = null;
let Polyline: React.ComponentType<any> | null = null;
let Circle: React.ComponentType<any> | null = null;
let Polygon: React.ComponentType<any> | null = null;
try {
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
}

export function RuckMapView({ routePoints, currentPosition, layer, zoom = 15, overlays, fullHeight = false }: RuckMapViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState<MapViewport>({ width: windowWidth, height: MAP_HEIGHT });

  const center: TrackPoint | undefined =
    currentPosition ?? (routePoints.length > 0 ? routePoints[routePoints.length - 1] : DUBLIN);

  const tiles = buildVisibleTiles(center, viewport, layer, zoom);
  const uriMap = useResolvedTileUris(tiles);

  const projectedPoints = Svg && Polyline && routePoints.length >= 2
    ? getMercatorRoutePoints(routePoints, center, viewport, zoom)
    : [];

  const projectedCurrent = Svg && Circle && currentPosition
    ? getMercatorRoutePoints([currentPosition], center, viewport, zoom)[0]
    : null;

  const polylinePoints = projectedPoints.map((p) => `${p.x},${p.y}`).join(' ');

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewport({ width, height });
    }
  }

  return (
    <View style={[styles.container, fullHeight && styles.fullHeight]} onLayout={handleLayout}>
      {tiles.map((tile) => (
        <Image key={tile.id} source={{ uri: uriMap.get(tile.id) ?? tile.url }} style={tile.style} />
      ))}

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
                  center, viewport, zoom
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
                  center, viewport, zoom
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
                    center, viewport, zoom
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

      {!currentPosition && (
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
});
