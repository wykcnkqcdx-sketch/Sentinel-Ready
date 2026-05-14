import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type TrainingCategory = 'Ruck' | 'Strength' | 'Run' | 'Mobility' | 'Test' | 'Recovery';
type TrainingFilter = 'All' | TrainingCategory;
type SortMode = 'Newest' | 'Oldest' | 'Highest Readiness' | 'Lowest Readiness';

type TrainingLog = {
  id: number;
  date: string;
  category: TrainingCategory;
  type: string;
  duration: string;
  distanceLoad: string;
  readiness: string;
  notes: string;
};

type QuickTemplate = {
  label: string;
  category: TrainingCategory;
  sessionType: string;
  duration: string;
  distanceLoad: string;
  readiness: string;
  notes: string;
};

type RecommendedSession = {
  title: string;
  focus: string;
  reason: string;
  plan: string;
};

const STORAGE_KEY = 'sentinel_training_logs';

const categories: TrainingCategory[] = ['Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];
const filters: TrainingFilter[] = ['All', 'Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];
const sortModes: SortMode[] = ['Newest', 'Oldest', 'Highest Readiness', 'Lowest Readiness'];

const fallbackRecommendedSession = {
  title: 'Baseline Session',
  focus: 'Easy Run or Strength',
  reason: 'No recommendation is available yet. Add or update training logs to generate a better recommendation.',
  plan: 'Start with a controlled baseline session. Keep intensity moderate and record readiness afterwards.',
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

function getDateValue(date: string) {
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getReadinessLabel(readiness: string) {
  const score = Number(readiness);

  if (Number.isNaN(score)) {
    return 'Unknown';
  }

  if (score <= 3) {
    return 'Low readiness';
  }

  if (score <= 5) {
    return 'Fatigue watch';
  }

  if (score <= 7) {
    return 'Moderate readiness';
  }

  return 'High readiness';
}

function getTrainingBalanceMessage(weeklyRuck: number, weeklyStrength: number, weeklyRun: number, weeklyRecovery: number, weeklyTotal: number) {
  if (weeklyTotal === 0) {
    return 'No weekly training data yet. Add sessions to generate balance guidance.';
  }

  if (weeklyTotal >= 3 && weeklyRecovery === 0) {
    return 'Recovery gap detected. Add at least one recovery or mobility session this week.';
  }

  if (weeklyRuck >= 3 && weeklyRecovery === 0) {
    return 'Ruck load is high with no recovery logged. Consider mobility, foot care and reduced impact work.';
  }

  if (weeklyRun >= 4) {
    return 'Run volume is high this week. Monitor calves, hips, sleep and fatigue.';
  }

  if (weeklyStrength >= 4) {
    return 'Strength frequency is high this week. Monitor joint soreness and recovery quality.';
  }

  if (weeklyRecovery >= 1 && weeklyTotal >= 3) {
    return 'Training balance looks controlled. Recovery is included in the week.';
  }

  return 'Training balance is acceptable. Keep monitoring readiness and fatigue.';
}

function getTrainingBalanceStatus(weeklyRuck: number, weeklyStrength: number, weeklyRun: number, weeklyRecovery: number, weeklyTotal: number) {
  if (weeklyTotal === 0) {
    return 'No Data';
  }

  if ((weeklyTotal >= 3 && weeklyRecovery === 0) || weeklyRuck >= 3 || weeklyRun >= 4 || weeklyStrength >= 4) {
    return 'Watch';
  }

  return 'Balanced';
}

function getRecommendedNextSession(
  weeklyRuck: number,
  weeklyStrength: number,
  weeklyRun: number,
  weeklyRecovery: number,
  weeklyFatigueWatch: number,
  weeklyAverageReadiness: string,
  weeklyTotal: number
): RecommendedSession {
  const readiness = Number(weeklyAverageReadiness);

  if (weeklyTotal === 0) {
    return {
      title: 'Baseline Session',
      focus: 'Easy Run or Strength',
      reason: 'No recent training data is logged. Start with a controlled baseline session before increasing load.',
      plan: '30 minutes easy run or 40 minutes full-body strength. Keep intensity moderate and record readiness afterwards.',
    };
  }

  if (weeklyFatigueWatch > 0 || readiness <= 5) {
    return {
      title: 'Recovery Priority',
      focus: 'Recovery / Mobility',
      reason: 'Fatigue watch or reduced readiness is present this week. The next session should reduce stress rather than add more load.',
      plan: '20 to 30 minutes mobility, light walk, hydration focus, hips, calves, hamstrings and shoulders.',
    };
  }

  if (weeklyTotal >= 3 && weeklyRecovery === 0) {
    return {
      title: 'Recovery Gap',
      focus: 'Recovery / Mobility',
      reason: 'Several sessions are logged this week but no recovery work is recorded.',
      plan: '25 minutes recovery mobility. Add breathing work, foot care, calf mobility and easy stretching.',
    };
  }

  if (weeklyRuck >= 3) {
    return {
      title: 'Ruck Load Check',
      focus: 'Mobility or Strength',
      reason: 'Ruck work is already high this week. Avoid adding another loaded session immediately.',
      plan: 'Upper-body strength, core, mobility and unloaded movement. Avoid heavy lower-leg impact.',
    };
  }

  if (weeklyRun >= 3 && weeklyStrength === 0) {
    return {
      title: 'Strength Gap',
      focus: 'Strength',
      reason: 'Run volume is present but strength work is missing. Add structural strength for durability.',
      plan: 'Squat, hinge, press, pull and carry. Keep the effort controlled and stop short of failure.',
    };
  }

  if (weeklyStrength >= 3 && weeklyRun === 0) {
    return {
      title: 'Aerobic Gap',
      focus: 'Easy Run',
      reason: 'Strength work is present but no run session is logged. Add aerobic work without overloading the system.',
      plan: '25 to 35 minutes easy run or run/walk. Keep breathing controlled and finish fresh.',
    };
  }

  if (weeklyRuck === 0 && weeklyTotal >= 2) {
    return {
      title: 'Ruck Exposure',
      focus: 'Light Ruck',
      reason: 'No ruck session is logged this week. Add a controlled loaded walk if readiness is good.',
      plan: '4 to 6 km with light to moderate load. Maintain posture, steady pace and foot care.',
    };
  }

  return {
    title: 'Balanced Progression',
    focus: 'Tactical Conditioning',
    reason: 'The week looks reasonably balanced. Progress with a controlled mixed session.',
    plan: '5 km steady run, loaded carry intervals, short strength circuit and 10 minutes mobility.',
  };
}

function buildTrainingReport(log: TrainingLog) {
  const fatigueText = isFatigueWatch(log.readiness)
    ? 'Fatigue Watch: reduced readiness recorded. Consider recovery, reduced intensity, hydration, sleep and mobility work.'
    : 'No fatigue warning recorded. Session appears suitable for normal training review.';

  return [
    'SENTINEL READY TRAINING REPORT',
    '',
    `Date: ${log.date}`,
    `Category: ${log.category}`,
    `Session: ${log.type}`,
    `Duration: ${log.duration}`,
    `Distance / Load: ${log.distanceLoad}`,
    `Readiness: ${log.readiness}/10 (${getReadinessLabel(log.readiness)})`,
    '',
    'Notes:',
    log.notes,
    '',
    'Readiness Review:',
    fatigueText,
  ].join('\n');
}

function buildWeeklyTrainingReport(logs: TrainingLog[], summary: any) {
  const weeklyLogs = logs
    .filter((log) => isWithinLastSevenDays(log.date))
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date) || b.id - a.id);

  const sessionLines =
    weeklyLogs.length === 0
      ? ['No sessions logged in the last 7 days.']
      : weeklyLogs.map((log, index) => {
          const fatigueText = isFatigueWatch(log.readiness) ? 'Fatigue Watch' : 'Normal';

          return [
            `${index + 1}. ${log.date} - ${log.category} - ${log.type}`,
            `   Duration: ${log.duration}`,
            `   Distance / Load: ${log.distanceLoad}`,
            `   Readiness: ${log.readiness}/10 (${getReadinessLabel(log.readiness)})`,
            `   Status: ${fatigueText}`,
            `   Notes: ${log.notes}`,
          ].join('\n');
        });

  return [
    'SENTINEL READY WEEKLY TRAINING REPORT',
    '',
    'Reporting Period: Last 7 Days',
    '',
    'Summary:',
    `Total Sessions: ${summary.weeklyTotal}`,
    `Ruck Sessions: ${summary.weeklyRuck}`,
    `Strength Sessions: ${summary.weeklyStrength}`,
    `Run Sessions: ${summary.weeklyRun}`,
    `Recovery Sessions: ${summary.weeklyRecovery}`,
    `Fatigue Watch Sessions: ${summary.weeklyFatigueWatch}`,
    `Weekly Readiness Average: ${summary.weeklyAverageReadiness}/10`,
    `Overall Readiness Average: ${summary.averageReadiness}/10`,
    `Weekly Readiness Change: ${Number(summary.readinessDifference) > 0 ? '+' : ''}${summary.readinessDifference}`,
    '',
    'Training Balance:',
    `${summary.trainingBalanceStatus} - ${summary.trainingBalanceMessage}`,
    '',
    'Recommended Next Session:',
    `Title: ${(summary.recommendedNextSession || fallbackRecommendedSession).title}`,
    `Focus: ${(summary.recommendedNextSession || fallbackRecommendedSession).focus}`,
    `Reason: ${(summary.recommendedNextSession || fallbackRecommendedSession).reason}`,
    `Suggested Plan: ${(summary.recommendedNextSession || fallbackRecommendedSession).plan}`,
    '',
    'Session Breakdown:',
    ...sessionLines,
  ].join('\n');
}

const quickTemplates: QuickTemplate[] = [
  {
    label: 'Ruck',
    category: 'Ruck',
    sessionType: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '7',
    notes: 'Steady tactical pace. Monitor feet, shoulders, breathing and posture.',
  },
  {
    label: 'Run',
    category: 'Run',
    sessionType: 'Steady Run',
    duration: '35 minutes',
    distanceLoad: '5 km',
    readiness: '7',
    notes: 'Controlled aerobic pace. Keep the effort comfortable and consistent.',
  },
  {
    label: 'Strength',
    category: 'Strength',
    sessionType: 'Full Body Strength',
    duration: '50 minutes',
    distanceLoad: 'Squat � Press � Pull � Hinge � Carry',
    readiness: '8',
    notes: 'Keep form strict. Avoid grinding reps. Leave one or two reps in reserve.',
  },
  {
    label: 'Recovery',
    category: 'Recovery',
    sessionType: 'Recovery Mobility',
    duration: '25 minutes',
    distanceLoad: 'Hips � Calves � Hamstrings � Shoulders',
    readiness: '5',
    notes: 'Low intensity. Focus on breathing, mobility and reducing stiffness.',
  },
  {
    label: 'Test',
    category: 'Test',
    sessionType: 'Fitness Test Prep',
    duration: '40 minutes',
    distanceLoad: 'Run effort � Press-ups � Sit-ups � Carries',
    readiness: '8',
    notes: 'Record results clearly. Do not max out if fatigue is high.',
  },
];

const starterLogs: TrainingLog[] = [
  {
    id: 1,
    date: getTodayDate(),
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '1 hr 45 min',
    distanceLoad: '12 km � 18 kg',
    readiness: '7',
    notes: 'Moderate effort. Good pace. Recovery required.',
  },
  {
    id: 2,
    date: getTodayDate(),
    category: 'Strength',
    type: 'Strength Session',
    duration: '55 min',
    distanceLoad: 'Squat � Press � Pull � Hinge',
    readiness: '8',
    notes: 'Controlled intensity. Solid movement quality.',
  },
  {
    id: 3,
    date: getTodayDate(),
    category: 'Recovery',
    type: 'Recovery Work',
    duration: '25 min',
    distanceLoad: 'Mobility � Stretching',
    readiness: '5',
    notes: 'Light recovery session. Hydration focus.',
  },
];


function calculateTrainingStreak(logs: TrainingLog[]) {
  const loggedDates = new Set(
    logs
      .map((log) => log.date)
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
  );

  if (loggedDates.size === 0) {
    return 0;
  }

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let cursor = new Date();

  if (!loggedDates.has(todayKey) && loggedDates.has(yesterdayKey)) {
    cursor.setDate(today.getDate() - 1);
  }

  if (!loggedDates.has(cursor.toISOString().slice(0, 10))) {
    return 0;
  }

  let streak = 0;

  while (loggedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}


function extractKilometres(distanceLoad: string) {
  const match = distanceLoad.match(/(\d+(\.\d+)?)\s*km/i);
  return match ? Number(match[1]) : 0;
}

function extractMinutes(duration: string) {
  const lower = duration.toLowerCase();

  const hourMatch = lower.match(/(\d+(\.\d+)?)\s*(hr|hour|hours|h)/);
  const minuteMatch = lower.match(/(\d+(\.\d+)?)\s*(min|minute|minutes|m)/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (hours > 0 || minutes > 0) {
    return Math.round(hours * 60 + minutes);
  }

  const numberOnly = Number(duration.replace(/[^0-9.]/g, ''));
  return Number.isNaN(numberOnly) ? 0 : numberOnly;
}

function calculatePersonalBests(logs: TrainingLog[]) {
  const bestRuckDistance = logs
    .filter((log) => log.category === 'Ruck')
    .reduce((best, log) => Math.max(best, extractKilometres(log.distanceLoad)), 0);

  const bestReadiness = logs.reduce((best, log) => {
    const score = Number(log.readiness);
    return Number.isNaN(score) ? best : Math.max(best, score);
  }, 0);

  const longestSessionMinutes = logs.reduce((best, log) => {
    return Math.max(best, extractMinutes(log.duration));
  }, 0);

  return {
    bestRuckDistance,
    bestReadiness,
    longestSessionMinutes,
  };
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return '0 min';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}


function calculateMissionReadyScore(
  averageReadiness: string,
  weeklyTotal: number,
  weeklyRecovery: number,
  weeklyFatigueWatch: number,
  trainingBalanceStatus: string,
  trainingStreak: number
) {
  let score = 50;

  const readiness = Number(averageReadiness);

  if (!Number.isNaN(readiness)) {
    score += Math.round(readiness * 4);
  }

  if (weeklyTotal >= 3) {
    score += 10;
  } else if (weeklyTotal >= 1) {
    score += 5;
  }

  if (weeklyRecovery >= 1) {
    score += 10;
  }

  if (trainingStreak >= 3) {
    score += 8;
  } else if (trainingStreak >= 1) {
    score += 4;
  }

  if (trainingBalanceStatus === 'Balanced') {
    score += 8;
  }

  if (trainingBalanceStatus === 'Watch') {
    score -= 10;
  }

  score -= weeklyFatigueWatch * 8;

  if (score > 100) {
    return 100;
  }

  if (score < 0) {
    return 0;
  }

  return score;
}

function getMissionReadyLabel(score: number) {
  if (score >= 85) {
    return 'High Readiness';
  }

  if (score >= 70) {
    return 'Ready';
  }

  if (score >= 50) {
    return 'Developing';
  }

  return 'Recovery Needed';
}


function isWithinLastSevenDays(date: string) {
  const logTime = new Date(date).getTime();

  if (Number.isNaN(logTime)) {
    return false;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return logTime >= sevenDaysAgo.getTime() && logTime <= today.getTime();
}


function buildMissionReadyBreakdown(
  averageReadiness: string,
  weeklyTotal: number,
  weeklyRecovery: number,
  weeklyFatigueWatch: number,
  trainingBalanceStatus: string,
  trainingStreak: number
) {
  const readiness = Number(averageReadiness);
  const readinessPoints = Number.isNaN(readiness) ? 0 : Math.round(readiness * 4);
  const weeklySessionPoints = weeklyTotal >= 3 ? 10 : weeklyTotal >= 1 ? 5 : 0;
  const recoveryPoints = weeklyRecovery >= 1 ? 10 : 0;
  const streakPoints = trainingStreak >= 3 ? 8 : trainingStreak >= 1 ? 4 : 0;
  const balancePoints = trainingBalanceStatus === 'Balanced' ? 8 : trainingBalanceStatus === 'Watch' ? -10 : 0;
  const fatiguePenalty = weeklyFatigueWatch * -8;

  return [
    {
      label: 'Readiness',
      value: `${averageReadiness}/10`,
      points: readinessPoints,
      note: 'Based on average readiness score.',
    },
    {
      label: 'Weekly Sessions',
      value: `${weeklyTotal}`,
      points: weeklySessionPoints,
      note: weeklyTotal >= 3 ? 'Good weekly consistency.' : 'More logged sessions will improve confidence.',
    },
    {
      label: 'Recovery',
      value: `${weeklyRecovery}`,
      points: recoveryPoints,
      note: weeklyRecovery >= 1 ? 'Recovery work is included.' : 'No recovery logged in the last 7 days.',
    },
    {
      label: 'Streak',
      value: `${trainingStreak} day`,
      points: streakPoints,
      note: trainingStreak >= 3 ? 'Strong consistency.' : 'Build the streak gradually.',
    },
    {
      label: 'Balance',
      value: trainingBalanceStatus,
      points: balancePoints,
      note: trainingBalanceStatus === 'Watch' ? 'Training balance needs attention.' : 'Training balance is acceptable.',
    },
    {
      label: 'Fatigue Watch',
      value: `${weeklyFatigueWatch}`,
      points: fatiguePenalty,
      note: weeklyFatigueWatch > 0 ? 'Fatigue watch reduces the score.' : 'No weekly fatigue warning.',
    },
  ];
}


function getRiskLevel(
  missionReadyScore: number,
  weeklyFatigueWatch: number,
  weeklyAverageReadiness: string,
  trainingBalanceStatus: string
) {
  const weeklyReadiness = Number(weeklyAverageReadiness);

  if (
    missionReadyScore < 45 ||
    weeklyFatigueWatch >= 3 ||
    (!Number.isNaN(weeklyReadiness) && weeklyReadiness <= 4)
  ) {
    return {
      label: 'High Risk',
      message: 'Readiness is low or fatigue risk is high. Prioritise recovery, sleep, hydration and reduced training load.',
      severity: 'high',
    };
  }

  if (
    missionReadyScore < 60 ||
    weeklyFatigueWatch >= 2 ||
    trainingBalanceStatus === 'Watch'
  ) {
    return {
      label: 'Elevated Risk',
      message: 'Training load or fatigue markers need attention. Keep the next session controlled and include recovery work.',
      severity: 'elevated',
    };
  }

  if (missionReadyScore < 75 || weeklyFatigueWatch === 1) {
    return {
      label: 'Moderate Risk',
      message: 'Training can continue, but monitor readiness and avoid unnecessary intensity spikes.',
      severity: 'moderate',
    };
  }

  return {
    label: 'Low Risk',
    message: 'Readiness and training balance look controlled. Continue progressive training and monitor fatigue.',
    severity: 'low',
  };
}


function getRecoveryRecommendation(
  riskLevel: any,
  weeklyFatigueWatch: number,
  weeklyRecovery: number,
  weeklyAverageReadiness: string,
  trainingBalanceStatus: string
) {
  const weeklyReadiness = Number(weeklyAverageReadiness);

  if (riskLevel?.severity === 'high') {
    return {
      title: 'Recovery Priority',
      action: 'Take a recovery-focused day before adding more intensity.',
      plan: '20 to 30 minutes easy walking, hips, calves, hamstrings, shoulders, hydration, and sleep focus.',
      urgency: 'high',
    };
  }

  if (weeklyFatigueWatch > 0 || (!Number.isNaN(weeklyReadiness) && weeklyReadiness <= 5)) {
    return {
      title: 'Fatigue Management',
      action: 'Reduce load and intensity for the next session.',
      plan: 'Choose mobility, light aerobic work, or unloaded movement. Avoid heavy ruck, max effort running, or grinding strength sets.',
      urgency: 'elevated',
    };
  }

  if (weeklyRecovery === 0 && trainingBalanceStatus === 'Watch') {
    return {
      title: 'Recovery Gap',
      action: 'Add one recovery or mobility session this week.',
      plan: '25 minutes mobility: calves, hips, hamstrings, thoracic rotation, shoulders, breathing and easy stretching.',
      urgency: 'moderate',
    };
  }

  if (weeklyRecovery === 0) {
    return {
      title: 'Add Maintenance Work',
      action: 'Recovery is not logged yet this week.',
      plan: 'Add 10 to 15 minutes mobility after the next session and record it as Recovery.',
      urgency: 'moderate',
    };
  }

  return {
    title: 'Recovery On Track',
    action: 'Recovery work is present and risk is controlled.',
    plan: 'Continue normal progressive training. Keep monitoring readiness, sleep and soreness.',
    urgency: 'low',
  };
}


function getNotesQualityMessage(notes: string) {
  const cleanNotes = notes.trim().toLowerCase();

  if (cleanNotes.length === 0) {
    return 'Add a short note about effort, fatigue, pain, pace, load or recovery.';
  }

  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];

  if (weakNotes.includes(cleanNotes)) {
    return 'Note is too brief. Add more detail, such as effort level, soreness, pace, load, breathing or recovery.';
  }

  if (cleanNotes.length < 15) {
    return 'Note is short. Consider adding one more detail about how the session felt.';
  }

  return '';
}


function getNotesSuggestion(category: TrainingCategory) {
  if (category === 'Ruck') {
    return 'Suggested notes: pace, pack weight, foot comfort, shoulder pressure, terrain, breathing, hot spots or blisters.';
  }

  if (category === 'Run') {
    return 'Suggested notes: pace, breathing, legs, calves, hips, effort level, route, weather and how you finished.';
  }

  if (category === 'Strength') {
    return 'Suggested notes: main lifts, load used, reps, form quality, soreness, grip, joint comfort and effort level.';
  }

  if (category === 'Recovery') {
    return 'Suggested notes: mobility areas worked, soreness, sleep, hydration, stiffness, pain and how you felt after.';
  }

  if (category === 'Test') {
    return 'Suggested notes: test result, score, weak points, pacing, breathing, fatigue and what to improve next time.';
  }

  return 'Suggested notes: effort, fatigue, soreness, breathing, load, pace, recovery and anything unusual.';
}


function getNoteStarter(category: TrainingCategory) {
  if (category === 'Ruck') {
    return 'Ruck notes: pace felt controlled, pack sat well, feet checked after session, shoulders manageable, breathing steady, no major hot spots.';
  }

  if (category === 'Run') {
    return 'Run notes: pace controlled, breathing steady, legs felt good, calves monitored, finished with energy left, no unusual pain.';
  }

  if (category === 'Strength') {
    return 'Strength notes: main lifts completed, form stayed solid, effort controlled, no grinding reps, joints felt comfortable, recovery needed.';
  }

  if (category === 'Recovery') {
    return 'Recovery notes: mobility completed, hips/calves/hamstrings worked, stiffness reduced, hydration checked, sleep and soreness monitored.';
  }

  if (category === 'Test') {
    return 'Test notes: result recorded, pacing reviewed, weak points identified, breathing controlled, fatigue noted, next improvement target set.';
  }

  return 'Session notes: effort level, fatigue, soreness, breathing, load, pace, recovery and anything unusual recorded.';
}


function calculateSessionQuality(log: TrainingLog) {
  let score = 40;

  const readiness = Number(log.readiness);

  if (!Number.isNaN(readiness)) {
    score += Math.round(readiness * 3);
  }

  if (log.date && /^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
    score += 8;
  }

  if (log.type && log.type.trim().length >= 3) {
    score += 8;
  }

  if (log.duration && log.duration.trim().length >= 3) {
    score += 8;
  }

  if (log.distanceLoad && log.distanceLoad.trim().length >= 5 && log.distanceLoad !== 'No distance or load entered') {
    score += 8;
  }

  if (!getNotesQualityMessage(log.notes)) {
    score += 18;
  } else if (log.notes && log.notes.trim().length >= 15) {
    score += 8;
  }

  if (isFatigueWatch(log.readiness)) {
    score -= 10;
  }

  if (score > 100) {
    return 100;
  }

  if (score < 0) {
    return 0;
  }

  return score;
}

function getSessionQualityLabel(score: number) {
  if (score >= 85) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Good';
  }

  if (score >= 50) {
    return 'Fair';
  }

  return 'Needs Detail';
}


function getSessionQualityTip(log: TrainingLog) {
  const tips: string[] = [];

  if (!log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
    tips.push('add a valid date');
  }

  if (!log.type || log.type.trim().length < 3) {
    tips.push('add a clearer session type');
  }

  if (!log.duration || log.duration.trim().length < 3) {
    tips.push('record the session duration');
  }

  if (!log.distanceLoad || log.distanceLoad.trim().length < 5 || log.distanceLoad === 'No distance or load entered') {
    tips.push('add distance, load or main work completed');
  }

  if (getNotesQualityMessage(log.notes)) {
    tips.push('improve the notes with effort, fatigue, soreness or performance detail');
  }

  if (isFatigueWatch(log.readiness)) {
    tips.push('review fatigue and recovery before the next hard session');
  }

  if (tips.length === 0) {
    return 'Good quality log. It has useful training detail for later review.';
  }

  return `Improve this log: ${tips.join(', ')}.`;
}


function getDataHealth(logs: TrainingLog[]) {
  if (logs.length === 0) {
    return {
      status: 'No Data',
      severity: 'warning',
      message: 'No training logs are saved yet. Add a few sessions to build useful readiness and training insights.',
      weakNotes: 0,
      incompleteLogs: 0,
    };
  }

  const weakNotes = logs.filter((log) => getNotesQualityMessage(log.notes)).length;

  const incompleteLogs = logs.filter((log) => {
    const missingDate = !log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date);
    const missingType = !log.type || log.type.trim().length < 3;
    const missingDuration = !log.duration || log.duration.trim().length < 3;
    const missingLoad =
      !log.distanceLoad ||
      log.distanceLoad.trim().length < 5 ||
      log.distanceLoad === 'No distance or load entered';

    return missingDate || missingType || missingDuration || missingLoad;
  }).length;

  const weakNoteRatio = weakNotes / logs.length;
  const incompleteRatio = incompleteLogs / logs.length;

  if (weakNoteRatio >= 0.5 || incompleteRatio >= 0.4) {
    return {
      status: 'Needs Attention',
      severity: 'high',
      message: 'A high number of logs are missing useful detail. Improve notes, duration, load, distance and readiness entries.',
      weakNotes,
      incompleteLogs,
    };
  }

  if (weakNoteRatio >= 0.25 || incompleteRatio >= 0.2) {
    return {
      status: 'Improve Detail',
      severity: 'moderate',
      message: 'Some logs need more detail. Better notes and complete fields will improve analysis quality.',
      weakNotes,
      incompleteLogs,
    };
  }

  return {
    status: 'Healthy',
    severity: 'low',
    message: 'Log data looks healthy. Most sessions contain enough detail for useful review.',
    weakNotes,
    incompleteLogs,
  };
}


function logNeedsImprovement(log: TrainingLog) {
  const weakNotes = Boolean(getNotesQualityMessage(log.notes));
  const missingDate = !log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date);
  const missingType = !log.type || log.type.trim().length < 3;
  const missingDuration = !log.duration || log.duration.trim().length < 3;
  const missingLoad =
    !log.distanceLoad ||
    log.distanceLoad.trim().length < 5 ||
    log.distanceLoad === 'No distance or load entered';

  return weakNotes || missingDate || missingType || missingDuration || missingLoad;
}


function getFormCompletionChecklist(
  date: string,
  category: TrainingCategory,
  sessionType: string,
  duration: string,
  distanceLoad: string,
  readiness: string,
  notes: string
) {
  const readinessNumber = Number(readiness);

  return [
    {
      label: 'Date',
      complete: Boolean(date.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()),
    },
    {
      label: 'Category',
      complete: Boolean(category),
    },
    {
      label: 'Session Type',
      complete: sessionType.trim().length >= 3,
    },
    {
      label: 'Duration',
      complete: duration.trim().length >= 3,
    },
    {
      label: 'Distance / Load',
      complete: distanceLoad.trim().length >= 5,
    },
    {
      label: 'Readiness',
      complete: !Number.isNaN(readinessNumber) && readinessNumber >= 1 && readinessNumber <= 10,
    },
    {
      label: 'Useful Notes',
      complete: !getNotesQualityMessage(notes),
    },
  ];
}

function getFormCompletionScore(items: { label: string; complete: boolean }[]) {
  if (items.length === 0) {
    return 0;
  }

  const completedItems = items.filter((item) => item.complete).length;
  return Math.round((completedItems / items.length) * 100);
}


function calculateTrainingLogHealthScore(
  averageSessionQuality: number,
  weakLogsCount: number,
  totalLogs: number,
  incompleteLogs: number
) {
  if (totalLogs === 0) {
    return 0;
  }

  let score = averageSessionQuality;

  const weakLogPenalty = Math.round((weakLogsCount / totalLogs) * 30);
  const incompletePenalty = Math.round((incompleteLogs / totalLogs) * 25);

  score = score - weakLogPenalty - incompletePenalty;

  if (score > 100) {
    return 100;
  }

  if (score < 0) {
    return 0;
  }

  return score;
}

function getTrainingLogHealthLabel(score: number) {
  if (score >= 85) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Healthy';
  }

  if (score >= 50) {
    return 'Needs Work';
  }

  return 'Poor Data';
}

