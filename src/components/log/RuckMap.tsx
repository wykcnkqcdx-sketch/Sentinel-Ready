import { Colors } from '@/constants/theme';
import type { TrackPoint } from '@/src/types/map';
import type { RouteData } from '@/src/utils/trainingLogUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import polylineDecoder from '@mapbox/polyline';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// eslint-disable-next-line import/no-unresolved
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import Svg, { ClipPath, Defs, G, LinearGradient, Polygon, Rect, Stop, Polyline as SvgPolyline } from 'react-native-svg';

function interpolateColor(color1: string, color2: string, factor: number) {
  const hex1 = parseInt(color1.substring(1), 16);
  const hex2 = parseInt(color2.substring(1), 16);
  const r1 = (hex1 >> 16) & 255, g1 = (hex1 >> 8) & 255, b1 = hex1 & 255;
  const r2 = (hex2 >> 16) & 255, g2 = (hex2 >> 8) & 255, b2 = hex2 & 255;
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  return `#${(1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

interface RuckMapProps {
  route: RouteData;
  routePoints?: TrackPoint[];
  colorScheme: 'light' | 'dark';
}

const ELEVATION_GRAPH_HEIGHT = 40;
const ELEVATION_GRAPH_PADDING = 5;
const ELEVATION_USABLE_HEIGHT = ELEVATION_GRAPH_HEIGHT - (ELEVATION_GRAPH_PADDING * 2);
const FALLBACK_ROUTE_COLOR = '#FC4C02';

export default function RuckMap({ route, routePoints, colorScheme }: RuckMapProps) {
  const theme = Colors[colorScheme ?? 'light'];
  const mapRef = useRef<MapView>(null);
  const routeColor = theme.mapRoute || FALLBACK_ROUTE_COLOR;

  // Decode the polyline string into an array of { latitude, longitude } for react-native-maps
  const coordinates = useMemo(() => {
    if (!route.polyline) return [];
    try {
      const decoded = polylineDecoder.decode(route.polyline) as [number, number][];
      return decoded.map(([latitude, longitude]) => ({
        latitude,
        longitude,
      }));
    } catch (err) {
      console.error("Failed to decode polyline", err);
      return [];
    }
  }, [route.polyline]);

  // Calculate cumulative distance to place 1km markers along the route
  const distanceMarkers = useMemo(() => {
    const markers: { coordinate: { latitude: number; longitude: number }; km: number; index: number }[] = [];
    let accumulatedDistance = 0;
    let nextMarkerKm = 1;

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];

      // Haversine formula to calculate distance between two coordinates in km
      const R = 6371;
      const dLat = (curr.latitude - prev.latitude) * (Math.PI / 180);
      const dLon = (curr.longitude - prev.longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(prev.latitude * (Math.PI / 180)) * Math.cos(curr.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const distance = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

      accumulatedDistance += distance;

      if (accumulatedDistance >= nextMarkerKm) {
        markers.push({ coordinate: curr, km: nextMarkerKm, index: i });
        nextMarkerKm++;
      }
    }
    return markers;
  }, [coordinates]);

  // Pre-calculate a gorgeous color gradient from Start (Emerald) to End (Red)
  const routeColors = useMemo(() => {
    const total = coordinates.length;
    if (total === 0) return [];
    return coordinates.map((_, index) =>
      interpolateColor('#35C759', '#FF453A', index / Math.max(1, total - 1))
    );
  }, [coordinates]);

  // Extract and map elevation data for the profile graph
  const { polylinePoints, polygonPoints, minAlt, maxAlt } = useMemo(() => {
    if (!routePoints) return { polylinePoints: '', polygonPoints: '', minAlt: 0, maxAlt: 0 };
    const alts = routePoints.map(p => p.altitude).filter(a => a !== null) as number[];
    if (alts.length < 2) return { polylinePoints: '', polygonPoints: '', minAlt: 0, maxAlt: 0 };
    
    const min = Math.min(...alts);
    const max = Math.max(...alts);
    const range = max - min || 1;
    
    const pts = alts.map((alt, i) => {
      const x = (i / (alts.length - 1)) * 100;
      const y = ELEVATION_GRAPH_HEIGHT - ELEVATION_GRAPH_PADDING - ((alt - min) / range) * ELEVATION_USABLE_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    return {
      polylinePoints: pts.join(' '),
      polygonPoints: `0,${ELEVATION_GRAPH_HEIGHT} ${pts.join(' ')} 100,${ELEVATION_GRAPH_HEIGHT}`,
      minAlt: Math.round(min),
      maxAlt: Math.round(max),
    };
  }, [routePoints]);

  // State to control how many coordinates of the polyline are currently visible
  const [drawIndex, setDrawIndex] = useState(0);

  // Animate the polyline drawing on mount
  useEffect(() => {
    if (coordinates.length <= 1) {
      setDrawIndex(coordinates.length);
      return;
    }

    const totalPoints = coordinates.length;
    const animationDuration = 1500; // 1.5 seconds to draw the full route
    let start: number | null = null;
    let animationFrameId: number;
    let lastDrawnIndex = 0;
    let lastDrawTime = 0;
    // Target ~30fps for Android bridge performance. Decrease to 16 for 60fps.
    const THROTTLE_MS = 32;

    const animateDraw = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const percentage = Math.min(progress / animationDuration, 1);
      
      const nextIndex = Math.max(1, Math.floor(percentage * totalPoints));

      // Only trigger a React re-render if the index changed AND enough time has passed
      if (nextIndex !== lastDrawnIndex && (timestamp - lastDrawTime > THROTTLE_MS || progress >= animationDuration)) {
        lastDrawnIndex = nextIndex;
        lastDrawTime = timestamp;
        setDrawIndex(nextIndex);
      }

      if (progress < animationDuration) {
        animationFrameId = requestAnimationFrame(animateDraw);
      }
    };

    animationFrameId = requestAnimationFrame(animateDraw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [coordinates]);

  const visibleCoordinates = useMemo(() => coordinates.slice(0, drawIndex), [coordinates, drawIndex]);
  const visibleDistanceMarkers = useMemo(() => distanceMarkers.filter(m => m.index < drawIndex), [distanceMarkers, drawIndex]);
  const visibleColors = useMemo(() => routeColors.slice(0, drawIndex), [routeColors, drawIndex]);

  // Convert the current drawing index into a percentage (0 to 100) for the SVG clip path
  const drawPercentage = coordinates.length > 0 ? (drawIndex / coordinates.length) * 100 : 100;

  const handleMarkerPress = useCallback((coordinate: { latitude: number; longitude: number }) => {
    mapRef.current?.animateToRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01, // Defines the zoom level (smaller is closer)
      longitudeDelta: 0.01,
    }, 1000); // 1000ms (1 second) animation duration
  }, []);

  const handleRecenter = useCallback(() => {
    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [coordinates]);

  if (coordinates.length === 0) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: theme.mapBackground }]}>
        <Text style={{ color: theme.text }}>No route data available</Text>
      </View>
    );
  }

  // Using CARTO tiles to match the web implementation's aesthetic exactly
  const tileUrl = colorScheme === 'dark'
    ? 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

  return (
    <View style={styles.container}>
      <View style={[styles.mapFrame, { backgroundColor: theme.mapBackground }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType="none" // Disables the default Apple/Google basemaps
          initialRegion={{
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.012, // Start zoomed in for the "follow" effect
          longitudeDelta: 0.012,
        }}
      >
        <UrlTile urlTemplate={tileUrl} maximumZ={19} flipY={false} />

        <Polyline
          coordinates={visibleCoordinates}
          strokeColor={routeColor} // 👈 Fallback for Android
          strokeColors={visibleColors}              // 👈 Gradient applied on iOS
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />

        {/* 1km Distance Markers */}
        {visibleDistanceMarkers.map((marker) => (
          <Marker
            key={`km-${marker.km}`}
            coordinate={marker.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={1}
            onPress={() => handleMarkerPress(marker.coordinate)}
          >
            <View style={[styles.kmMarker, { borderColor: routeColor }]}>
              <Text style={[styles.kmMarkerText, { color: routeColor }]}>{marker.km}</Text>
            </View>
          </Marker>
        ))}

        <Marker
          coordinate={coordinates[0]}
          title="Start"
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={2}
          onPress={() => handleMarkerPress(coordinates[0])}
        >
          <View style={[styles.customMarker, styles.startMarker]}>
            <MaterialCommunityIcons name="play" size={18} color="white" />
          </View>
        </Marker>
        
        {drawIndex === coordinates.length && coordinates.length > 1 && (
          <Marker
            coordinate={coordinates[coordinates.length - 1]}
            title="End"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={2}
            onPress={() => handleMarkerPress(coordinates[coordinates.length - 1])}
          >
            <View style={[styles.customMarker, styles.endMarker]}>
              <MaterialCommunityIcons name="flag-checkered" size={16} color="white" />
            </View>
          </Marker>
        )}
      </MapView>

      {coordinates.length > 1 && (
        <TouchableOpacity 
          style={[styles.recenterButton, { backgroundColor: theme.mapBackground }]} 
          onPress={handleRecenter}
          accessibilityRole="button"
          accessibilityLabel="Recenter map on route"
        >
          <MaterialCommunityIcons name="fit-to-page-outline" size={24} color={theme.text || '#ffffff'} />
        </TouchableOpacity>
      )}
      </View>

      {/* Elevation Profile Graph */}
      {polygonPoints !== '' && (
        <View style={styles.elevationContainer}>
          <View style={styles.elevationHeader}>
            <Text style={styles.elevationLabel}>ELEVATION</Text>
            <Text style={styles.elevationRange}>{minAlt}m - {maxAlt}m</Text>
          </View>
          <Svg width="100%" height={ELEVATION_GRAPH_HEIGHT} viewBox={`0 0 100 ${ELEVATION_GRAPH_HEIGHT}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={routeColor} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={routeColor} stopOpacity="0.0" />
              </LinearGradient>
              <ClipPath id="revealClip">
                <Rect x="0" y="0" width={drawPercentage} height={ELEVATION_GRAPH_HEIGHT} />
              </ClipPath>
            </Defs>
            <G clipPath="url(#revealClip)">
              <Polygon points={polygonPoints} fill="url(#eleGrad)" />
              <SvgPolyline points={polylinePoints} fill="none" stroke={routeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </G>
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 10 },
  mapFrame: { height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  fallbackContainer: { height: 300, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  customMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  startMarker: {
    backgroundColor: '#35C759', // Emerald green
  },
  endMarker: {
    backgroundColor: '#FF453A', // Red
  },
  kmMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    elevation: 3,
  },
  kmMarkerText: {
    fontSize: 10,
    fontWeight: '900',
  },
  recenterButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  elevationContainer: { width: '100%', paddingHorizontal: 4, gap: 4 },
  elevationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  elevationLabel: { color: '#8fbf8f', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  elevationRange: { color: '#aeb8aa', fontSize: 11, fontWeight: '800' },
});