import type { StravaTokens } from './stravaAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