export default function LogScreen() {
  const [date, setDate] = useState(getTodayDate());
  const [category, setCategory] = useState<TrainingCategory>('Ruck');
  const [activeFilter, setActiveFilter] = useState<TrainingFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWeakLogsOnly, setShowWeakLogsOnly] = useState(false);
  const [sessionType, setSessionType] = useState('');
  const [duration, setDuration] = useState('');
  const [distanceLoad, setDistanceLoad] = useState('');
  const [readiness, setReadiness] = useState('');
  const [notes, setNotes] = useState('');
  const [logs, setLogs] = useState<TrainingLog[]>(starterLogs);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const selectedLog = useMemo(() => {
    return logs.find((log) => log.id === selectedLogId) || null;
  }, [logs, selectedLogId]);

  const isEditing = editingLogId !== null;

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const results = logs.filter((log) => {
      const matchesFilter = activeFilter === 'All' || log.category === activeFilter;

      const searchableText = [
        log.date,
        log.category,
        log.type,
        log.duration,
        log.distanceLoad,
        log.readiness,
        log.notes,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = query.length === 0 || searchableText.includes(query);

      const matchesWeakLogFilter = !showWeakLogsOnly || logNeedsImprovement(log);

      return matchesFilter && matchesSearch && matchesWeakLogFilter;
    });

    return [...results].sort((a, b) => {
      if (sortMode === 'Newest') {
        return getDateValue(b.date) - getDateValue(a.date) || b.id - a.id;
      }

      if (sortMode === 'Oldest') {
        return getDateValue(a.date) - getDateValue(b.date) || a.id - b.id;
      }

      if (sortMode === 'Highest Readiness') {
        return getReadinessNumber(b.readiness) - getReadinessNumber(a.readiness);
      }

      return getReadinessNumber(a.readiness) - getReadinessNumber(b.readiness);
    });
  }, [logs, activeFilter, searchQuery, sortMode, showWeakLogsOnly]);

  const summary = useMemo(() => {
    const readinessScores = logs
      .map((log) => Number(log.readiness))
      .filter((score) => !Number.isNaN(score) && score >= 1 && score <= 10);

    const averageReadiness =
      readinessScores.length > 0
        ? (readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length).toFixed(1)
        : '0.0';

    const weeklyLogs = logs.filter((log) => isWithinLastSevenDays(log.date));

    const weeklyReadinessScores = weeklyLogs
      .map((log) => Number(log.readiness))
      .filter((score) => !Number.isNaN(score) && score >= 1 && score <= 10);

    const weeklyAverageReadiness =
      weeklyReadinessScores.length > 0
        ? (weeklyReadinessScores.reduce((total, score) => total + score, 0) / weeklyReadinessScores.length).toFixed(1)
        : '0.0';

    const readinessDifference = (Number(weeklyAverageReadiness) - Number(averageReadiness)).toFixed(1);

    const weeklyTotal = weeklyLogs.length;
    const weeklyRuck = weeklyLogs.filter((log) => log.category === 'Ruck').length;
    const weeklyStrength = weeklyLogs.filter((log) => log.category === 'Strength').length;
    const weeklyRun = weeklyLogs.filter((log) => log.category === 'Run').length;
    const weeklyRecovery = weeklyLogs.filter((log) => log.category === 'Recovery').length;
    const weeklyFatigueWatch = weeklyLogs.filter((log) => isFatigueWatch(log.readiness)).length;

    const trainingStreak = calculateTrainingStreak(logs);
    const personalBests = calculatePersonalBests(logs);

    const sessionQualityScores = logs.map((log) => calculateSessionQuality(log));
    const averageSessionQuality =
      sessionQualityScores.length > 0
        ? Math.round(sessionQualityScores.reduce((total, score) => total + score, 0) / sessionQualityScores.length)
        : 0;

    const weeklySessionQualityScores = weeklyLogs.map((log) => calculateSessionQuality(log));
    const weeklyAverageSessionQuality =
      weeklySessionQualityScores.length > 0
        ? Math.round(weeklySessionQualityScores.reduce((total, score) => total + score, 0) / weeklySessionQualityScores.length)
        : 0;

    const weeklyQualityChange = weeklyAverageSessionQuality - averageSessionQuality;
    const dataHealth = getDataHealth(logs);
    const weakLogsCount = logs.filter((log) => logNeedsImprovement(log)).length;

    const trainingLogHealthScore = calculateTrainingLogHealthScore(
      averageSessionQuality,
      weakLogsCount,
      logs.length,
      dataHealth.incompleteLogs
    );

    const trainingBalanceStatus = getTrainingBalanceStatus(
      weeklyRuck,
      weeklyStrength,
      weeklyRun,
      weeklyRecovery,
      weeklyTotal
    );

    const trainingBalanceMessage = getTrainingBalanceMessage(
      weeklyRuck,
      weeklyStrength,
      weeklyRun,
      weeklyRecovery,
      weeklyTotal
    );

    const recommendedNextSession = getRecommendedNextSession(
      weeklyRuck,
      weeklyStrength,
      weeklyRun,
      weeklyRecovery,
      weeklyFatigueWatch,
      weeklyAverageReadiness,
      weeklyTotal
    );

    const missionReadyScore = calculateMissionReadyScore(
      averageReadiness,
      weeklyTotal,
      weeklyRecovery,
      weeklyFatigueWatch,
      trainingBalanceStatus,
      trainingStreak
    );

    const missionReadyBreakdown = buildMissionReadyBreakdown(
      averageReadiness,
      weeklyTotal,
      weeklyRecovery,
      weeklyFatigueWatch,
      trainingBalanceStatus,
      trainingStreak
    );

    const riskLevel = getRiskLevel(
      missionReadyScore,
      weeklyFatigueWatch,
      weeklyAverageReadiness,
      trainingBalanceStatus
    );

    const recoveryRecommendation = getRecoveryRecommendation(
      riskLevel,
      weeklyFatigueWatch,
      weeklyRecovery,
      weeklyAverageReadiness,
      trainingBalanceStatus
    );

    return {
      total: logs.length,
      trainingStreak,
      missionReadyScore,
      ruck: logs.filter((log) => log.category === 'Ruck').length,
      strength: logs.filter((log) => log.category === 'Strength').length,
      run: logs.filter((log) => log.category === 'Run').length,
      recovery: logs.filter((log) => log.category === 'Recovery').length,
      fatigueWatch: logs.filter((log) => isFatigueWatch(log.readiness)).length,
      averageReadiness,
      weeklyTotal,
      weeklyRuck,
      weeklyStrength,
      weeklyRun,
      weeklyRecovery,
      weeklyFatigueWatch,
      weeklyAverageReadiness,
      readinessDifference,
      trainingBalanceStatus,
      trainingBalanceMessage,
      recommendedNextSession,
      missionReadyBreakdown,
      riskLevel,
      averageSessionQuality,
      recoveryRecommendation,
      bestRuckDistance: personalBests.bestRuckDistance,
      bestReadiness: personalBests.bestReadiness,
      longestSessionMinutes: personalBests.longestSessionMinutes,
    };
  }, [logs]);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveLogsToStorage(logs);
    }
  }, [logs, loaded]);

  async function loadLogs() {
    try {
      const savedLogs = await AsyncStorage.getItem(STORAGE_KEY);

      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);

        const upgradedLogs = parsedLogs.map((log: Partial<TrainingLog>) => ({
          id: log.id || Date.now(),
          date: log.date || getTodayDate(),
          category: log.category || 'Ruck',
          type: log.type || 'Training Session',
          duration: log.duration || 'No duration entered',
          distanceLoad: log.distanceLoad || 'No distance or load entered',
          readiness: log.readiness || '5',
          notes: log.notes || 'No notes entered.',
        }));

        setLogs(upgradedLogs);
      }
    } catch {
      Alert.alert('Storage Error', 'Could not load saved training logs.');
    } finally {
      setLoaded(true);
    }
  }

  async function saveLogsToStorage(updatedLogs: TrainingLog[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch {
      Alert.alert('Storage Error', 'Could not save training logs.');
    }
  }

  function applyTemplate(template: QuickTemplate) {
    setCategory(template.category);
    setSessionType(template.sessionType);
    setDuration(template.duration);
    setDistanceLoad(template.distanceLoad);
    setReadiness(template.readiness);
    setNotes(template.notes);
  }

  function clearForm() {
    setDate(getTodayDate());
    setCategory('Ruck');
    setSessionType('');
    setDuration('');
    setDistanceLoad('');
    setReadiness('');
    setNotes('');
    setEditingLogId(null);
  }

  function toggleForm() {
    if (isEditing) {
      clearForm();
      setFormOpen(false);
      return;
    }

    setFormOpen((current) => !current);
  }

  function getCategoryFromRecommendation(focus: string): TrainingCategory {
    const lowerFocus = focus.toLowerCase();

    if (lowerFocus.includes('ruck')) {
      return 'Ruck';
    }

    if (lowerFocus.includes('strength')) {
      return 'Strength';
    }

    if (lowerFocus.includes('run')) {
      return 'Run';
    }

    if (lowerFocus.includes('mobility') || lowerFocus.includes('recovery')) {
      return 'Recovery';
    }

    if (lowerFocus.includes('test')) {
      return 'Test';
    }

    return 'Mobility';
  }

  function applyRecommendation() {
    const recommendation = (summary.recommendedNextSession || fallbackRecommendedSession);
    const recommendationCategory = getCategoryFromRecommendation(recommendation.focus);

    setEditingLogId(null);
    setFormOpen(true);
    setDate(getTodayDate());
    setCategory(recommendationCategory);
    setSessionType(recommendation.focus);
    setDuration('30 minutes');
    setDistanceLoad(recommendation.plan);
    setReadiness(summary.weeklyAverageReadiness === '0.0' ? '7' : summary.weeklyAverageReadiness);
    setNotes(`Recommended by Sentinel Ready: ${recommendation.reason}`);
  }


  function applyNoteStarter() {
    setNotes(getNoteStarter(category));
  }

  function improveSelectedLog(log: TrainingLog) {
    startEdit(log);

    if (getNotesQualityMessage(log.notes)) {
      setNotes(getNoteStarter(log.category));
    }
  }

  function clearSearchAndFilters() {
    setActiveFilter('All');
    setSearchQuery('');
    setSortMode('Newest');
    setShowWeakLogsOnly(false);
  }

  function validateForm() {
    const readinessNumber = Number(readiness);

    if (!date.trim() || !sessionType.trim() || !duration.trim()) {
      Alert.alert('Missing Details', 'Please enter the date, session type and duration.');
      return false;
    }

    if (!readiness.trim() || Number.isNaN(readinessNumber) || readinessNumber < 1 || readinessNumber > 10) {
      Alert.alert('Readiness Score', 'Please enter a readiness score from 1 to 10.');
      return false;
    }

    return true;
  }

  function getCurrentFormCompletionScore() {
    return getFormCompletionScore(
      getFormCompletionChecklist(date, category, sessionType, duration, distanceLoad, readiness, notes)
    );
  }

  function getSaveQualityWarningMessage() {
    const completionScore = getCurrentFormCompletionScore();
    const notesWarning = getNotesQualityMessage(notes);

    const warnings: string[] = [];

    if (completionScore < 80) {
      warnings.push(`Form completion is only ${completionScore}%.`);
    }

    if (notesWarning) {
      warnings.push(notesWarning);
    }

    if (isFatigueWatch(readiness)) {
      warnings.push('Readiness is 5 or below, so this will be marked as Fatigue Watch.');
    }

    return warnings.join('\n\n');
  }

  function handleSavePress() {
    if (!validateForm()) {
      return;
    }

    const warningMessage = getSaveQualityWarningMessage();

    if (warningMessage) {
      Alert.alert(
        'Save Quality Warning',
        `${warningMessage}\n\nDo you still want to save this log?`,
        [
          {
            text: 'Go Back',
            style: 'cancel',
          },
          {
            text: 'Save Anyway',
            onPress: () => {
              if (isEditing) {
                updateLog();
              } else {
                saveLog();
              }
            },
          },
        ]
      );

      return;
    }

    if (isEditing) {
      updateLog();
    } else {
      saveLog();
    }
  }

  function saveLog() {
    if (!validateForm()) {
      return;
    }

    const newLog: TrainingLog = {
      id: Date.now(),
      date: date.trim(),
      category,
      type: sessionType.trim(),
      duration: duration.trim(),
      distanceLoad: distanceLoad.trim() || 'No distance or load entered',
      readiness: readiness.trim(),
      notes: notes.trim() || 'No notes entered.',
    };

    setLogs([newLog, ...logs]);
    setSelectedLogId(newLog.id);
    setActiveFilter('All');
    setSearchQuery('');
    setSortMode('Newest');
    setShowWeakLogsOnly(false);
    clearForm();
    setFormOpen(false);
  }

  function startEdit(log: TrainingLog) {
    setEditingLogId(log.id);
    setSelectedLogId(log.id);
    setFormOpen(true);
    setDate(log.date);
    setCategory(log.category);
    setSessionType(log.type);
    setDuration(log.duration);
    setDistanceLoad(log.distanceLoad);
    setReadiness(log.readiness);
    setNotes(log.notes);
  }

  function updateLog() {
    if (!editingLogId) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const updatedLog: TrainingLog = {
      id: editingLogId,
      date: date.trim(),
      category,
      type: sessionType.trim(),
      duration: duration.trim(),
      distanceLoad: distanceLoad.trim() || 'No distance or load entered',
      readiness: readiness.trim(),
      notes: notes.trim() || 'No notes entered.',
    };

    setLogs((currentLogs) =>
      currentLogs.map((log) => (log.id === editingLogId ? updatedLog : log))
    );

    setSelectedLogId(editingLogId);
    setActiveFilter('All');
    setSearchQuery('');
    setSortMode('Newest');
    setShowWeakLogsOnly(false);
    clearForm();
    setFormOpen(false);
  }

  function deleteLog(id: number) {
    Alert.alert(
      'Delete Log',
      'Remove this training log?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setLogs((currentLogs) => currentLogs.filter((log) => log.id !== id));

            if (selectedLogId === id) {
              setSelectedLogId(null);
            }

            if (editingLogId === id) {
              clearForm();
            }
          },
        },
      ]
    );
  }

  function clearLogs() {
    Alert.alert(
      'Clear Logs',
      'This will remove all saved training logs from this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setLogs([]);
            setSelectedLogId(null);
            setEditingLogId(null);
            setActiveFilter('All');
            setSearchQuery('');
            setSortMode('Newest');
    setShowWeakLogsOnly(false);
            clearForm();
          },
        },
      ]
    );
  }

  function resetStarterLogs() {
    setLogs(starterLogs);
    setSelectedLogId(null);
    setEditingLogId(null);
    setActiveFilter('All');
    setSearchQuery('');
    setSortMode('Newest');
    setShowWeakLogsOnly(false);
    clearForm();
  }

  function getCategoryCount(filter: TrainingFilter) {
    if (filter === 'All') {
      return logs.length;
    }

    return logs.filter((log) => log.category === filter).length;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>TRAINING LOG</Text>
      <Text style={styles.title}>Record Session</Text>
      <Text style={styles.subtitle}>
        Log strength, endurance, ruck work, recovery notes and readiness observations. Entries save locally on this device.
      </Text>

      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.quickActionPrimary}
          onPress={() => setFormOpen(true)}
        >
          <Text style={styles.quickActionPrimaryText}>Open Form</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={applyRecommendation}
        >
          <Text style={styles.quickActionText}>Use Recommendation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={clearSearchAndFilters}
        >
          <Text style={styles.quickActionText}>Reset View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topStrip}>
        <View style={styles.topStripHeader}>
          <View>
            <Text style={styles.topStripKicker}>AT A GLANCE</Text>
            <Text style={styles.topStripTitle}>Readiness Snapshot</Text>
          </View>

          <View style={summary.fatigueWatch > 0 ? styles.topStatusWarning : styles.topStatusGood}>
            <Text style={summary.fatigueWatch > 0 ? styles.topStatusWarningText : styles.topStatusGoodText}>
              {summary.fatigueWatch > 0 ? 'Watch' : 'Ready'}
            </Text>
          </View>
        </View>

        <View style={styles.missionReadyCard}>
          <View>
            <Text style={styles.missionReadyKicker}>MISSION-READY SCORE</Text>
            <Text style={styles.missionReadyScore}>{summary.missionReadyScore || 0}/100</Text>
          </View>

          <View style={(summary.missionReadyScore || 0) < 50 ? styles.missionReadyStatusWarning : styles.missionReadyStatus}>
            <Text style={(summary.missionReadyScore || 0) < 50 ? styles.missionReadyStatusWarningText : styles.missionReadyStatusText}>
              {getMissionReadyLabel(summary.missionReadyScore || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.topMetricRow}>
          <View style={styles.topMetric}>
            <Text style={styles.topMetricValue}>{summary.averageReadiness}</Text>
            <Text style={styles.topMetricLabel}>Overall Ready</Text>
          </View>

          <View style={styles.topMetric}>
            <Text style={styles.topMetricValue}>{summary.weeklyTotal}</Text>
            <Text style={styles.topMetricLabel}>7-Day Sessions</Text>
          </View>

          <View style={styles.topMetric}>
            <Text style={styles.topMetricValue}>{summary.trainingStreak}</Text>
            <Text style={styles.topMetricLabel}>Day Streak</Text>
          </View>

          <View style={(summary.averageSessionQuality || 0) < 60 ? styles.topMetricWarning : styles.topMetric}>
            <Text style={(summary.averageSessionQuality || 0) < 60 ? styles.topMetricWarningValue : styles.topMetricValue}>
              {summary.averageSessionQuality || 0}
            </Text>
            <Text style={(summary.averageSessionQuality || 0) < 60 ? styles.topMetricWarningLabel : styles.topMetricLabel}>
              Log Quality
            </Text>
          </View>

          <View style={summary.weeklyFatigueWatch > 0 ? styles.topMetricWarning : styles.topMetric}>
            <Text style={summary.weeklyFatigueWatch > 0 ? styles.topMetricWarningValue : styles.topMetricValue}>
              {summary.weeklyFatigueWatch}
            </Text>
            <Text style={summary.weeklyFatigueWatch > 0 ? styles.topMetricWarningLabel : styles.topMetricLabel}>
              Fatigue
            </Text>
          </View>
        </View>

        <View style={styles.topRecommendation}>
          <Text style={styles.topRecommendationLabel}>Next Focus</Text>
          <Text style={styles.topRecommendationText}>{(summary.recommendedNextSession || fallbackRecommendedSession).focus}</Text>
        </View>

        <View style={styles.personalBestStrip}>
          <Text style={styles.personalBestTitle}>Personal Bests</Text>

          <View style={styles.personalBestRow}>
            <View style={styles.personalBestItem}>
              <Text style={styles.personalBestValue}>{summary.bestRuckDistance} km</Text>
              <Text style={styles.personalBestLabel}>Best Ruck</Text>
            </View>

            <View style={styles.personalBestItem}>
              <Text style={styles.personalBestValue}>{summary.bestReadiness}/10</Text>
              <Text style={styles.personalBestLabel}>Best Ready</Text>
            </View>

            <View style={styles.personalBestItem}>
              <Text style={styles.personalBestValue}>{formatMinutes(summary.longestSessionMinutes)}</Text>
              <Text style={styles.personalBestLabel}>Longest</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.summaryPanel}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryKicker}>CURRENT LOAD</Text>
            <Text style={styles.summaryTitle}>Training Summary</Text>
          </View>

          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeNumber}>{summary.averageReadiness}</Text>
            <Text style={styles.totalBadgeText}>Ready</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.trainingStreak}</Text>
            <Text style={styles.summaryLabel}>Day Streak</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.ruck}</Text>
            <Text style={styles.summaryLabel}>Ruck</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.strength}</Text>
            <Text style={styles.summaryLabel}>Strength</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.run}</Text>
            <Text style={styles.summaryLabel}>Run</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.recovery}</Text>
            <Text style={styles.summaryLabel}>Recovery</Text>
          </View>

          <View style={styles.summaryItemWarning}>
            <Text style={styles.summaryNumberWarning}>{summary.fatigueWatch}</Text>
            <Text style={styles.summaryLabelWarning}>Fatigue Watch</Text>
          </View>
        </View>
      </View>

      <View style={isEditing ? styles.editCard : styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>{isEditing ? 'Edit Training Log' : 'New Entry'}</Text>
            <Text style={styles.formSummaryText}>
              {formOpen ? 'Form open. Add, edit or quick-fill a session.' : 'Form hidden for a cleaner page view.'}
            </Text>
            {isEditing ? <Text style={styles.editHint}>Editing saved session. Press update when finished.</Text> : null}
          </View>

          <TouchableOpacity style={formOpen ? styles.closeFormButton : styles.openFormButton} onPress={toggleForm}>
            <Text style={formOpen ? styles.closeFormText : styles.openFormText}>
              {formOpen ? (isEditing ? 'Cancel Edit' : 'Close Form') : 'Open Form'}
            </Text>
          </TouchableOpacity>
        </View>

        {formOpen ? (
          <>
            <TouchableOpacity style={styles.clearFormButtonInline} onPress={clearForm}>
              <Text style={styles.clearFormText}>{isEditing ? 'Cancel Edit' : 'Clear Form'}</Text>
            </TouchableOpacity>

            <View style={styles.formChecklistCard}>
              <View style={styles.formChecklistHeader}>
                <View>
                  <Text style={styles.formChecklistKicker}>ENTRY CHECKLIST</Text>
                  <Text style={styles.formChecklistTitle}>Completion Before Save</Text>
                </View>

                <View style={getFormCompletionScore(getFormCompletionChecklist(date, category, sessionType, duration, distanceLoad, readiness, notes)) < 80 ? styles.formChecklistScoreWarning : styles.formChecklistScore}>
                  <Text style={getFormCompletionScore(getFormCompletionChecklist(date, category, sessionType, duration, distanceLoad, readiness, notes)) < 80 ? styles.formChecklistScoreTextWarning : styles.formChecklistScoreText}>
                    {getFormCompletionScore(getFormCompletionChecklist(date, category, sessionType, duration, distanceLoad, readiness, notes))}%
                  </Text>
                </View>
              </View>

              <View style={styles.formChecklistGrid}>
                {getFormCompletionChecklist(date, category, sessionType, duration, distanceLoad, readiness, notes).map((item) => (
                  <View key={item.label} style={item.complete ? styles.formChecklistItemComplete : styles.formChecklistItemMissing}>
                    <Text style={item.complete ? styles.formChecklistStatusComplete : styles.formChecklistStatusMissing}>
                      {item.complete ? '?' : '!'}
                    </Text>
                    <Text style={item.complete ? styles.formChecklistLabelComplete : styles.formChecklistLabelMissing}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.formChecklistHint}>
                Aim for 100% before saving. Better entries improve readiness, quality and weekly reports.
              </Text>

              {getCurrentFormCompletionScore() < 80 || getNotesQualityMessage(notes) ? (
                <View style={styles.saveWarningPreview}>
                  <Text style={styles.saveWarningPreviewTitle}>Save Warning Active</Text>
                  <Text style={styles.saveWarningPreviewText}>
                    This entry may trigger a warning before saving because some detail is missing or notes need improvement.
                  </Text>
                </View>
              ) : (
                <View style={styles.saveReadyPreview}>
                  <Text style={styles.saveReadyPreviewText}>Entry is ready to save.</Text>
                </View>
              )}
            </View>

        <Text style={styles.label}>Quick Fill</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFillRow}>
          {quickTemplates.map((template) => (
            <TouchableOpacity
              key={template.label}
              style={styles.quickFillButton}
              onPress={() => applyTemplate(template)}
            >
              <Text style={styles.quickFillText}>{template.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Date Completed</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#6f7d70"
          value={date}
          onChangeText={setDate}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const isActive = category === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.categoryButtonText, isActive && styles.categoryButtonTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Session Type</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: Loaded ruck, tempo run, upper body strength"
          placeholderTextColor="#6f7d70"
          value={sessionType}
          onChangeText={setSessionType}
        />

        <Text style={styles.label}>Duration</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 45 minutes"
          placeholderTextColor="#6f7d70"
          value={duration}
          onChangeText={setDuration}
        />

        <Text style={styles.label}>Distance / Load</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 8 km with 15 kg"
          placeholderTextColor="#6f7d70"
          value={distanceLoad}
          onChangeText={setDistanceLoad}
        />

        <Text style={styles.label}>Readiness Score</Text>
        <TextInput
          style={styles.input}
          placeholder="1 to 10"
          placeholderTextColor="#6f7d70"
          value={readiness}
          onChangeText={setReadiness}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Notes</Text>

        <View style={styles.notesSuggestionBox}>
          <Text style={styles.notesSuggestionTitle}>Notes Helper</Text>
          <Text style={styles.notesSuggestionText}>{getNotesSuggestion(category)}</Text>

          <TouchableOpacity style={styles.noteStarterButton} onPress={applyNoteStarter}>
            <Text style={styles.noteStarterText}>Use Note Starter</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, styles.notes]}
          placeholder="How did the session feel?"
          placeholderTextColor="#6f7d70"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {getNotesQualityMessage(notes) ? (
          <View style={styles.notesQualityBox}>
            <Text style={styles.notesQualityTitle}>Notes Quality Check</Text>
            <Text style={styles.notesQualityText}>{getNotesQualityMessage(notes)}</Text>
          </View>
        ) : (
          <View style={styles.notesQualityGoodBox}>
            <Text style={styles.notesQualityGoodText}>Good note detail recorded.</Text>
          </View>
        )}

        <TouchableOpacity style={isEditing ? styles.updateButton : styles.button} onPress={handleSavePress}>
          <Text style={styles.buttonText}>{isEditing ? 'Update Training Log' : 'Save Training Log'}</Text>
        </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          <Text style={styles.sectionSubtitle}>
            Showing {filteredLogs.length} of {logs.length} saved logs
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={resetStarterLogs}>
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={clearLogs}>
            <Text style={styles.dangerButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedLog ? (
        <View style={isFatigueWatch(selectedLog.readiness) ? styles.detailCardWarning : styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailKicker}>SESSION DETAIL</Text>
              <Text style={styles.detailTitle}>{selectedLog.type}</Text>
              <Text style={styles.detailSubtitle}>{selectedLog.date} � {selectedLog.category}</Text>
            </View>

            <TouchableOpacity style={styles.closeDetailButton} onPress={() => setSelectedLogId(null)}>
              <Text style={styles.closeDetailText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailNumber}>{selectedLog.duration}</Text>
              <Text style={styles.detailLabel}>Duration</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailNumber}>{selectedLog.readiness}/10</Text>
              <Text style={styles.detailLabel}>{getReadinessLabel(selectedLog.readiness)}</Text>
            </View>
          </View>

          <View style={calculateSessionQuality(selectedLog) < 60 ? styles.detailQualityWarning : styles.detailQuality}>
            <Text style={calculateSessionQuality(selectedLog) < 60 ? styles.detailQualityScoreWarning : styles.detailQualityScore}>
              {calculateSessionQuality(selectedLog)}/100
            </Text>
            <Text style={calculateSessionQuality(selectedLog) < 60 ? styles.detailQualityTextWarning : styles.detailQualityText}>
              Session Quality: {getSessionQualityLabel(calculateSessionQuality(selectedLog))}
            </Text>
            <Text style={calculateSessionQuality(selectedLog) < 60 ? styles.detailQualityTipWarning : styles.detailQualityTip}>
              {getSessionQualityTip(selectedLog)}
            </Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Distance / Load</Text>
            <Text style={styles.detailBlockText}>{selectedLog.distanceLoad}</Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Notes</Text>
            <Text style={styles.detailBlockText}>{selectedLog.notes}</Text>
          </View>

          <View style={styles.detailNotesHelper}>
            <Text style={styles.detailNotesHelperTitle}>What Good Notes Could Include</Text>
            <Text style={styles.detailNotesHelperText}>{getNotesSuggestion(selectedLog.category)}</Text>
          </View>

          {getNotesQualityMessage(selectedLog.notes) ? (
            <View style={styles.detailNotesWarning}>
              <Text style={styles.detailNotesWarningTitle}>Notes Quality Check</Text>
              <Text style={styles.detailNotesWarningText}>{getNotesQualityMessage(selectedLog.notes)}</Text>
            </View>
          ) : null}

          <View style={styles.detailActionRow}>
            <TouchableOpacity style={styles.editDetailButton} onPress={() => startEdit(selectedLog)}>
              <Text style={styles.editDetailText}>Edit This Log</Text>
            </TouchableOpacity>

            {logNeedsImprovement(selectedLog) ? (
              <TouchableOpacity style={styles.improveDetailButton} onPress={() => improveSelectedLog(selectedLog)}>
                <Text style={styles.improveDetailText}>Improve Log</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.reportBox}>
            <Text style={styles.reportTitle}>Export-Ready Report</Text>
            <Text style={styles.reportHelp}>
              Press and hold the report text below to copy it into WhatsApp, notes, email or a formal report.
            </Text>

            <TextInput
              style={styles.reportInput}
              value={buildTrainingReport(selectedLog)}
              multiline
              editable={false}
              selectTextOnFocus
            />
          </View>

          {isFatigueWatch(selectedLog.readiness) ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Fatigue Watch: this session shows reduced readiness. Consider recovery, mobility, sleep, hydration or reduced training load.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.manageLogsCard}>
        <View style={styles.manageLogsHeader}>
          <View>
            <Text style={styles.manageLogsKicker}>MANAGE LOGS</Text>
            <Text style={styles.manageLogsTitle}>Search, Sort & Filter</Text>
          </View>

          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearchAndFilters}>
            <Text style={styles.clearSearchText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weakLogsControl}>
          <View style={styles.weakLogsTextBlock}>
            <Text style={styles.weakLogsTitle}>Improve Weak Logs</Text>
            <Text style={styles.weakLogsSubtitle}>
              Show sessions with weak notes or missing date, duration, load or session details.
            </Text>
          </View>

          <TouchableOpacity
            style={showWeakLogsOnly ? styles.weakLogsButtonActive : styles.weakLogsButton}
            onPress={() => setShowWeakLogsOnly((current) => !current)}
          >
            <Text style={showWeakLogsOnly ? styles.weakLogsButtonTextActive : styles.weakLogsButtonText}>
              {showWeakLogsOnly ? 'Showing Weak' : 'Show Weak'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.manageSection}>
          <Text style={styles.manageLabel}>Search</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search date, ruck, run, notes, load, readiness..."
            placeholderTextColor="#6f7d70"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.manageSection}>
          <Text style={styles.manageLabel}>Sort</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
            {sortModes.map((mode) => {
              const isActive = sortMode === mode;

              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.sortButton, isActive && styles.sortButtonActive]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text style={[styles.sortText, isActive && styles.sortTextActive]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.manageSection}>
          <Text style={styles.manageLabel}>Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterButton, isActive && styles.filterButtonActive]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {filter}
                  </Text>
                  <Text style={[styles.filterCount, isActive && styles.filterCountActive]}>
                    {getCategoryCount(filter)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.section}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No logs found</Text>
            <Text style={styles.emptyText}>
              No saved logs match the current search or filter. Clear the search or add a new session.
            </Text>
          </View>
        ) : (
          filteredLogs.map((log) => {
            const fatigueWatch = isFatigueWatch(log.readiness);
            const isSelected = selectedLogId === log.id;
            const currentlyEditing = editingLogId === log.id;

            const logRuckDistance = extractKilometres(log.distanceLoad);
            const logReadiness = getReadinessNumber(log.readiness);
            const logMinutes = extractMinutes(log.duration);

            const isBestRuck =
              log.category === 'Ruck' &&
              summary.bestRuckDistance > 0 &&
              logRuckDistance === summary.bestRuckDistance;

            const isBestReadiness =
              summary.bestReadiness > 0 &&
              logReadiness === summary.bestReadiness;

            const isLongestSession =
              summary.longestSessionMinutes > 0 &&
              logMinutes === summary.longestSessionMinutes;

            const sessionQualityScore = calculateSessionQuality(log);
            const sessionQualityLabel = getSessionQualityLabel(sessionQualityScore);

            return (
              <View key={log.id} style={[styles.logCard, fatigueWatch && styles.logCardWarning, isSelected && styles.logCardSelected, currentlyEditing && styles.logCardEditing]}>
                <View style={styles.logTopRow}>
                  <View style={styles.logTitleBlock}>
                    <View style={styles.logTitleRow}>
                      <Text style={styles.logTitle}>{log.type}</Text>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{log.category}</Text>
                      </View>
                    </View>

                    <Text style={styles.logMeta}>{log.date} � {log.duration}</Text>
                  </View>

                  <View style={fatigueWatch ? styles.warningPill : styles.statusPill}>
                    <Text style={fatigueWatch ? styles.warningPillText : styles.status}>
                      {fatigueWatch ? 'Fatigue' : 'Saved'}
                    </Text>
                  </View>
                </View>

                <View style={styles.compactDataRow}>
                  <View style={styles.compactDataItem}>
                    <Text style={styles.compactDataLabel}>Load</Text>
                    <Text style={styles.compactDataText}>{log.distanceLoad}</Text>
                  </View>

                  <View style={styles.compactDataItem}>
                    <Text style={styles.compactDataLabel}>Readiness</Text>
                    <Text style={[styles.compactDataText, fatigueWatch && styles.readinessTextWarning]}>
                      {log.readiness}/10
                    </Text>
                  </View>
                </View>

                <View style={sessionQualityScore < 60 ? styles.qualityBoxWarning : styles.qualityBox}>
                  <View style={styles.qualityHeader}>
                    <Text style={sessionQualityScore < 60 ? styles.qualityScoreWarning : styles.qualityScore}>
                      {sessionQualityScore}/100
                    </Text>
                    <Text style={sessionQualityScore < 60 ? styles.qualityLabelWarning : styles.qualityLabel}>
                      {sessionQualityLabel}
                    </Text>
                  </View>

                  <Text style={sessionQualityScore < 60 ? styles.qualityTextWarning : styles.qualityText}>
                    Session Quality Score
                  </Text>

                  <Text style={sessionQualityScore < 60 ? styles.qualityTipWarning : styles.qualityTip}>
                    {getSessionQualityTip(log)}
                  </Text>
                </View>

                {fatigueWatch ? (
                  <View style={styles.warningBoxCompact}>
                    <Text style={styles.warningText}>
                      Fatigue Watch: consider recovery or reduced intensity.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.logNoteCompact} numberOfLines={2}>
                  {log.notes}
                </Text>

                {getNotesQualityMessage(log.notes) ? (
                  <View style={styles.logNoteQualityPill}>
                    <Text style={styles.logNoteQualityText}>Improve Notes</Text>
                  </View>
                ) : null}

                <View style={styles.compactActionRow}>
                  <TouchableOpacity style={styles.viewDetailsButton} onPress={() => setSelectedLogId(log.id)}>
                    <Text style={styles.viewDetailsText}>{isSelected ? 'Selected' : 'Details'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.editButton} onPress={() => startEdit(log)}>
                    <Text style={styles.editButtonText}>{currentlyEditing ? 'Editing' : 'Edit'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deletePill} onPress={() => deleteLog(log.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setFormOpen(true)}
      >
        <Text style={styles.floatingAddText}>+ Add Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07110c',
  },
  content: {
    padding: 20,
    gap: 18,
  },
  kicker: {
    color: '#8fbf8f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#f2f5ef',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#aeb8aa',
    fontSize: 15,
    lineHeight: 22,
  },
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionPrimary: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  quickActionPrimaryText: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  quickActionButton: {
    backgroundColor: '#102018',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#35523e',
  },
  quickActionText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  topStrip: {
    backgroundColor: '#0d1812',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#35523e',
    gap: 14,
  },
  topStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  topStripKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  topStripTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  topStatusGood: {
    backgroundColor: '#102d1a',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topStatusGoodText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  topStatusWarning: {
    backgroundColor: '#2a1a0d',
    borderWidth: 1,
    borderColor: '#7a4a1f',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topStatusWarningText: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  missionReadyCard: {
    backgroundColor: '#102018',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#35523e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  missionReadyKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  missionReadyScore: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  missionReadyStatus: {
    backgroundColor: '#102d1a',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  missionReadyStatusText: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  missionReadyStatusWarning: {
    backgroundColor: '#2a1a0d',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  missionReadyStatusWarningText: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  topMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topMetric: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  topMetricWarning: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: '#21140b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  topMetricValue: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
  },
  topMetricLabel: {
    color: '#aeb8aa',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  topMetricWarningValue: {
    color: '#ffb86b',
    fontSize: 23,
    fontWeight: '900',
  },
  topMetricWarningLabel: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  topRecommendation: {
    backgroundColor: '#102018',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#24382c',
  },
  topRecommendationLabel: {
    color: '#8fbf8f',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  topRecommendationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  personalBestStrip: {
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
    gap: 10,
  },
  personalBestTitle: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  personalBestRow: {
    flexDirection: 'row',
    gap: 8,
  },
  personalBestItem: {
    flex: 1,
    backgroundColor: '#0d1812',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#203529',
  },
  personalBestValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  personalBestLabel: {
    color: '#aeb8aa',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryPanel: {
    backgroundColor: '#102018',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2d4d37',
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  totalBadge: {
    backgroundColor: '#91e6a3',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  totalBadgeNumber: {
    color: '#07110c',
    fontSize: 24,
    fontWeight: '900',
  },
  totalBadgeText: {
    color: '#07110c',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    width: '47%',
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  summaryItemWarning: {
    width: '47%',
    backgroundColor: '#21140b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  summaryNumber: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  summaryNumberWarning: {
    color: '#ffb86b',
    fontSize: 26,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#aeb8aa',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryLabelWarning: {
    color: '#ffb86b',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#102018',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#24382c',
    gap: 10,
  },
  editCard: {
    backgroundColor: '#102018',
    borderRadius: 22,
    padding: 18,
    borderWidth: 2,
    borderColor: '#91e6a3',
    gap: 10,
  },
  editHint: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  formSummaryText: {
    color: '#aeb8aa',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  openFormButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  openFormText: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  closeFormButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeFormText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  clearFormButtonInline: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  formChecklistCard: {
    backgroundColor: '#07110c',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
    gap: 12,
  },
  formChecklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  formChecklistKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  formChecklistTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  formChecklistScore: {
    backgroundColor: '#102d1a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2f6b3c',
  },
  formChecklistScoreWarning: {
    backgroundColor: '#2a1a0d',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  formChecklistScoreText: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
  },
  formChecklistScoreTextWarning: {
    color: '#ffb86b',
    fontSize: 13,
    fontWeight: '900',
  },
  formChecklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formChecklistItemComplete: {
    backgroundColor: '#102d1a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formChecklistItemMissing: {
    backgroundColor: '#21140b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formChecklistStatusComplete: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  formChecklistStatusMissing: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
  },
  formChecklistLabelComplete: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
  },
  formChecklistLabelMissing: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '900',
  },
  formChecklistHint: {
    color: '#aeb8aa',
    fontSize: 12,
    lineHeight: 18,
  },
  saveWarningPreview: {
    backgroundColor: '#21140b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    gap: 4,
  },
  saveWarningPreviewTitle: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  saveWarningPreviewText: {
    color: '#ffb86b',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  saveReadyPreview: {
    backgroundColor: '#102d1a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2f6b3c',
  },
  saveReadyPreviewText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  clearFormButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearFormText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  label: {
    color: '#8fbf8f',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  quickFillRow: {
    gap: 8,
    paddingRight: 20,
  },
  quickFillButton: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickFillText: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#26382c',
    backgroundColor: '#07110c',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  categoryButtonActive: {
    backgroundColor: '#91e6a3',
    borderColor: '#91e6a3',
  },
  categoryButtonText: {
    color: '#aeb8aa',
    fontSize: 13,
    fontWeight: '900',
  },
  categoryButtonTextActive: {
    color: '#07110c',
  },
  input: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#26382c',
    borderRadius: 14,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  notes: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  notesSuggestionBox: {
    backgroundColor: '#07110c',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26382c',
    gap: 4,
  },
  notesSuggestionTitle: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  notesSuggestionText: {
    color: '#aeb8aa',
    fontSize: 13,
    lineHeight: 19,
  },
  noteStarterButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  noteStarterText: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  notesQualityBox: {
    backgroundColor: '#21140b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    gap: 4,
  },
  notesQualityTitle: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  notesQualityText: {
    color: '#ffb86b',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  notesQualityGoodBox: {
    backgroundColor: '#102d1a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2f6b3c',
  },
  notesQualityGoodText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  button: {
    backgroundColor: '#91e6a3',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButton: {
    backgroundColor: '#c8f7d0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#07110c',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#f2f5ef',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#7f8d80',
    fontSize: 13,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#693434',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dangerButtonText: {
    color: '#ff9c9c',
    fontSize: 12,
    fontWeight: '900',
  },
  detailCard: {
    backgroundColor: '#102018',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#35523e',
    gap: 14,
  },
  detailCardWarning: {
    backgroundColor: '#171207',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  detailSubtitle: {
    color: '#aeb8aa',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  closeDetailButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeDetailText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  detailQuality: {
    backgroundColor: '#102d1a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2f6b3c',
  },
  detailQualityWarning: {
    backgroundColor: '#21140b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  detailQualityScore: {
    color: '#91e6a3',
    fontSize: 24,
    fontWeight: '900',
  },
  detailQualityScoreWarning: {
    color: '#ffb86b',
    fontSize: 24,
    fontWeight: '900',
  },
  detailQualityText: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  detailQualityTextWarning: {
    color: '#ffb86b',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  detailQualityTip: {
    color: '#aeb8aa',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  detailQualityTipWarning: {
    color: '#ffb86b',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 8,
  },
  detailNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  detailLabel: {
    color: '#aeb8aa',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  detailBlock: {
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  detailBlockLabel: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailBlockText: {
    color: '#dfe8da',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  detailNotesHelper: {
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
    gap: 5,
  },
  detailNotesHelperTitle: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailNotesHelperText: {
    color: '#aeb8aa',
    fontSize: 13,
    lineHeight: 19,
  },
  detailNotesWarning: {
    backgroundColor: '#21140b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    gap: 5,
  },
  detailNotesWarningTitle: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailNotesWarningText: {
    color: '#ffb86b',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  detailActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editDetailButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  improveDetailButton: {
    backgroundColor: '#ffb86b',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  improveDetailText: {
    color: '#07110c',
    fontSize: 13,
    fontWeight: '900',
  },
  editDetailText: {
    color: '#07110c',
    fontSize: 13,
    fontWeight: '900',
  },
  reportBox: {
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
    gap: 8,
  },
  reportTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  reportHelp: {
    color: '#aeb8aa',
    fontSize: 12,
    lineHeight: 18,
  },
  reportInput: {
    backgroundColor: '#0d1812',
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 14,
    padding: 12,
    color: '#dfe8da',
    fontSize: 13,
    lineHeight: 19,
    minHeight: 190,
    textAlignVertical: 'top',
  },
  manageLogsCard: {
    backgroundColor: '#102018',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#24382c',
    gap: 16,
  },
  manageLogsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  manageLogsKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  manageLogsTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  manageSection: {
    gap: 8,
  },
  weakLogsControl: {
    backgroundColor: '#07110c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26382c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  weakLogsTextBlock: {
    flex: 1,
  },
  weakLogsTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  weakLogsSubtitle: {
    color: '#aeb8aa',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  weakLogsButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  weakLogsButtonActive: {
    backgroundColor: '#ffb86b',
    borderWidth: 1,
    borderColor: '#ffb86b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  weakLogsButtonText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  weakLogsButtonTextActive: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  manageLabel: {
    color: '#8fbf8f',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  searchCard: {
    backgroundColor: '#102018',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24382c',
    gap: 10,
  },
  searchInput: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#26382c',
    borderRadius: 14,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  clearSearchButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  clearSearchText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  sortCard: {
    backgroundColor: '#102018',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24382c',
    gap: 10,
  },
  sortRow: {
    gap: 8,
    paddingRight: 20,
  },
  sortButton: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortButtonActive: {
    backgroundColor: '#91e6a3',
    borderColor: '#91e6a3',
  },
  sortText: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
  },
  sortTextActive: {
    color: '#07110c',
  },
  filterRow: {
    gap: 8,
    paddingRight: 20,
  },
  filterButton: {
    backgroundColor: '#0d1812',
    borderWidth: 1,
    borderColor: '#203529',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#91e6a3',
    borderColor: '#91e6a3',
  },
  filterText: {
    color: '#aeb8aa',
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#07110c',
  },
  filterCount: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  filterCountActive: {
    color: '#07110c',
  },
  section: {
    gap: 12,
  },
  logCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#203529',
    gap: 10,
  },
  logCardWarning: {
    backgroundColor: '#171207',
    borderColor: '#7a4a1f',
  },
  logCardSelected: {
    borderColor: '#91e6a3',
  },
  logCardEditing: {
    borderColor: '#c8f7d0',
    borderWidth: 2,
  },
  logMain: {
    flex: 1,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  logTitleBlock: {
    flex: 1,
  },
  logMeta: {
    color: '#7f8d80',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  compactDataRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compactDataItem: {
    flex: 1,
    backgroundColor: '#07110c',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  compactDataLabel: {
    color: '#8fbf8f',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  compactDataText: {
    color: '#dfe8da',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  qualityBox: {
    backgroundColor: '#102d1a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    gap: 4,
  },
  qualityBoxWarning: {
    backgroundColor: '#21140b',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    gap: 4,
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  qualityScore: {
    color: '#91e6a3',
    fontSize: 16,
    fontWeight: '900',
  },
  qualityScoreWarning: {
    color: '#ffb86b',
    fontSize: 16,
    fontWeight: '900',
  },
  qualityLabel: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  qualityLabelWarning: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  qualityText: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '800',
  },
  qualityTextWarning: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '800',
  },
  qualityTip: {
    color: '#aeb8aa',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  qualityTipWarning: {
    color: '#ffb86b',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  warningBoxCompact: {
    backgroundColor: '#2a1a0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    padding: 9,
  },
  logNoteCompact: {
    color: '#7f8d80',
    fontSize: 12,
    lineHeight: 18,
  },
  logNoteQualityPill: {
    backgroundColor: '#21140b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    alignSelf: 'flex-start',
  },
  logNoteQualityText: {
    color: '#ffb86b',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  compactActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  logTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  categoryPill: {
    backgroundColor: '#1f3125',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#35523e',
  },
  categoryPillText: {
    color: '#91e6a3',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  logText: {
    color: '#aeb8aa',
    fontSize: 14,
    marginTop: 5,
  },
  readinessText: {
    color: '#dfe8da',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  readinessTextWarning: {
    color: '#ffb86b',
  },
  warningBox: {
    backgroundColor: '#2a1a0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    padding: 10,
    marginTop: 8,
  },
  warningText: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  logNote: {
    color: '#7f8d80',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  logButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  viewDetailsButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#c8f7d0',
    fontSize: 12,
    fontWeight: '900',
  },
  improveButton: {
    backgroundColor: '#ffb86b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  improveButtonText: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  logActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    backgroundColor: '#102d1a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2f6b3c',
  },
  status: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  warningPill: {
    backgroundColor: '#2a1a0d',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  warningPillText: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  deletePill: {
    backgroundColor: '#2d1010',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#693434',
  },
  deleteText: {
    color: '#ff9c9c',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#203529',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  floatingAddButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#c8f7d0',
  },
  floatingAddText: {
    color: '#07110c',
    fontSize: 14,
    fontWeight: '900',
  },
});

