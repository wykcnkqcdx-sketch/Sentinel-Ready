import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildCotXml,
  loadFTSConfig,
  saveFTSConfig,
  clearFTSConfig,
  pingFTSServer,
  sendPositionCoT,
  fetchCotObjects,
  exportSessionAsCoT,
} from './atak';
import type { FTSConfig } from './atak';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

const CONFIG: FTSConfig = {
  host: '192.168.1.1',
  port: 8089,
  username: 'user',
  password: 'pass',
  callsign: 'SENTINEL',
  team: 'Cyan',
};

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('buildCotXml', () => {
  it('includes required XML elements', () => {
    const xml = buildCotXml({ uid: 'test-uid', callsign: 'ALPHA', team: 'Blue', lat: 51.5, lon: -0.1 });
    expect(xml).toContain('<?xml version=');
    expect(xml).toContain('<event ');
    expect(xml).toContain('uid="test-uid"');
    expect(xml).toContain('lat="51.5"');
    expect(xml).toContain('lon="-0.1"');
    expect(xml).toContain('callsign="ALPHA"');
  });

  it('escapes & in callsign', () => {
    const xml = buildCotXml({ uid: 'x', callsign: 'A&B', team: 'Cyan', lat: 0, lon: 0 });
    expect(xml).toContain('callsign="A&amp;B"');
    expect(xml).not.toContain('callsign="A&B"');
  });

  it('escapes < in team name', () => {
    const xml = buildCotXml({ uid: 'x', callsign: 'X', team: 'C<D', lat: 0, lon: 0 });
    expect(xml).toContain('name="C&lt;D"');
  });

  it('uses default type a-f-G-U-C when not specified', () => {
    const xml = buildCotXml({ uid: 'x', callsign: 'X', team: 'Y', lat: 0, lon: 0 });
    expect(xml).toContain('type="a-f-G-U-C"');
  });

  it('uses provided type override', () => {
    const xml = buildCotXml({ uid: 'x', callsign: 'X', team: 'Y', lat: 0, lon: 0, type: 'b-m-p-s-m' });
    expect(xml).toContain('type="b-m-p-s-m"');
  });

  it('includes notes in remarks', () => {
    const xml = buildCotXml({ uid: 'x', callsign: 'X', team: 'Y', lat: 0, lon: 0, notes: 'Start point' });
    expect(xml).toContain('<remarks>Start point</remarks>');
  });

  it('stale time is 5 minutes after event time', () => {
    const xml = buildCotXml({ uid: 'x', callsign: 'X', team: 'Y', lat: 0, lon: 0 });
    const timeMatch = xml.match(/time="(.+?)"/);
    const staleMatch = xml.match(/stale="(.+?)"/);
    expect(timeMatch).not.toBeNull();
    expect(staleMatch).not.toBeNull();
    const diff = new Date(staleMatch![1]).getTime() - new Date(timeMatch![1]).getTime();
    expect(diff).toBe(300_000);
  });
});

describe('loadFTSConfig', () => {
  it('returns null when nothing stored', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    expect(await loadFTSConfig()).toBeNull();
  });

  it('returns null when stored JSON has no host', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('{"port":8089}');
    expect(await loadFTSConfig()).toBeNull();
  });

  it('returns merged config when valid JSON stored', async () => {
    const stored = JSON.stringify({ host: '10.0.0.1', port: 8089, username: 'u', password: 'p', callsign: 'X', team: 'Red' });
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(stored);
    const cfg = await loadFTSConfig();
    expect(cfg?.host).toBe('10.0.0.1');
    expect(cfg?.callsign).toBe('X');
  });

  it('returns null on storage error', async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('disk error'));
    expect(await loadFTSConfig()).toBeNull();
  });
});

describe('saveFTSConfig', () => {
  it('stores serialized config at the correct key', async () => {
    await saveFTSConfig(CONFIG);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('sentinel_fts_config', JSON.stringify(CONFIG));
  });
});

describe('clearFTSConfig', () => {
  it('removes the config key', async () => {
    await clearFTSConfig();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sentinel_fts_config');
  });
});

