import { describe, expect, it } from 'vitest';
import { buildSafetyAlerts, formatElapsed, formatPace } from './ruckSafetyUtils';

describe('formatElapsed', () => {
  it('formats zero as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats seconds under 1 hour as MM:SS', () => {
    expect(formatElapsed(65)).toBe('01:05');
    expect(formatElapsed(3599)).toBe('59:59');
  });

  it('formats exactly 1 hour as 1:00:00', () => {
    expect(formatElapsed(3600)).toBe('1:00:00');
  });

  it('formats seconds over 1 hour as H:MM:SS', () => {
    expect(formatElapsed(3661)).toBe('1:01:01');
    expect(formatElapsed(7384)).toBe('2:03:04');
  });
});

describe('formatPace', () => {
  it('returns placeholder when distance is zero', () => {
    expect(formatPace(0, 600)).toBe('--:-- /km');
  });

  it('returns placeholder when distance is below threshold', () => {
    expect(formatPace(0.005, 600)).toBe('--:-- /km');
  });

  it('formats 600s over 1 km as 10:00 /km', () => {
    expect(formatPace(1, 600)).toBe('10:00 /km');
  });

  it('formats 360s over 1 km as 6:00 /km', () => {
    expect(formatPace(1, 360)).toBe('6:00 /km');
  });

  it('formats 750s over 5 km as 2:30 /km', () => {
    expect(formatPace(5, 750)).toBe('2:30 /km');
  });
});

