import type { TrackPoint } from '../types/map';

export type RuckDifficulty = 'Light' | 'Steady' | 'Moderate' | 'Hard' | 'Epic';
export type RuckSurface = 'Paved' | 'Gravel' | 'Trail' | 'Off-road' | 'Mixed';
export type RuckRisk = 'Low' | 'Medium' | 'High' | 'Extreme';

export type RuckFilter =
  | 'All Routes'
  | 'Distance'
  | 'Load'
  | 'Elevation'
  | 'Surface'
  | 'Difficulty'
  | 'Risk';

export const ROUTE_FILTERS: RuckFilter[] = [
  'All Routes', 'Distance', 'Load', 'Elevation', 'Surface', 'Difficulty', 'Risk',
];

export interface RuckRoute {
  id: string;
  name: string;
  difficulty: RuckDifficulty;
  distanceKm: number;
  elevationGainMeters: number;
  estimatedMinutes: number;
  surface: RuckSurface;
  ruckRisk: RuckRisk;
  loadSuitability: string;
  points: TrackPoint[];
  startPoint: { latitude: number; longitude: number };
}

function tp(lat: number, lon: number): TrackPoint {
  return { latitude: lat, longitude: lon, altitude: null, accuracy: null, timestamp: 0 };
}

export const MOCK_ROUTES: RuckRoute[] = [
  {
    id: 'route-001',
    name: 'Phoenix Park Loop',
    difficulty: 'Moderate',
    distanceKm: 8.2,
    elevationGainMeters: 65,
    estimatedMinutes: 102,
    surface: 'Paved',
    ruckRisk: 'Low',
    loadSuitability: '10–20 kg',
    startPoint: { latitude: 53.3587, longitude: -6.3247 },
    points: [
      tp(53.3587, -6.3247),
      tp(53.3601, -6.3189),
      tp(53.3623, -6.3156),
      tp(53.3651, -6.3178),
      tp(53.3672, -6.3243),
      tp(53.3658, -6.3312),
      tp(53.3628, -6.3341),
      tp(53.3598, -6.3318),
      tp(53.3587, -6.3247),
    ],
  },
  {
    id: 'route-002',
    name: 'Howth Summit Trail',
    difficulty: 'Hard',
    distanceKm: 11.7,
    elevationGainMeters: 348,
    estimatedMinutes: 167,
    surface: 'Trail',
    ruckRisk: 'Medium',
    loadSuitability: '10–15 kg',
    startPoint: { latitude: 53.3863, longitude: -6.0707 },
    points: [
      tp(53.3863, -6.0707),
      tp(53.3891, -6.0658),
      tp(53.3912, -6.0601),
      tp(53.3928, -6.0534),
      tp(53.3901, -6.0478),
      tp(53.3876, -6.0521),
      tp(53.3849, -6.0589),
      tp(53.3831, -6.0645),
      tp(53.3863, -6.0707),
    ],
  },
  {
    id: 'route-003',
    name: 'Wicklow Military Rd',
    difficulty: 'Epic',
    distanceKm: 18.4,
    elevationGainMeters: 812,
    estimatedMinutes: 294,
    surface: 'Off-road',
    ruckRisk: 'High',
    loadSuitability: '8–12 kg',
    startPoint: { latitude: 53.1871, longitude: -6.3258 },
    points: [
      tp(53.1871, -6.3258),
      tp(53.1921, -6.3189),
      tp(53.1978, -6.3124),
      tp(53.2034, -6.3078),
      tp(53.2089, -6.3021),
      tp(53.2134, -6.2967),
      tp(53.2156, -6.2912),
      tp(53.2089, -6.2889),
      tp(53.2034, -6.2934),
      tp(53.1871, -6.3258),
    ],
  },
];

const DIFFICULTY_ORDER: RuckDifficulty[] = ['Light', 'Steady', 'Moderate', 'Hard', 'Epic'];
const RISK_ORDER: RuckRisk[] = ['Low', 'Medium', 'High', 'Extreme'];

export function getDifficultyColor(difficulty: RuckDifficulty): string {
  switch (difficulty) {
    case 'Light':    return '#91e6a3';
    case 'Steady':   return '#91e6a3';
    case 'Moderate': return '#ffaa44';
    case 'Hard':     return '#ff7744';
    case 'Epic':     return '#e05050';
  }
}

export function getRiskColor(risk: RuckRisk): string {
  switch (risk) {
    case 'Low':     return '#91e6a3';
    case 'Medium':  return '#ffaa44';
    case 'High':    return '#ff7744';
    case 'Extreme': return '#e05050';
  }
}

export function formatRouteDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatRouteElevation(meters: number): string {
  return `+${meters} m`;
}

export function formatEstimatedTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function filterRoutes(routes: RuckRoute[], filter: RuckFilter): RuckRoute[] {
  if (filter === 'All Routes') return routes;
  if (filter === 'Distance') return [...routes].sort((a, b) => a.distanceKm - b.distanceKm);
  if (filter === 'Elevation') return [...routes].sort((a, b) => a.elevationGainMeters - b.elevationGainMeters);
  if (filter === 'Difficulty') {
    return [...routes].sort(
      (a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty),
    );
  }
  if (filter === 'Risk') {
    return [...routes].sort(
      (a, b) => RISK_ORDER.indexOf(a.ruckRisk) - RISK_ORDER.indexOf(b.ruckRisk),
    );
  }
  return routes;
}

export function searchRoutes(routes: RuckRoute[], query: string): RuckRoute[] {
  const q = query.toLowerCase().trim();
  if (!q) return routes;
  return routes.filter(
    (r) => r.name.toLowerCase().includes(q) || r.surface.toLowerCase().includes(q),
  );
}
