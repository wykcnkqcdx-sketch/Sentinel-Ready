import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackPoint } from '../types/map';
import * as mapUtils from './mapUtils';
import {
    evaluateRoutePoint,
    limitRoutePoints,
    sanitizeRoutePoints,
    simplifyRoute
} from './routeQuality';

// Mock mapUtils so we can control distance values during threshold tests
vi.mock('./mapUtils', () => ({
  distanceBetween: vi.fn(),
}));

describe('routeQuality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makePoint = (timestamp: number, lat = 0, lon = 0, accuracy = 5): TrackPoint => ({
    timestamp,
    latitude: lat,
    longitude: lon,
    altitude: null,
    accuracy,
  });

  describe('evaluateRoutePoint', () => {
    it('rejects points with poor accuracy (> 35m)', () => {
      const result = evaluateRoutePoint(makePoint(1000), makePoint(2000, 0, 0, 50));
      expect(result).toEqual({ accepted: false, reason: 'poor accuracy' });
    });

    it('accepts the first point (no previous point)', () => {
      const result = evaluateRoutePoint(undefined, makePoint(1000));
      expect(result).toEqual({ accepted: true, distanceKm: 0 });
    });

    it('rejects duplicate timestamps', () => {
      const result = evaluateRoutePoint(makePoint(1000), makePoint(1000));
      expect(result).toEqual({ accepted: false, reason: 'duplicate timestamp' });
    });

    it('rejects gps jitter (movement < 4 meters)', () => {
      vi.mocked(mapUtils.distanceBetween).mockReturnValue(0.003); // 3 meters
      const result = evaluateRoutePoint(makePoint(1000), makePoint(2000));
      expect(result).toEqual({ accepted: false, reason: 'gps jitter' });
    });

    it('rejects speed spikes (> 12 kph)', () => {
      vi.mocked(mapUtils.distanceBetween).mockReturnValue(0.05); // 50m in 1s = 180km/h
      const result = evaluateRoutePoint(makePoint(1000), makePoint(2000));
      expect(result).toEqual({ accepted: false, reason: 'speed spike' });
    });

    it('accepts valid movement', () => {
      vi.mocked(mapUtils.distanceBetween).mockReturnValue(0.01); // 10m in 10s = 3.6km/h
      const result = evaluateRoutePoint(makePoint(1000), makePoint(11000));
      expect(result).toEqual({ accepted: true, distanceKm: 0.01 });
    });
  });

  describe('sanitizeRoutePoints', () => {
    it('filters invalid points, tracks rejections, and accumulates distance', () => {
      vi.mocked(mapUtils.distanceBetween)
        .mockReturnValueOnce(0.01) // Valid
        .mockReturnValueOnce(0.002) // Jitter
        .mockReturnValueOnce(0.01); // Valid

      const points = [
        makePoint(1000),
        makePoint(11000), // accepted
        makePoint(12000), // rejected (jitter)
        makePoint(22000), // accepted
      ];

      const result = sanitizeRoutePoints(points);
      expect(result.routePoints).toHaveLength(3);
      expect(result.rejectedPointCount).toBe(1);
      expect(result.currentDistance).toBe(0.02);
      expect(result.lastRejectedReason).toBe('gps jitter');
    });
  });

  describe('limitRoutePoints', () => {
    it('returns the original array if length <= maxPoints', () => {
      const points = [makePoint(1), makePoint(2), makePoint(3)];
      expect(limitRoutePoints(points, 5)).toEqual(points);
    });

    it('subsamples points correctly when exceeding maxPoints', () => {
      const points = Array.from({ length: 11 }, (_, i) => makePoint(i * 1000));
      const limited = limitRoutePoints(points, 3);
      expect(limited).toHaveLength(3);
      expect(limited[0].timestamp).toBe(0);
      expect(limited[2].timestamp).toBe(10000); // Ensures the last point is retained
    });
  });

  describe('simplifyRoute', () => {
    it('simplifies collinear points based on tolerance', () => {
      const points = [
        makePoint(1000, 0, 0),
        makePoint(2000, 0, 1),
        makePoint(3000, 0, 2),
      ];
      const simplified = simplifyRoute(points, 10);
      expect(simplified).toEqual([points[0], points[2]]);
    });
  });
});