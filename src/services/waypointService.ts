import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MarkType } from '@/src/types/map';

const KEY = 'sentinel_waypoints';

export interface WaypointMarker {
  id: string;
  label: string;
  type: MarkType;
  latitude: number;
  longitude: number;
  timestamp: number;
}

const MARK_COLORS: Record<MarkType, string> = {
  checkpoint: '#B5852C',
  rv:         '#5E7A2F',
  hazard:     '#e05050',
  water:      '#4a9eff',
  medic:      '#ff4444',
  observation:'#ffaa44',
  objective:  '#c07aff',
};

const MARK_SYMBOLS: Record<MarkType, string> = {
  checkpoint: '◆',
  rv:         '⬟',
  hazard:     '⚠',
  water:      '◉',
  medic:      '✚',
  observation:'◎',
  objective:  '★',
};

export function waypointColor(type: MarkType): string {
  return MARK_COLORS[type] ?? '#B5852C';
}

export function waypointSymbol(type: MarkType): string {
  return MARK_SYMBOLS[type] ?? '◆';
}

export async function loadWaypoints(): Promise<WaypointMarker[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaypointMarker[];
  } catch {
    return [];
  }
}

export async function saveWaypoints(waypoints: WaypointMarker[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(waypoints));
}

export async function addWaypoint(waypoint: WaypointMarker): Promise<WaypointMarker[]> {
  const existing = await loadWaypoints();
  const updated = [...existing, waypoint];
  await saveWaypoints(updated);
  return updated;
}

export async function deleteWaypoint(id: string): Promise<WaypointMarker[]> {
  const existing = await loadWaypoints();
  const updated = existing.filter((w) => w.id !== id);
  await saveWaypoints(updated);
  return updated;
}

export async function clearWaypoints(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
