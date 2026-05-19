import { describe, it, expect, vi, beforeEach } from 'vitest';

import { writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildGpxXml, exportSessionGpx } from './gpxExport';
import type { TrainingSession, TrackPoint } from '../types/map';

vi.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  cacheDirectory: '/tmp/cache/',
}));

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

function pt(lat: number, lon: number, alt: number | null = 50, ts = 1_000_000): TrackPoint {
  return { latitude: lat, longitude: lon, altitude: alt, accuracy: null, timestamp: ts };
}

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 'sess-1',
    type: 'Ruck',
    title: 'Test Route',
    score: 80,
    durationMinutes: 60,
    rpe: 6,
    completedAt: '2026-01-15T10:00:00.000Z',
    routePoints: [pt(51.5, -0.1), pt(51.6, -0.2, 55, 2_000_000)],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildGpxXml', () => {
  it('produces a valid GPX header', () => {
    const xml = buildGpxXml(makeSession());
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<gpx version="1.1"');
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
  });

  it('contains trkseg with trkpt elements', () => {
    const xml = buildGpxXml(makeSession());
    expect(xml).toContain('<trkseg>');
    expect(xml).toContain('<trkpt');
  });

  it('includes route name in metadata and trk', () => {
    const xml = buildGpxXml(makeSession({ title: 'Night Ruck' }));
    expect(xml).toContain('<name>Night Ruck</name>');
  });

  it('escapes & in title', () => {
    const xml = buildGpxXml(makeSession({ title: 'Alpha & Bravo' }));
    expect(xml).toContain('Alpha &amp; Bravo');
    expect(xml).not.toContain('Alpha & Bravo');
  });

  it('escapes < and > in title', () => {
    const xml = buildGpxXml(makeSession({ title: 'A<B>C' }));
    expect(xml).toContain('A&lt;B&gt;C');
  });

  it('writes latitude and longitude to 7 decimal places', () => {
    const xml = buildGpxXml(makeSession());
    expect(xml).toContain('lat="51.5000000"');
    expect(xml).toContain('lon="-0.1000000"');
  });

  it('includes elevation when altitude is a number', () => {
    const xml = buildGpxXml(makeSession());
    expect(xml).toContain('<ele>50.0</ele>');
  });

  it('omits elevation when altitude is null', () => {
    const xml = buildGpxXml(makeSession({
      routePoints: [pt(51.5, -0.1, null), pt(51.6, -0.2, null, 2_000_000)],
    }));
    expect(xml).not.toContain('<ele>');
  });

  it('omits elevation when altitude is NaN', () => {
    const xml = buildGpxXml(makeSession({
      routePoints: [{ latitude: 51.5, longitude: -0.1, altitude: NaN as any, accuracy: null, timestamp: 1_000_000 }],
    }));
    expect(xml).not.toContain('<ele>');
  });

  it('uses completedAt date in metadata', () => {
    const xml = buildGpxXml(makeSession({ completedAt: '2026-01-15T10:00:00.000Z' }));
    expect(xml).toContain('<time>2026-01-15T10:00:00.000Z</time>');
  });

  it('falls back to a current timestamp when completedAt is absent', () => {
    const before = Date.now();
    const xml = buildGpxXml(makeSession({ completedAt: undefined }));
    const after = Date.now();
    const match = xml.match(/<time>(.+?)<\/time>/);
    expect(match).not.toBeNull();
    const ts = new Date(match![1]).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('falls back to current timestamp when completedAt is unparseable', () => {
    const xml = buildGpxXml(makeSession({ completedAt: 'not-a-date' }));
    const match = xml.match(/<time>(.+?)<\/time>/);
    expect(match).not.toBeNull();
    expect(isNaN(new Date(match![1]).getTime())).toBe(false);
  });

  it('produces empty trkseg when routePoints is empty', () => {
    const xml = buildGpxXml(makeSession({ routePoints: [] }));
    expect(xml).toContain('<trkseg>');
    expect(xml).not.toContain('<trkpt');
  });

  it('uses fallback title when title is absent', () => {
    const xml = buildGpxXml(makeSession({ title: undefined as any }));
    expect(xml).toContain('Sentinel Route');
  });
});

describe('exportSessionGpx', () => {
  it('throws when routePoints is absent', async () => {
    await expect(exportSessionGpx(makeSession({ routePoints: undefined }))).rejects.toThrow('No route data');
  });

  it('throws when fewer than 2 route points', async () => {
    await expect(
      exportSessionGpx(makeSession({ routePoints: [pt(51.5, -0.1)] })),
    ).rejects.toThrow('No route data');
  });

  it('writes the GPX XML to the cache directory', async () => {
    await exportSessionGpx(makeSession());
    expect(writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/cache/'),
      expect.stringContaining('<gpx'),
      { encoding: 'utf8' },
    );
  });

  it('uses utf8 encoding', async () => {
    await exportSessionGpx(makeSession());
    expect(writeAsStringAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { encoding: 'utf8' },
    );
  });

  it('calls shareAsync with a .gpx file path', async () => {
    await exportSessionGpx(makeSession());
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringMatching(/\.gpx$/),
      expect.objectContaining({ mimeType: 'application/gpx+xml' }),
    );
  });

  it('includes session id in the filename', async () => {
    await exportSessionGpx(makeSession({ id: 'abc123' }));
    expect(writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('abc123'),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('slugifies the title in the filename', async () => {
    await exportSessionGpx(makeSession({ title: 'Night Ruck #1' }));
    expect(writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('night_ruck__1'),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('shareAsync call comes after writeAsStringAsync', async () => {
    const order: string[] = [];
    vi.mocked(writeAsStringAsync).mockImplementation(async () => { order.push('write'); });
    vi.mocked(Sharing.shareAsync).mockImplementation(async () => { order.push('share'); return undefined as any; });
    await exportSessionGpx(makeSession());
    expect(order).toEqual(['write', 'share']);
  });
});
