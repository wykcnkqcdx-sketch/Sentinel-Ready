import type { TrackPoint } from '@/src/types/map';

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type RegionPoint = {
  latitude: number;
  longitude: number;
};

export function buildRadiusBounds(center: RegionPoint, radiusKm: number): MapBounds {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLon: center.longitude - lonDelta,
    maxLon: center.longitude + lonDelta,
  };
}

export function buildBoundsFromCorners(a: RegionPoint, b: RegionPoint): MapBounds {
  return {
    minLat: Math.min(a.latitude, b.latitude),
    maxLat: Math.max(a.latitude, b.latitude),
    minLon: Math.min(a.longitude, b.longitude),
    maxLon: Math.max(a.longitude, b.longitude),
  };
}

export function getBoundsCenter(bounds: MapBounds): RegionPoint {
  return {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLon + bounds.maxLon) / 2,
  };
}

export function getBoundsOutline(bounds: MapBounds): TrackPoint[] {
  const now = 0;
  return [
    { latitude: bounds.maxLat, longitude: bounds.minLon, altitude: null, accuracy: null, timestamp: now },
    { latitude: bounds.maxLat, longitude: bounds.maxLon, altitude: null, accuracy: null, timestamp: now },
    { latitude: bounds.minLat, longitude: bounds.maxLon, altitude: null, accuracy: null, timestamp: now },
    { latitude: bounds.minLat, longitude: bounds.minLon, altitude: null, accuracy: null, timestamp: now },
    { latitude: bounds.maxLat, longitude: bounds.minLon, altitude: null, accuracy: null, timestamp: now },
  ];
}

function latLonToTileXY(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const tileCount = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * tileCount);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tileCount,
  );
  return { x, y };
}

export function countTilesForBounds(bounds: MapBounds, zoom: number): number {
  const topLeft = latLonToTileXY(bounds.maxLat, bounds.minLon, zoom);
  const bottomRight = latLonToTileXY(bounds.minLat, bounds.maxLon, zoom);
  const tileCount = Math.pow(2, zoom);
  const minX = Math.max(0, topLeft.x);
  const maxX = Math.min(tileCount - 1, bottomRight.x);
  const minY = Math.max(0, topLeft.y);
  const maxY = Math.min(tileCount - 1, bottomRight.y);
  return Math.max(0, maxX - minX + 1) * Math.max(0, maxY - minY + 1);
}

export function estimateTileCountForBounds(bounds: MapBounds, zoomLevels: number[]): number {
  return zoomLevels.reduce((sum, zoom) => sum + countTilesForBounds(bounds, zoom), 0);
}

export function formatBounds(bounds: MapBounds) {
  return `${bounds.minLat.toFixed(4)}, ${bounds.minLon.toFixed(4)} to ${bounds.maxLat.toFixed(4)}, ${bounds.maxLon.toFixed(4)}`;
}
