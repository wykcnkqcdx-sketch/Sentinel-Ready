import type { TrainingLog } from '@/src/screens/TrainingContext';
import type { StravaActivity } from '@/src/services/stravaApi';

function mapStravaType(type: string): TrainingLog['category'] {
  if (['Run', 'TrailRun', 'VirtualRun'].includes(type)) return 'Run';
  if (['Hike', 'Walk', 'BackpackingTrip'].includes(type)) return 'Hiking';
  if (
    ['WeightTraining', 'Crossfit', 'Workout', 'RockClimbing'].includes(type)
  )
    return type === 'Workout' || type === 'Crossfit' ? 'Resistance' : 'Strength';
  if (['Yoga', 'Pilates', 'Stretching'].includes(type)) return 'Mobility';
  return 'Strength';
}

export function stravaActivityToLog(
  activity: StravaActivity,
): Omit<TrainingLog, 'id'> {
  const mins = Math.round(activity.moving_time / 60);
  const km = (activity.distance / 1000).toFixed(2);
  const elev = Math.round(activity.total_elevation_gain);

  const distanceParts = [`${km} km`];
  if (elev > 10) distanceParts.push(`${elev}m elevation`);
  const distanceLoad = distanceParts.join(' · ');

  const avgHr = activity.average_heartrate;
  const hrPart = avgHr ? ` · avg HR ${Math.round(avgHr)} bpm` : '';
  const elevPart = elev > 0 ? ` · ${elev}m gain` : '';
  const notes = `Strava: ${activity.name}${hrPart}${elevPart}`;

  return {
    date: activity.start_date.slice(0, 10),
    category: mapStravaType(activity.type),
    type: activity.sport_type || activity.type,
    duration: `${mins} minutes`,
    distanceLoad,
    readiness: '',
    notes,
  };
}
