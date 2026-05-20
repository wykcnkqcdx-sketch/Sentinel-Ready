import { describe, expect, it } from 'vitest';
import {
  filterRoutes,
  formatEstimatedTime,
  formatRouteDistance,
  formatRouteElevation,
  getDifficultyColor,
  getRiskColor,
  MOCK_ROUTES,
  searchRoutes,
} from './ruckRouteUtils';

describe('formatRouteDistance', () => {
  it('formats km with one decimal', () => {
    expect(formatRouteDistance(8.2)).toBe('8.2 km');
    expect(formatRouteDistance(11.7)).toBe('11.7 km');
  });
});

describe('formatRouteElevation', () => {
  it('formats elevation with + prefix', () => {
    expect(formatRouteElevation(65)).toBe('+65 m');
    expect(formatRouteElevation(812)).toBe('+812 m');
  });
});

describe('formatEstimatedTime', () => {
  it('formats minutes only', () => {
    expect(formatEstimatedTime(45)).toBe('45m');
  });
  it('formats hours only', () => {
    expect(formatEstimatedTime(120)).toBe('2h');
  });
  it('formats hours and minutes', () => {
    expect(formatEstimatedTime(102)).toBe('1h 42m');
    expect(formatEstimatedTime(167)).toBe('2h 47m');
  });
});

describe('getDifficultyColor', () => {
  it('returns green for easy difficulties', () => {
    expect(getDifficultyColor('Light')).toBe('#91e6a3');
    expect(getDifficultyColor('Steady')).toBe('#91e6a3');
  });
  it('returns amber for Moderate', () => {
    expect(getDifficultyColor('Moderate')).toBe('#ffaa44');
  });
  it('returns red for Epic', () => {
    expect(getDifficultyColor('Epic')).toBe('#e05050');
  });
});

describe('getRiskColor', () => {
  it('returns green for Low', () => {
    expect(getRiskColor('Low')).toBe('#91e6a3');
  });
  it('returns amber for Medium', () => {
    expect(getRiskColor('Medium')).toBe('#ffaa44');
  });
  it('returns red variants for High/Extreme', () => {
    expect(getRiskColor('High')).toBe('#ff7744');
    expect(getRiskColor('Extreme')).toBe('#e05050');
  });
});

describe('filterRoutes', () => {
  it('returns all routes for All Routes filter', () => {
    expect(filterRoutes(MOCK_ROUTES, 'All Routes')).toHaveLength(MOCK_ROUTES.length);
  });
  it('does not mutate original array', () => {
    const original = [...MOCK_ROUTES];
    filterRoutes(MOCK_ROUTES, 'Distance');
    expect(MOCK_ROUTES[0].id).toBe(original[0].id);
  });
  it('sorts by distance ascending', () => {
    const result = filterRoutes(MOCK_ROUTES, 'Distance');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distanceKm).toBeGreaterThanOrEqual(result[i - 1].distanceKm);
    }
  });
  it('sorts by elevation ascending', () => {
    const result = filterRoutes(MOCK_ROUTES, 'Elevation');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].elevationGainMeters).toBeGreaterThanOrEqual(result[i - 1].elevationGainMeters);
    }
  });
  it('sorts by difficulty order', () => {
    const result = filterRoutes(MOCK_ROUTES, 'Difficulty');
    expect(result[0].difficulty).toBe('Moderate');
    expect(result[result.length - 1].difficulty).toBe('Epic');
  });
  it('sorts by risk order', () => {
    const result = filterRoutes(MOCK_ROUTES, 'Risk');
    expect(result[0].ruckRisk).toBe('Low');
  });
});

describe('searchRoutes', () => {
  it('returns all routes for empty query', () => {
    expect(searchRoutes(MOCK_ROUTES, '')).toHaveLength(MOCK_ROUTES.length);
  });
  it('finds routes by name (case-insensitive)', () => {
    const result = searchRoutes(MOCK_ROUTES, 'phoenix');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('route-001');
  });
  it('finds routes by surface', () => {
    const result = searchRoutes(MOCK_ROUTES, 'trail');
    expect(result.some((r) => r.id === 'route-002')).toBe(true);
  });
  it('returns empty for no match', () => {
    expect(searchRoutes(MOCK_ROUTES, 'zzznomatch')).toHaveLength(0);
  });
  it('trims whitespace from query', () => {
    expect(searchRoutes(MOCK_ROUTES, '  ')).toHaveLength(MOCK_ROUTES.length);
  });
});
