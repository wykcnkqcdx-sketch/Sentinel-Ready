import { describe, expect, it } from 'vitest';
import {
  buildBoundsFromCorners,
  buildRadiusBounds,
  estimateTileCountForBounds,
  formatBounds,
  getBoundsCenter,
  getBoundsOutline,
} from './offlineRegionUtils';

describe('offlineRegionUtils', () => {
  it('builds normalized bounds from two corners', () => {
    expect(buildBoundsFromCorners(
      { latitude: 53.4, longitude: -6.1 },
      { latitude: 53.2, longitude: -6.4 },
    )).toEqual({
      minLat: 53.2,
      maxLat: 53.4,
      minLon: -6.4,
      maxLon: -6.1,
    });
  });

  it('returns center and closed outline for bounds', () => {
    const bounds = buildBoundsFromCorners(
      { latitude: 54, longitude: -7 },
      { latitude: 52, longitude: -5 },
    );

    expect(getBoundsCenter(bounds)).toEqual({ latitude: 53, longitude: -6 });
    expect(getBoundsOutline(bounds)).toHaveLength(5);
    expect(getBoundsOutline(bounds)[0]).toEqual(getBoundsOutline(bounds)[4]);
  });

  it('estimates tiles for radius bounds', () => {
    const bounds = buildRadiusBounds({ latitude: 53.3498, longitude: -6.2603 }, 5);
    expect(estimateTileCountForBounds(bounds, [13])).toBeGreaterThan(0);
    expect(formatBounds(bounds)).toContain('to');
  });
});
