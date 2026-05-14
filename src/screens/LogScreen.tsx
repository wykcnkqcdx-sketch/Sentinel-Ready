import { ScrollView, Text } from 'react-native';

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
    distanceLoad: 'Squat - Press - Pull - Hinge - Carry',
    readiness: '8',
    notes: 'Keep form strict. Avoid grinding reps. Leave one or two reps in reserve.',
  },
  {
    label: 'Recovery',
    category: 'Recovery',
    sessionType: 'Recovery Mobility',
    duration: '25 minutes',
    distanceLoad: 'Hips - Calves - Hamstrings - Shoulders',
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
    distanceLoad: '12 km - 18 kg',
    readiness: '7',
    notes: 'Moderate effort. Good pace. Recovery required.',
  },
  {
    id: 2,
    date: getTodayDate(),
    category: 'Strength',
    type: 'Strength Session',
    duration: '55 min',
    distanceLoad: 'Squat - Press - Pull - Hinge',
    readiness: '8',
    notes: 'Controlled intensity. Solid movement quality.',
  },
  {
    id: 3,
    date: getTodayDate(),
    category: 'Recovery',
    type: 'Recovery Work',
    duration: '25 min',
    distanceLoad: 'Mobility - Stretching',
    readiness: '5',
    notes: 'Light recovery session. Hydration focus.',
  },
];

function isWithinLastSevenDays(dateString: string) {
  const date = new Date(dateString).getTime();
  const now = new Date().getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return (now - date) <= sevenDays;
}

export function calculateTrainingStreak(logs: TrainingLog[]) {
  const loggedDates = new Set(logs.map(log => log.date));
  return loggedDates.size;
}

export default function LogScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#07110c' }}>
      <Text style={{ color: '#fff', padding: 20 }}>Log Screen Content Placeholder</Text>
    </ScrollView>
  );
}