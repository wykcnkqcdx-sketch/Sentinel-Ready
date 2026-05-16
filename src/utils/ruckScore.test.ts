import { describe, expect, it } from 'vitest';
import { calculateRuckScore } from './ruckScore';

describe('calculateRuckScore', () => {
  it('calculates a high score and recommends progression', () => {
    const result = calculateRuckScore({
      distanceKm: 16,
      loadKg: 25,
      bodyMassKg: 80,
      paceMinPerKm: 11,
      ascentM: 1000,
      terrainFactor: 1.5,
      totalCheckpoints: 5,
      reachedCheckpoints: 5,
    });

    expect(result.score).toBeGreaterThanOrEqual(82);
    expect(result.recommendation).toContain('Repeat once, then progress');
  });

  it('caps the minimum score at 35', () => {
    const result = calculateRuckScore({
      distanceKm: 1,
      loadKg: 0,
      bodyMassKg: 80,
      paceMinPerKm: 30,
      ascentM: 0,
      terrainFactor: 1,
      totalCheckpoints: 10,
      reachedCheckpoints: 0,
    });

    expect(result.score).toBe(35);
    expect(result.recommendation).toContain('Reduce load or distance');
  });

  it('identifies load carriage as the weakest factor', () => {
    const result = calculateRuckScore({
      distanceKm: 16,
      loadKg: 5, // very light load
      bodyMassKg: 80,
      paceMinPerKm: 10,
      ascentM: 500,
      terrainFactor: 1.2,
      totalCheckpoints: 5,
      reachedCheckpoints: 5,
    });

    expect(result.finding).toContain('Load carriage');
  });

  it('identifies pace as the limiting factor', () => {
    const result = calculateRuckScore({
      distanceKm: 10,
      loadKg: 25,
      bodyMassKg: 80,
      paceMinPerKm: 25, // very slow
      ascentM: 100,
      terrainFactor: 1,
    });

    expect(result.finding).toContain('Pace is the limiting factor');
  });

  it('identifies elevation as the weakest part of the profile', () => {
    const result = calculateRuckScore({
      distanceKm: 16,
      loadKg: 25,
      bodyMassKg: 80,
      paceMinPerKm: 12,
      ascentM: 0, // completely flat
      terrainFactor: 1,
    });

    expect(result.finding).toContain('Climbing demand is the weakest part');
  });

  it('identifies execution as the weakest factor when checkpoints are missed', () => {
    const result = calculateRuckScore({
      distanceKm: 16,
      loadKg: 25,
      bodyMassKg: 80,
      paceMinPerKm: 12,
      ascentM: 1000,
      terrainFactor: 1,
      totalCheckpoints: 10,
      reachedCheckpoints: 2, // poor checkpoint discipline
    });

    expect(result.finding).toContain('Route execution needs cleaner checkpoint discipline');
  });
});