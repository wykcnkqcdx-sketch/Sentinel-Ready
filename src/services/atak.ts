import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FTSConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  callsign: string;
  team: string;
};

export type CotObject = {
  uid: string;
  type: string;
  callsign: string;
  lat: number;
  lon: number;
  hae: number;
  speed: number;
  course: number;
  team: string;
  time: string;
  stale: string;
};

export type FTSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONFIG_KEY = 'sentinel_fts_config';

export const DEFAULT_FTS_CONFIG: FTSConfig = {
  host: '',
  port: 19023,
  username: 'user',
  password: '',
  callsign: 'SENTINEL',
  team: 'Cyan',
};

// ── Config storage ────────────────────────────────────────────────────────────

export async function loadFTSConfig(): Promise<FTSConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FTSConfig>;
    if (typeof parsed.host !== 'string') return null;
    return { ...DEFAULT_FTS_CONFIG, ...parsed };
  } catch {
    return null;
  }
}

export async function saveFTSConfig(config: FTSConfig): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function clearFTSConfig(): Promise<void> {
  await AsyncStorage.removeItem(CONFIG_KEY);
}

// ── CoT XML builder ───────────────────────────────────────────────────────────

type CotXmlParams = {
  uid: string;
  callsign: string;
  team: string;
  lat: number;
  lon: number;
  hae?: number;
  speed?: number;
  course?: number;
  notes?: string;
  type?: string;
};

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildCotXml(params: CotXmlParams): string {
  const {
    uid,
    callsign,
    team,
    lat,
    lon,
    hae = 9999999.0,
    speed = 0,
    course = 0,
    notes = '',
    type = 'a-f-G-U-C',
  } = params;

  const now = new Date();
  const stale = new Date(now.getTime() + 300_000);
  const zulu = now.toISOString();
  const staleZulu = stale.toISOString();

  return (
    `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>` +
    `<event version="2.0"` +
    ` uid="${uid}"` +
    ` type="${type}"` +
    ` time="${zulu}"` +
    ` start="${zulu}"` +
    ` stale="${staleZulu}"` +
    ` how="m-g">` +
    `<point lat="${lat}" lon="${lon}" hae="${hae}" ce="10.0" le="10.0"/>` +
    `<detail>` +
    `<contact callsign="${escapeXml(callsign)}" endpoint="*:-1:stcp"/>` +
    `<uid Droid="${escapeXml(callsign)}"/>` +
    `<__group name="${escapeXml(team)}" role="Team Member"/>` +
    `<track speed="${speed}" course="${course}"/>` +
    `<status battery="100"/>` +
    `<remarks>${escapeXml(notes)}</remarks>` +
    `</detail>` +
    `</event>`
  );
}

// ── Auth helper ───────────────────────────────────────────────────────────────

function basicAuth(config: FTSConfig): string {
  return `Basic ${btoa(`${config.username}:${config.password}`)}`;
}

function baseUrl(config: FTSConfig): string {
  return `http://${config.host}:${config.port}`;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Tests connectivity. Returns true if server responds 2xx, false otherwise.
 * Never throws.
 */
export async function pingFTSServer(config: FTSConfig): Promise<boolean> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000),
    );
    const fetchPromise = fetch(
      `${baseUrl(config)}/ManageGeoObject/getSystemUsers`,
      { headers: { Authorization: basicAuth(config) } },
    );
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sends the current position as a CoT event.
 */
export async function sendPositionCoT(
  config: FTSConfig,
  lat: number,
  lon: number,
  alt?: number,
  speed?: number,
  course?: number,
): Promise<void> {
  const uid = `SENTINEL-${config.callsign}-${Date.now()}`;
  const xml = buildCotXml({
    uid,
    callsign: config.callsign,
    team: config.team,
    lat,
    lon,
    hae: alt,
    speed,
    course,
  });

  const res = await fetch(`${baseUrl(config)}/ManageGeoObject/postGeoObject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      Authorization: basicAuth(config),
    },
    body: xml,
  });
  if (!res.ok) throw new Error(`FTS error ${res.status}`);
}

/**
 * Fetches active CoT objects from the server.
 * Returns empty array on any error.
 */
export async function fetchCotObjects(config: FTSConfig): Promise<CotObject[]> {
  try {
    const res = await fetch(
      `${baseUrl(config)}/ManageGeoObject/getGeoObject`,
      { headers: { Authorization: basicAuth(config) } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as unknown[];
    if (!Array.isArray(data)) return [];
    return data.map((item) => mapToCotObject(item));
  } catch {
    return [];
  }
}

function mapToCotObject(item: unknown): CotObject {
  const o = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
  return {
    uid: String(o['uid'] ?? ''),
    type: String(o['type'] ?? 'a-f-G-U-C'),
    callsign: String(o['callsign'] ?? o['Callsign'] ?? ''),
    lat: Number(o['lat'] ?? o['latitude'] ?? 0),
    lon: Number(o['lon'] ?? o['longitude'] ?? 0),
    hae: Number(o['hae'] ?? 0),
    speed: Number(o['speed'] ?? 0),
    course: Number(o['course'] ?? 0),
    team: String(o['team'] ?? o['group'] ?? ''),
    time: String(o['time'] ?? ''),
    stale: String(o['stale'] ?? ''),
  };
}

type RoutePoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number;
};

/**
 * Exports a full ruck session as CoT track points.
 * First point = b-m-p-s-m, last = b-m-p-e-m, middle = a-f-G-U-C.
 * All fetches run in parallel via Promise.allSettled.
 */
export async function exportSessionAsCoT(
  config: FTSConfig,
  routePoints: RoutePoint[],
  notes?: string,
): Promise<{ sent: number; failed: number }> {
  if (routePoints.length === 0) return { sent: 0, failed: 0 };

  function cotTypeForIndex(i: number): string {
    if (i === 0) return 'b-m-p-s-m';
    if (i === routePoints.length - 1) return 'b-m-p-e-m';
    return 'a-f-G-U-C';
  }

  const fetches = routePoints.map((pt, i) => {
    const uid = `SENTINEL-${config.callsign}-${pt.timestamp}-${i}`;
    const xml = buildCotXml({
      uid,
      callsign: config.callsign,
      team: config.team,
      lat: pt.latitude,
      lon: pt.longitude,
      hae: pt.altitude ?? undefined,
      notes: i === 0 ? (notes ?? '') : '',
      type: cotTypeForIndex(i),
    });

    return fetch(`${baseUrl(config)}/ManageGeoObject/postGeoObject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: basicAuth(config),
      },
      body: xml,
    });
  });

  const results = await Promise.allSettled(fetches);

  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.ok) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
