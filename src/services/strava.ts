import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingLog } from '@/src/screens/TrainingContext';

// ---------------------------------------------------------------------------
// Constants — fill in your Strava API credentials here before testing
// ---------------------------------------------------------------------------
const STRAVA_CLIENT_ID = 'YOUR_STRAVA_CLIENT_ID';
const STRAVA_CLIENT_SECRET = 'YOUR_STRAVA_CLIENT_SECRET';
const REDIRECT_SCHEME = 'sentinel-ready';
const REDIRECT_URI = `${REDIRECT_SCHEME}://strava-auth`;
const STORAGE_KEY = 'sentinel_strava_tokens';
const SCOPE = 'activity:read_all';

// Five-minute refresh buffer (seconds)
const REFRESH_BUFFER_SECONDS = 5 * 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StravaTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  athleteId: number;
  athleteName: string;
};

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string; // ISO8601
  moving_time: number; // seconds
  elapsed_time: number;
  distance: number; // metres
  total_elevation_gain: number; // metres
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  map?: { summary_polyline?: string };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
};

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export async function loadStravaTokens(): Promise<StravaTokens | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StravaTokens;
  } catch {
    return null;
  }
}

export async function saveStravaTokens(tokens: StravaTokens): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export async function clearStravaTokens(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// OAuth — authorise
// ---------------------------------------------------------------------------

export async function authorizeStrava(): Promise<string | null> {
  const url =
    `https://www.strava.com/oauth/mobile/authorize` +
    `?client_id=${STRAVA_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&approval_prompt=auto` +
    `&scope=${SCOPE}`;

  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);

  if (result.type !== 'success') return null;

  try {
    const parsed = new URL(result.url);
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// OAuth — exchange code for tokens
// ---------------------------------------------------------------------------

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`);
  }

  const data = await res.json();

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: data.expires_at as number,
    athleteId: data.athlete.id as number,
    athleteName: `${data.athlete.firstname} ${data.athlete.lastname}`.trim(),
  };
}

// ---------------------------------------------------------------------------
// OAuth — refresh if expiring soon
// ---------------------------------------------------------------------------

export async function refreshStravaTokenIfNeeded(
  tokens: StravaTokens,
): Promise<StravaTokens> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - nowSeconds > REFRESH_BUFFER_SECONDS) return tokens;

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`);
  }

  const data = await res.json();

  return {
    ...tokens,
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: data.expires_at as number,
  };
}

// ---------------------------------------------------------------------------
// API — fetch activities
// ---------------------------------------------------------------------------

export async function fetchStravaActivities(
  tokens: StravaTokens,
  perPage = 30,
): Promise<StravaActivity[]> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
  );

  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status}`);
  }

  return res.json() as Promise<StravaActivity[]>;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapStravaType(type: string): TrainingLog['category'] {
  if (['Run', 'TrailRun', 'VirtualRun'].includes(type)) return 'Run';
  if (['Hike', 'Walk', 'BackpackingTrip'].includes(type)) return 'Hiking';
  if (
    ['WeightTraining', 'Crossfit', 'Workout', 'RockClimbing'].includes(type)
  )
    return type === 'Workout' || type === 'Crossfit' ? 'Resistance' : 'Strength';
  if (['Yoga', 'Pilates', 'Stretching'].includes(type)) return 'Mobility';
  return 'Strength';
}

export function stravaActivityToLog(
  activity: StravaActivity,
): Omit<TrainingLog, 'id'> {
  const mins = Math.round(activity.moving_time / 60);
  const km = (activity.distance / 1000).toFixed(2);
  const elev = Math.round(activity.total_elevation_gain);

  const distanceParts = [`${km} km`];
  if (elev > 10) distanceParts.push(`${elev}m elevation`);
  const distanceLoad = distanceParts.join(' · ');

  const avgHr = activity.average_heartrate;
  const hrPart = avgHr ? ` · avg HR ${Math.round(avgHr)} bpm` : '';
  const elevPart = elev > 0 ? ` · ${elev}m gain` : '';
  const notes = `Strava: ${activity.name}${hrPart}${elevPart}`;

  return {
    date: activity.start_date.slice(0, 10),
    category: mapStravaType(activity.type),
    type: activity.sport_type || activity.type,
    duration: `${mins} minutes`,
    distanceLoad,
    readiness: '',
    notes,
  };
}
