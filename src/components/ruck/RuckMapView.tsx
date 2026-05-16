import React, { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { buildVisibleTiles, getMercatorRoutePoints } from '../../utils/mapTiles';
import type { MapLayerKey, MapViewport } from '../../utils/mapTiles';
import type { TrackPoint } from '../../types/map';

let Svg: React.ComponentType<any> | null = null;
let Polyline: React.ComponentType<any> | null = null;
let Circle: React.ComponentType<any> | null = null;
try {
  const rnSvg = require('react-native-svg');
  Svg = rnSvg.default;
  Polyline = rnSvg.Polyline;
  Circle = rnSvg.Circle;
} catch {
  // react-native-svg not available; route overlay will be skipped
}

const DUBLIN: TrackPoint = { latitude: 53.3498, longitude: -6.2603, altitude: null, accuracy: null, timestamp: 0 };
const MAP_HEIGHT = 300;

export interface RuckMapViewProps {
  routePoints: TrackPoint[];
  currentPosition: TrackPoint | null;
  layer: MapLayerKey;
  zoom?: number;
  fullHeight?: boolean;
}

export function RuckMapView({ routePoints, currentPosition, layer, zoom = 15, fullHeight = false }: RuckMapViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState<MapViewport>({ width: windowWidth, height: MAP_HEIGHT });

  const center: TrackPoint | undefined =
    currentPosition ?? (routePoints.length > 0 ? routePoints[routePoints.length - 1] : DUBLIN);

  const tiles = buildVisibleTiles(center, viewport, layer, zoom);

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
        <Image key={tile.id} source={{ uri: tile.url }} style={tile.style} />
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