describe('pingFTSServer', () => {
  it('returns true when server responds ok', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    expect(await pingFTSServer(CONFIG)).toBe(true);
  });

  it('returns false when server responds not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    expect(await pingFTSServer(CONFIG)).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    expect(await pingFTSServer(CONFIG)).toBe(false);
  });

  it('calls the correct endpoint', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await pingFTSServer(CONFIG);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://192.168.1.1:8089/ManageGeoObject/getSystemUsers',
      expect.any(Object),
    );
  });
});

describe('sendPositionCoT', () => {
  it('resolves when server returns ok', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await expect(sendPositionCoT(CONFIG, 51.5, -0.1)).resolves.toBeUndefined();
  });

  it('throws when server returns non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    await expect(sendPositionCoT(CONFIG, 51.5, -0.1)).rejects.toThrow('FTS error 403');
  });

  it('sends a POST with XML content-type', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await sendPositionCoT(CONFIG, 51.5, -0.1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ManageGeoObject/postGeoObject'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/xml' }),
      }),
    );
  });

  it('includes CoT XML in request body', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await sendPositionCoT(CONFIG, 51.5, -0.1);
    const body = mockFetch.mock.calls[0][1].body as string;
    expect(body).toContain('<event ');
    expect(body).toContain('lat="51.5"');
  });
});

describe('fetchCotObjects', () => {
  it('returns empty array when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    expect(await fetchCotObjects(CONFIG)).toEqual([]);
  });

  it('returns empty array when response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    expect(await fetchCotObjects(CONFIG)).toEqual([]);
  });

  it('returns empty array when response body is not an array', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ uid: 'x' }) });
    expect(await fetchCotObjects(CONFIG)).toEqual([]);
  });

  it('maps response array to CotObject list', async () => {
    const raw = [{ uid: 'u1', callsign: 'BRAVO', lat: 1.0, lon: 2.0, team: 'Blue' }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => raw });
    const result = await fetchCotObjects(CONFIG);
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('u1');
    expect(result[0].callsign).toBe('BRAVO');
    expect(result[0].lat).toBe(1.0);
  });

  it('defaults missing fields to safe values', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [{}] });
    const result = await fetchCotObjects(CONFIG);
    expect(result[0].uid).toBe('');
    expect(result[0].lat).toBe(0);
    expect(result[0].type).toBe('a-f-G-U-C');
  });
});

describe('exportSessionAsCoT', () => {
  const points = [
    { latitude: 51.0, longitude: -0.1, altitude: 10, timestamp: 1000 },
    { latitude: 51.1, longitude: -0.2, altitude: 15, timestamp: 2000 },
    { latitude: 51.2, longitude: -0.3, altitude: 20, timestamp: 3000 },
  ];

  it('returns {sent:0, failed:0} for empty route', async () => {
    expect(await exportSessionAsCoT(CONFIG, [])).toEqual({ sent: 0, failed: 0 });
  });

  it('counts all points as sent when all fetches succeed', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const result = await exportSessionAsCoT(CONFIG, points);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
  });

  it('counts all points as failed when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('network'));
    const result = await exportSessionAsCoT(CONFIG, points);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(3);
  });

  it('counts partial failures correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const result = await exportSessionAsCoT(CONFIG, points);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('uses b-m-p-s-m for first point and b-m-p-e-m for last point', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await exportSessionAsCoT(CONFIG, points);
    const bodies = mockFetch.mock.calls.map((call) => call[1].body as string);
    expect(bodies[0]).toContain('type="b-m-p-s-m"');
    expect(bodies[2]).toContain('type="b-m-p-e-m"');
    expect(bodies[1]).toContain('type="a-f-G-U-C"');
  });

  it('sends notes only on the first point', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await exportSessionAsCoT(CONFIG, points, 'Session note');
    const bodies = mockFetch.mock.calls.map((call) => call[1].body as string);
    expect(bodies[0]).toContain('Session note');
    expect(bodies[1]).not.toContain('Session note');
  });
});