describe('buildSafetyAlerts', () => {
  const base = {
    gpsQualityWarning: null,
    loadKg: undefined,
    distanceKm: 0,
    elapsedSeconds: 0,
    targetDistanceKm: 0,
    targetMinutes: 0,
  };

  it('returns empty array when nothing flagged', () => {
    expect(buildSafetyAlerts(base)).toEqual([]);
  });

  describe('GPS degraded', () => {
    it('raises RED gps_degraded when gpsQualityWarning is set', () => {
      const alerts = buildSafetyAlerts({ ...base, gpsQualityWarning: 'Accuracy too low' });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('gps_degraded');
      expect(alerts[0].level).toBe('red');
      expect(alerts[0].detail).toBe('Accuracy too low');
    });
  });

  describe('Heavy load', () => {
    it('raises no load alert below 35 kg', () => {
      const alerts = buildSafetyAlerts({ ...base, loadKg: 34.9 });
      expect(alerts.find((a) => a.id === 'heavy_load')).toBeUndefined();
    });

    it('raises AMBER heavy_load at 35 kg', () => {
      const alerts = buildSafetyAlerts({ ...base, loadKg: 35 });
      const a = alerts.find((a) => a.id === 'heavy_load');
      expect(a?.level).toBe('amber');
      expect(a?.title).toBe('HEAVY LOAD');
    });

    it('raises RED heavy_load at 50 kg', () => {
      const alerts = buildSafetyAlerts({ ...base, loadKg: 50 });
      const a = alerts.find((a) => a.id === 'heavy_load');
      expect(a?.level).toBe('red');
      expect(a?.title).toBe('EXTREME LOAD');
    });

    it('raises no load alert when loadKg is undefined', () => {
      const alerts = buildSafetyAlerts({ ...base, loadKg: undefined });
      expect(alerts.find((a) => a.id === 'heavy_load')).toBeUndefined();
    });
  });

  describe('Pace faster than target', () => {
    it('raises AMBER pace_fast when pace is >15% faster than target', () => {
      // target: 10km in 100min = 10 min/km. Pace threshold = 8.5 min/km.
      // 1km in 480s = 8 min/km → should fire
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 1,
        elapsedSeconds: 480,
        targetDistanceKm: 10,
        targetMinutes: 100,
      });
      const a = alerts.find((a) => a.id === 'pace_fast');
      expect(a).toBeDefined();
      expect(a?.level).toBe('amber');
    });

    it('does not raise pace_fast when pace is within target range', () => {
      // target 10 min/km, actual 9.5 min/km (within 15% margin)
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 1,
        elapsedSeconds: 570,
        targetDistanceKm: 10,
        targetMinutes: 100,
      });
      expect(alerts.find((a) => a.id === 'pace_fast')).toBeUndefined();
    });

    it('does not raise pace_fast when no mission is set', () => {
      const alerts = buildSafetyAlerts({ ...base, distanceKm: 1, elapsedSeconds: 300 });
      expect(alerts.find((a) => a.id === 'pace_fast')).toBeUndefined();
    });
  });

  describe('Projected overtime', () => {
    it('raises AMBER projected_overtime when pace projects >10% over target time', () => {
      // target: 10km in 60min. Pace: 1km in 720s = 12min/km → projected 120min
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 1,
        elapsedSeconds: 720,
        targetDistanceKm: 10,
        targetMinutes: 60,
      });
      expect(alerts.find((a) => a.id === 'projected_overtime')).toBeDefined();
    });

    it('does not raise projected_overtime when on track', () => {
      // target: 10km in 60min = 6 min/km. Pace: 1km in 360s = 6 min/km → exactly on track
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 1,
        elapsedSeconds: 360,
        targetDistanceKm: 10,
        targetMinutes: 60,
      });
      expect(alerts.find((a) => a.id === 'projected_overtime')).toBeUndefined();
    });
  });

  describe('Distance exceeded', () => {
    it('raises AMBER distance_exceeded just over target (2–10% over)', () => {
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 10.25,
        elapsedSeconds: 3600,
        targetDistanceKm: 10,
        targetMinutes: 60,
      });
      const a = alerts.find((a) => a.id === 'distance_exceeded');
      expect(a).toBeDefined();
      expect(a?.level).toBe('amber');
      expect(a?.title).toBe('APPROACHING LIMIT');
    });

    it('raises RED distance_exceeded when >10% over target', () => {
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 11.1,
        elapsedSeconds: 3600,
        targetDistanceKm: 10,
        targetMinutes: 60,
      });
      const a = alerts.find((a) => a.id === 'distance_exceeded');
      expect(a?.level).toBe('red');
      expect(a?.title).toBe('DISTANCE EXCEEDED');
    });

    it('raises no distance alert when within target', () => {
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 9.9,
        elapsedSeconds: 3600,
        targetDistanceKm: 10,
        targetMinutes: 60,
      });
      expect(alerts.find((a) => a.id === 'distance_exceeded')).toBeUndefined();
    });
  });

  describe('Within plan', () => {
    it('raises GREEN within_plan when mission set and on track', () => {
      // target: 10km in 100min = 10 min/km. Actual: 1km in 600s = 10 min/km.
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 1,
        elapsedSeconds: 600,
        targetDistanceKm: 10,
        targetMinutes: 100,
      });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('within_plan');
      expect(alerts[0].level).toBe('green');
    });

    it('does not raise within_plan when no mission set', () => {
      const alerts = buildSafetyAlerts({ ...base, distanceKm: 1, elapsedSeconds: 600 });
      expect(alerts.find((a) => a.id === 'within_plan')).toBeUndefined();
    });

    it('does not raise within_plan when distance not yet started', () => {
      const alerts = buildSafetyAlerts({
        ...base,
        distanceKm: 0,
        elapsedSeconds: 0,
        targetDistanceKm: 10,
        targetMinutes: 100,
      });
      expect(alerts.find((a) => a.id === 'within_plan')).toBeUndefined();
    });

    it('does not raise within_plan when other alerts are active', () => {
      const alerts = buildSafetyAlerts({
        ...base,
        gpsQualityWarning: 'weak signal',
        distanceKm: 1,
        elapsedSeconds: 600,
        targetDistanceKm: 10,
        targetMinutes: 100,
      });
      expect(alerts.find((a) => a.id === 'within_plan')).toBeUndefined();
    });
  });

  describe('Multiple alerts', () => {
    it('can raise GPS and load alerts simultaneously', () => {
      const alerts = buildSafetyAlerts({ ...base, gpsQualityWarning: 'weak', loadKg: 50 });
      expect(alerts.map((a) => a.id)).toContain('gps_degraded');
      expect(alerts.map((a) => a.id)).toContain('heavy_load');
    });
  });
});
