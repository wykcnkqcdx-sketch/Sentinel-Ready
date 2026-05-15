import type { TrainingSession, ReadinessLog } from '../types/map';
import { colours } from '../theme/colours';

// ---------------------------------------------------------------------------
// Performance profile (inlined from forge-pwa/lib/performance.ts)
// ---------------------------------------------------------------------------

type ReadinessBand = 'GREEN' | 'AMBER' | 'RED';
type LoadRisk = 'Low' | 'Moderate' | 'High';

type PerformanceProfile = {
  readiness: number;
  readinessBand: ReadinessBand;
  readinessTone: string;
  readinessLabel: string;
  weeklyLoad: number;
  acuteLoad: number;
  chronicLoad: number;
  acuteChronicRatio: number;
  monotony: number;
  strain: number;
  averageRpe: number;
  highIntensityCount: number;
  ruckKm: number;
  ruckLoadKg: number;
  loadRisk: LoadRisk;
  riskTone: string;
  recommendation: string;
  recoveryFocus: string;
};

const dayMs = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sessionDate(session: TrainingSession) {
  const numericId = Number(session.id);
  const fallbackDate = Number.isFinite(numericId) && numericId > 946684800000 ? new Date(numericId) : new Date();
  const parsed = session.completedAt ? new Date(session.completedAt) : fallbackDate;
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function sessionLoad(session: TrainingSession) {
  const loadMultiplier = session.loadKg ? 1 + Math.min(0.35, session.loadKg / 100) : 1;
  return Math.round(session.durationMinutes * session.rpe * loadMultiplier);
}

function sessionsWithinDays(sessions: TrainingSession[], days: number, now = new Date()) {
  const cutoff = now.getTime() - days * dayMs;
  return sessions.filter((session) => sessionDate(session).getTime() >= cutoff);
}

function standardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function estimateRuckKm(session: TrainingSession) {
  if (session.type !== 'Ruck') return 0;
  const titleMatch = session.title.match(/(\d+(?:\.\d+)?)\s*km/i);
  if (titleMatch) return Number(titleMatch[1]);
  return Math.max(0, Math.round((session.durationMinutes / 12) * 10) / 10);
}

function buildPerformanceProfile(sessions: TrainingSession[], now = new Date()): PerformanceProfile {
  const ordered = [...sessions].sort((a, b) => sessionDate(b).getTime() - sessionDate(a).getTime());
  const recent = sessionsWithinDays(ordered, 7, now);
  const chronic = sessionsWithinDays(ordered, 28, now);
  const recentLoads = recent.map(sessionLoad);
  const weeklyLoad = recentLoads.reduce((total, load) => total + load, 0);
  const acuteLoad = Math.round(weeklyLoad / 7);
  const chronicLoad = Math.round(chronic.reduce((total, s) => total + sessionLoad(s), 0) / 28);
  const acuteChronicRatio = chronicLoad > 0 ? Math.round((acuteLoad / chronicLoad) * 100) / 100 : acuteLoad > 0 ? 1.5 : 0;
  const averageRpe = recent.length ? recent.reduce((total, s) => total + s.rpe, 0) / recent.length : 0;
  const highIntensityCount = recent.filter((s) => s.rpe >= 8).length;
  const dailyLoads = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index).getTime();
    const dayEnd = dayStart + dayMs;
    return recent
      .filter((s) => { const t = sessionDate(s).getTime(); return t >= dayStart && t < dayEnd; })
      .reduce((total, s) => total + sessionLoad(s), 0);
  });
  const dailyMean = dailyLoads.reduce((total, load) => total + load, 0) / 7;
  const dailySd = standardDeviation(dailyLoads);
  const monotony = dailySd > 0 ? Math.round((dailyMean / dailySd) * 10) / 10 : weeklyLoad > 0 ? 2.5 : 0;
  const strain = Math.round(weeklyLoad * monotony);
  const ruckSessions = recent.filter((s) => s.type === 'Ruck');
  const ruckKm = Math.round(ruckSessions.reduce((total, s) => total + estimateRuckKm(s), 0) * 10) / 10;
  const ruckLoadKg = ruckSessions.length
    ? Math.round(ruckSessions.reduce((total, s) => total + (s.loadKg ?? 0), 0) / ruckSessions.length)
    : 0;

  const loadPenalty = clamp((acuteChronicRatio - 1.25) * 28, 0, 18);
  const rpePenalty = clamp((averageRpe - 6.5) * 7, 0, 18);
  const intensityPenalty = highIntensityCount * 4;
  const monotonyPenalty = monotony > 2 ? clamp((monotony - 2) * 7, 0, 12) : 0;
  const readiness = Math.round(clamp(88 - loadPenalty - rpePenalty - intensityPenalty - monotonyPenalty + Math.min(6, recent.length), 35, 96));
  const readinessBand: ReadinessBand = readiness >= 80 ? 'GREEN' : readiness >= 62 ? 'AMBER' : 'RED';
  const readinessTone = readinessBand === 'GREEN' ? colours.pass : readinessBand === 'AMBER' ? colours.amber : colours.fail;
  const readinessLabel = readinessBand === 'GREEN' ? 'Train as planned' : readinessBand === 'AMBER' ? 'Control intensity' : 'Recovery priority';
  const loadRisk: LoadRisk = acuteChronicRatio >= 1.45 || highIntensityCount >= 3 || strain >= 2200
    ? 'High'
    : acuteChronicRatio >= 1.2 || averageRpe >= 7 || strain >= 1200
      ? 'Moderate'
      : 'Low';
  const riskTone = loadRisk === 'High' ? colours.fail : loadRisk === 'Moderate' ? colours.amber : colours.pass;
  const recommendation = loadRisk === 'High'
    ? 'Reduce impact and heavy loading for 24-48 hours; use mobility, Zone 2, and tissue care before another hard block.'
    : loadRisk === 'Moderate'
      ? 'Hold the plan but cap RPE at 7, extend warm-up, and monitor sleep, soreness, hydration, and resting heart rate.'
      : 'Progress normally; this is a good window for quality strength, ruck technique, or controlled aerobic volume.';
  const recoveryFocus = readinessBand === 'RED'
    ? 'Sleep, hydration, low-impact movement'
    : readinessBand === 'AMBER'
      ? 'Fuel around training and avoid extra volume'
      : 'Maintain routine and execute the assigned session';

  return {
    readiness, readinessBand, readinessTone, readinessLabel,
    weeklyLoad, acuteLoad, chronicLoad, acuteChronicRatio,
    monotony, strain, averageRpe, highIntensityCount,
    ruckKm, ruckLoadKg, loadRisk, riskTone, recommendation, recoveryFocus,
  };
}

