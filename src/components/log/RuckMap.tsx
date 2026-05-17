import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import polylineDecoder from '@mapbox/polyline';
import { Colors } from '@/constants/theme';
import type { RouteData } from '@/src/utils/trainingLogUtils';

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
        onMapReady={() => {
          // Automatically zoom and pan to fit the entire route
          if (coordinates.length > 1) {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
              animated: true,
            });
          }
        }}
      >
        <UrlTile urlTemplate={tileUrl} maximumZ={19} flipY={false} />

        <Polyline
          coordinates={coordinates}
          strokeColor={theme.mapRoute || '#3B82F6'}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />

        <Marker coordinate={coordinates[0]} title="Start" pinColor="green" />
        
        {coordinates.length > 1 && (
          <Marker coordinate={coordinates[coordinates.length - 1]} title="End" pinColor="red" />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  fallbackContainer: { height: 300, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});