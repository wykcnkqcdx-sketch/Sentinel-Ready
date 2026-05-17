import { Colors } from '@/constants/theme';
import type { RouteData } from '@/src/utils/trainingLogUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import polylineDecoder from '@mapbox/polyline';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';

interface RuckMapProps {
  route: RouteData;
  colorScheme: 'light' | 'dark';
}

export default function RuckMap({ route, colorScheme }: RuckMapProps) {
  const theme = Colors[colorScheme ?? 'light'];
  const mapRef = useRef<MapView>(null);

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

    const animateDraw = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const percentage = Math.min(progress / animationDuration, 1);
      
      setDrawIndex(Math.max(1, Math.floor(percentage * totalPoints)));

      if (progress < animationDuration) {
        animationFrameId = requestAnimationFrame(animateDraw);
      }
    };

    animationFrameId = requestAnimationFrame(animateDraw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [coordinates]);

  const visibleCoordinates = useMemo(() => coordinates.slice(0, drawIndex), [coordinates, drawIndex]);
  const visibleDistanceMarkers = useMemo(() => distanceMarkers.filter(m => m.index < drawIndex), [distanceMarkers, drawIndex]);

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
    <View style={[styles.container, { backgroundColor: theme.mapBackground }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none" // Disables the default Apple/Google basemaps
        initialRegion={{
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={handleRecenter}
      >
        <UrlTile urlTemplate={tileUrl} maximumZ={19} flipY={false} />

        <Polyline
          coordinates={visibleCoordinates}
          strokeColor={theme.mapRoute || '#3B82F6'}
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
            <View style={[styles.kmMarker, { borderColor: theme.mapRoute || '#3B82F6' }]}>
              <Text style={[styles.kmMarkerText, { color: theme.mapRoute || '#3B82F6' }]}>{marker.km}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' },
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
    backgroundColor: '#10B981', // Emerald green
  },
  endMarker: {
    backgroundColor: '#EF4444', // Red
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
});