// ---------------------------------------------------------------------------
// H2F public API
// ---------------------------------------------------------------------------

export type H2FDomain = {
  id: 'physical' | 'sleep' | 'nutrition' | 'mental';
  label: string;
  icon: string;
  value: string;
  score: number;
  status: 'GREEN' | 'AMBER' | 'RED';
  detail: string;
  hasData: boolean;
  actionLabel?: string;
};

export type RuckInputs = {
  bodyMassKg: number;
  loadKg: number;
  speedKph: number;
  gradePercent: number;
  terrainFactor: number;
};

export type RuckEstimate = {
  watts: number;
  wattsCorrected: number;
  metabolicCostKcalHour: number;
  loadedKm: number;
  loadRatio: number;
};

export function buildH2FDomains(sessions: TrainingSession[], latestReadiness?: ReadinessLog): H2FDomain[] {
  const profile = buildPerformanceProfile(sessions);

  const physicalScore = clamp(
    Math.round((profile.readiness + Math.min(100, profile.weeklyLoad / 12)) / 2),
    35, 96,
  );

  const hasSleepData = latestReadiness?.sleepHours !== undefined;
  const sleepHours = latestReadiness?.sleepHours ?? 0;
  const sleepQuality = latestReadiness?.sleepQuality ?? 3;
  const sleepScore = hasSleepData
    ? clamp(Math.round(sleepHours * 8.5 + (sleepQuality - 1) * 4), 35, 96)
    : 0;
  const sleepStatus: 'GREEN' | 'AMBER' | 'RED' = !hasSleepData ? 'AMBER'
    : sleepHours >= 7 && sleepQuality >= 4 ? 'GREEN'
    : sleepHours >= 6 || sleepQuality >= 3 ? 'AMBER'
    : 'RED';
  const sleepDetail = hasSleepData
    ? latestReadiness?.hydration === 'Poor' ? 'Hydration flagged — address before training'
      : (latestReadiness?.soreness ?? 0) >= 4 ? 'High soreness — monitor recovery'
      : 'Sleep on target'
    : 'Submit daily check-in to track';

  const hasMoodData = latestReadiness?.mood !== undefined;
  const mood = latestReadiness?.mood ?? 3;
  const stress = latestReadiness?.stress ?? 3;
  const mentalStatus: 'GREEN' | 'AMBER' | 'RED' = !hasMoodData ? 'AMBER'
    : mood >= 4 && stress <= 2 ? 'GREEN'
    : mood >= 3 ? 'AMBER'
    : 'RED';
  const mentalDetail = hasMoodData
    ? stress >= 4 ? 'High stress — use downshift block before hard work'
      : mood >= 4 ? 'Positive state — execute as planned'
      : 'Monitor mood — cap intensity if flagging'
    : 'Submit daily check-in to track';

  return [
    {
      id: 'physical',
      label: 'Physical',
      icon: 'barbell-outline',
      value: `Readiness ${physicalScore}`,
      score: physicalScore,
      status: physicalScore >= 80 ? 'GREEN' : physicalScore >= 62 ? 'AMBER' : 'RED',
      detail: `ACWR ${profile.acuteChronicRatio} · ${profile.weeklyLoad} AU`,
      hasData: true,
    },
    {
      id: 'sleep',
      label: 'Sleep',
      icon: 'moon-outline',
      value: hasSleepData ? `${sleepHours}h · Q${sleepQuality}/5` : 'Not logged',
      score: sleepScore,
      status: sleepStatus,
      detail: sleepDetail,
      hasData: hasSleepData,
      actionLabel: hasSleepData ? undefined : 'Log check-in →',
    },
    {
      id: 'nutrition',
      label: 'Fuel',
      icon: 'restaurant-outline',
      value: 'Not tracked',
      score: 0,
      status: 'AMBER',
      detail: profile.weeklyLoad > 1200
        ? 'High load — prioritise carbs + electrolytes'
        : 'Open Fuel tab to set targets',
      hasData: false,
      actionLabel: 'Open Fuel →',
    },
    {
      id: 'mental',
      label: 'Mental',
      icon: 'happy-outline',
      value: hasMoodData ? `Mood ${mood}/5` : 'Not logged',
      score: hasMoodData ? clamp(Math.round(mood * 14 + (5 - stress) * 10), 35, 96) : 0,
      status: mentalStatus,
      detail: mentalDetail,
      hasData: hasMoodData,
      actionLabel: hasMoodData ? undefined : 'Log check-in →',
    },
  ];
}

