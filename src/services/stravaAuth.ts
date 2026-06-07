import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '';
const STRAVA_TOKEN_PROXY_URL = (process.env.EXPO_PUBLIC_STRAVA_TOKEN_PROXY_URL ?? '').replace(/\/$/, '');
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

type StravaTokenProxyResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  athleteId?: number;
  athleteName?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  athlete?: {
    id?: number;
    firstname?: string;
    lastname?: string;
  };
};

function assertStravaClientReady() {
  if (!STRAVA_CLIENT_ID) {
    throw new Error('Missing EXPO_PUBLIC_STRAVA_CLIENT_ID.');
  }
}

function assertTokenProxyReady() {
  if (!STRAVA_TOKEN_PROXY_URL) {
    throw new Error('Missing EXPO_PUBLIC_STRAVA_TOKEN_PROXY_URL.');
  }
  if (!STRAVA_TOKEN_PROXY_URL.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_STRAVA_TOKEN_PROXY_URL must use HTTPS.');
  }
}

function parseTokenProxyResponse(data: StravaTokenProxyResponse, existing?: StravaTokens): StravaTokens {
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const expiresAt = data.expiresAt ?? data.expires_at;
  const athleteId = data.athleteId ?? data.athlete?.id ?? existing?.athleteId;
  const athleteName =
    data.athleteName ??
    ([data.athlete?.firstname, data.athlete?.lastname].filter(Boolean).join(' ').trim() || existing?.athleteName);

  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresAt !== 'number' ||
    typeof athleteId !== 'number' ||
    typeof athleteName !== 'string'
  ) {
    throw new Error('Strava token proxy returned an invalid response.');
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    athleteId,
    athleteName,
  };
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export async function loadStravaTokens(): Promise<StravaTokens | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as StravaTokens;
    }
    return null;
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
  assertStravaClientReady();

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
    if (!result.url.startsWith(REDIRECT_URI)) return null;
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
  assertTokenProxyReady();

  const res = await fetch(`${STRAVA_TOKEN_PROXY_URL}/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirectUri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token proxy exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return parseTokenProxyResponse(data);
}

// ---------------------------------------------------------------------------
// OAuth — refresh if expiring soon
// ---------------------------------------------------------------------------

export async function refreshStravaTokenIfNeeded(
  tokens: StravaTokens,
): Promise<StravaTokens> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - nowSeconds > REFRESH_BUFFER_SECONDS) return tokens;

  assertTokenProxyReady();

  const res = await fetch(`${STRAVA_TOKEN_PROXY_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: tokens.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token proxy refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return parseTokenProxyResponse(data, tokens);
}
