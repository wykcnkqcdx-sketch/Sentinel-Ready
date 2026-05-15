import { Colors } from '@/constants/theme';
import type { RouteData } from '@/src/utils/trainingLogUtils';
import polylineDecoder from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';

interface RuckMapProps {
  route: RouteData;
  colorScheme: 'light' | 'dark';
}

export default function RuckMap({ route, colorScheme }: RuckMapProps) {
  const theme = Colors[colorScheme ?? 'light'];
  const [RL, setRL] = useState<typeof import('react-leaflet') | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet'),
        import('leaflet')
      ]).then(([reactLeaflet, leaflet]) => {
        if (!isMounted) return;
        const L = leaflet.default || leaflet;
        
        // Fix Leaflet's broken default marker icon issue in Metro/Webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        setRL(reactLeaflet);
      }).catch((err) => console.error("Failed to load map modules", err));
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (!RL) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.mapBackground, borderRadius: 12 }}>
        <span style={{ color: theme.text }}>Loading map...</span>
      </div>
    );
  }

  const { MapContainer, Marker, Polyline, Popup, TileLayer } = RL;
  
  // Decode the polyline string to an array of [lat, lng] coordinates
  let positions: [number, number][] = [];
  try {
    positions = route.polyline ? polylineDecoder.decode(route.polyline) as [number, number][] : [];
  } catch (err) {
    console.error("Failed to decode polyline", err);
  }

  if (positions.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.mapBackground, borderRadius: 12 }}>
        <span style={{ color: theme.text }}>No route data available</span>
      </div>
    );
  }

  return (
    <MapContainer 
      bounds={positions} 
      scrollWheelZoom={false}
      style={{ height: '300px', width: '100%', borderRadius: 12, zIndex: 0 }}
    >
      {/* CARTO tile layers are great because they have free, clean Light and Dark modes */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={colorScheme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
      />
      <Polyline positions={positions} pathOptions={{ color: theme.mapRoute, weight: 4 }} />
      <Marker position={positions[0]}><Popup>Start</Popup></Marker>
      {positions.length > 1 && (
        <Marker position={positions[positions.length - 1]}><Popup>End</Popup></Marker>
      )}
    </MapContainer>
  );
}