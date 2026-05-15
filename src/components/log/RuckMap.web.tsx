import { Colors } from '@/constants/theme';
import type { RouteData } from '@/src/utils/trainingLogUtils';
import polylineDecoder from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

interface RuckMapProps {
  route: RouteData;
  colorScheme: 'light' | 'dark';
}

export default function RuckMap({ route, colorScheme }: RuckMapProps) {
  const theme = Colors[colorScheme ?? 'light'];
  
  // Decode the polyline string to an array of [lat, lng] coordinates
  const positions = route.polyline ? polylineDecoder.decode(route.polyline) : [];

  if (positions.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.mapBackground, borderRadius: 12 }}>
        <span style={{ color: theme.text }}>No route data available</span>
      </div>
    );
  }

  return (
    <MapContainer 
      center={positions[0] as [number, number]} 
      zoom={13} 
      style={{ height: '300px', width: '100%', borderRadius: 12, zIndex: 0 }}
    >
      {/* CARTO tile layers are great because they have free, clean Light and Dark modes */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={colorScheme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
      />
      <Polyline positions={positions as [number, number][]} pathOptions={{ color: theme.mapRoute, weight: 4 }} />
      <Marker position={positions[0] as [number, number]}><Popup>Start</Popup></Marker>
    </MapContainer>
  );
}