export function calculateWHtR(waistCm: number, heightCm: number) {
  const ratio = heightCm > 0 ? waistCm / heightCm : 0;
  return {
    ratio: Math.round(ratio * 1000) / 1000,
    compliant: ratio > 0 && ratio < 0.55,
    marginCm: Math.round((0.55 * heightCm - waistCm) * 10) / 10,
  };
}

export function calculateEnhancedPandolf(input: RuckInputs): RuckEstimate {
  const speedMs = input.speedKph / 3.6;
  const bodyWithLoad = input.bodyMassKg + input.loadKg;
  const grade = input.gradePercent;
  const terrain = Math.max(1, input.terrainFactor);
  const base = 1.5 * input.bodyMassKg + 2 * bodyWithLoad * Math.pow(input.loadKg / input.bodyMassKg, 2);
  const movement = terrain * bodyWithLoad * (1.5 * Math.pow(speedMs, 2) + 0.35 * speedMs * grade);
  const watts = Math.max(0, base + movement);
  const loadRatio = input.loadKg / input.bodyMassKg;
  const correction = loadRatio >= 0.27 ? 1.27 : 1 + loadRatio;
  const wattsCorrected = watts * correction;

  return {
    watts: Math.round(watts),
    wattsCorrected: Math.round(wattsCorrected),
    metabolicCostKcalHour: Math.round(wattsCorrected * 0.86),
    loadedKm: Math.round(input.speedKph * input.loadKg * 10) / 10,
    loadRatio: Math.round(loadRatio * 100) / 100,
  };
}

export function buildPrescriptiveGuidance(
  sessions: TrainingSession[],
  sleepHours = 6.5,
  hrvTrend: 'up' | 'flat' | 'down' = 'flat',
) {
  const profile = buildPerformanceProfile(sessions);
  if (sleepHours < 5 || hrvTrend === 'down' || profile.readinessBand === 'RED') {
    return 'Prescribe mobility, Zone 2, tissue care, and hydration. Avoid max-effort lifts or heavy ruck intervals today.';
  }
  if (profile.loadRisk === 'Moderate' || sleepHours < 7) {
    return 'Cap work at RPE 7, shorten loaded volume by 15%, and bias technique over intensity.';
  }
  return 'Green window: execute assigned AFT/CFT or loaded movement work, then log recovery markers before lights out.';
}
