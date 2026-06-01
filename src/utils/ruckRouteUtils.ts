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
  maxLoadKg: number;
  points: TrackPoint[];
  startPoint: { latitude: number; longitude: number };
  recommended?: boolean;
  description?: string;
}

export type PlannedRuckRoute = RuckRoute & {
  checkpointCount: number;
  createdAt: string;
};

function tp(lat: number, lon: number): TrackPoint {
  return { latitude: lat, longitude: lon, altitude: null, accuracy: null, timestamp: 0 };
}

export const MOCK_ROUTES: RuckRoute[] = [
  {
    id: 'route-001',
    name: 'Convent Road — The Barrow',
    difficulty: 'Light',
    distanceKm: 6.7,
    elevationGainMeters: 35,
    estimatedMinutes: 38,
    surface: 'Mixed',
    ruckRisk: 'Low',
    loadSuitability: '10–25 kg',
    maxLoadKg: 25,
    recommended: true,
    description: 'Flat riverside route along the River Barrow. Ideal for first ruck or heavy-load conditioning.',
    startPoint: { latitude: 52.7069, longitude: -6.9416 },
    points: [
      tp(52.7069, -6.9416),
      tp(52.7081, -6.9387),
      tp(52.7098, -6.9354),
      tp(52.7114, -6.9323),
      tp(52.7128, -6.9289),
      tp(52.7119, -6.9261),
      tp(52.7102, -6.9278),
      tp(52.7085, -6.9314),
      tp(52.7069, -6.9416),
    ],
  },
  {
    id: 'route-002',
    name: 'Phoenix Park Loop',
    difficulty: 'Moderate',
    distanceKm: 8.2,
    elevationGainMeters: 65,
    estimatedMinutes: 102,
    surface: 'Paved',
    ruckRisk: 'Low',
    loadSuitability: '10–20 kg',
    maxLoadKg: 20,
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
    id: 'route-003',
    name: 'Killiney Hill Circuit',
    difficulty: 'Steady',
    distanceKm: 5.1,
    elevationGainMeters: 142,
    estimatedMinutes: 65,
    surface: 'Trail',
    ruckRisk: 'Low',
    loadSuitability: '10–18 kg',
    maxLoadKg: 18,
    startPoint: { latitude: 53.2724, longitude: -6.1122 },
    points: [
      tp(53.2724, -6.1122),
      tp(53.2741, -6.1098),
      tp(53.2758, -6.1071),
      tp(53.2769, -6.1044),
      tp(53.2755, -6.1019),
      tp(53.2738, -6.1038),
      tp(53.2722, -6.1065),
      tp(53.2711, -6.1093),
      tp(53.2724, -6.1122),
    ],
  },
  {
    id: 'route-004',
    name: 'Howth Summit Trail',
    difficulty: 'Hard',
    distanceKm: 11.7,
    elevationGainMeters: 348,
    estimatedMinutes: 167,
    surface: 'Trail',
    ruckRisk: 'Medium',
    loadSuitability: '10–15 kg',
    maxLoadKg: 15,
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
    id: 'route-005',
    name: 'Blessington Greenway',
    difficulty: 'Light',
    distanceKm: 12.4,
    elevationGainMeters: 28,
    estimatedMinutes: 124,
    surface: 'Paved',
    ruckRisk: 'Low',
    loadSuitability: '15–30 kg',
    maxLoadKg: 30,
    description: 'Long flat greenway alongside Blessington Lakes. Excellent for distance conditioning with full kit.',
    startPoint: { latitude: 53.1742, longitude: -6.5328 },
    points: [
      tp(53.1742, -6.5328),
      tp(53.1778, -6.5289),
      tp(53.1814, -6.5251),
      tp(53.1849, -6.5212),
      tp(53.1884, -6.5174),
      tp(53.1861, -6.5143),
      tp(53.1825, -6.5181),
      tp(53.1789, -6.5219),
      tp(53.1742, -6.5328),
    ],
  },
  {
    id: 'route-006',
    name: 'Wicklow Military Rd',
    difficulty: 'Epic',
    distanceKm: 18.4,
    elevationGainMeters: 812,
    estimatedMinutes: 294,
    surface: 'Off-road',
    ruckRisk: 'High',
    loadSuitability: '8–12 kg',
    maxLoadKg: 12,
    description: 'High-altitude mountain route. Exposed terrain, technical footing. Experienced only.',
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
const SURFACE_ORDER: RuckSurface[] = ['Paved', 'Gravel', 'Mixed', 'Trail', 'Off-road'];

export function getDifficultyColor(difficulty: RuckDifficulty): string {
  switch (difficulty) {
    case 'Light':    return '#21e371';
    case 'Steady':   return '#21e371';
    case 'Moderate': return '#ffaa44';
    case 'Hard':     return '#ff7744';
    case 'Epic':     return '#e05050';
  }
}

export function getRiskColor(risk: RuckRisk): string {
  switch (risk) {
    case 'Low':     return '#21e371';
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

export function calculateRouteDistanceKm(points: TrackPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const p = 0.017453292519943295; // Math.PI / 180
    const c = Math.cos;
    const haversine =
      0.5 -
      c((next.latitude - prev.latitude) * p) / 2 +
      (c(prev.latitude * p) * c(next.latitude * p) * (1 - c((next.longitude - prev.longitude) * p))) / 2;
    total += 12742 * Math.asin(Math.sqrt(haversine));
  }
  return total;
}

export function estimateRouteMinutes(distanceKm: number, paceMinutesPerKm = 12): number {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round(distanceKm * paceMinutesPerKm));
}

export function toPlannedRuckRoute(route: RuckRoute): PlannedRuckRoute {
  return {
    ...route,
    checkpointCount: Math.max(0, route.points.length - 2),
    createdAt: new Date().toISOString(),
  };
}

export function buildPlannedRouteFromPoints(points: TrackPoint[], name = 'Custom Route'): PlannedRuckRoute {
  const distanceKm = calculateRouteDistanceKm(points);
  const estimatedMinutes = estimateRouteMinutes(distanceKm);
  const startPoint = {
    latitude: points[0]?.latitude ?? 53.3498,
    longitude: points[0]?.longitude ?? -6.2603,
  };
  return {
    id: `planned-${Date.now()}`,
    name,
    difficulty: distanceKm >= 15 ? 'Hard' : distanceKm >= 10 ? 'Moderate' : 'Steady',
    distanceKm,
    elevationGainMeters: 0,
    estimatedMinutes,
    surface: 'Mixed',
    ruckRisk: distanceKm >= 15 ? 'Medium' : 'Low',
    loadSuitability: '10-25 kg',
    maxLoadKg: 25,
    points,
    startPoint,
    description: 'User-planned route built from map checkpoints.',
    checkpointCount: Math.max(0, points.length - 2),
    createdAt: new Date().toISOString(),
  };
}

export function filterRoutes(routes: RuckRoute[], filter: RuckFilter): RuckRoute[] {
  if (filter === 'All Routes') return routes;
  if (filter === 'Distance') return [...routes].sort((a, b) => a.distanceKm - b.distanceKm);
  if (filter === 'Elevation') return [...routes].sort((a, b) => a.elevationGainMeters - b.elevationGainMeters);
  if (filter === 'Load') return [...routes].sort((a, b) => b.maxLoadKg - a.maxLoadKg);
  if (filter === 'Surface') {
    return [...routes].sort(
      (a, b) => SURFACE_ORDER.indexOf(a.surface) - SURFACE_ORDER.indexOf(b.surface),
    );
  }
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
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.surface.toLowerCase().includes(q) ||
      r.difficulty.toLowerCase().includes(q) ||
      r.ruckRisk.toLowerCase().includes(q),
  );
}
