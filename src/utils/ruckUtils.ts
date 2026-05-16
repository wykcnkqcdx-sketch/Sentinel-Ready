import type { RouteData } from './trainingLogCore';

export function calculateRuckDifficulty(route: RouteData): { score: number; label: string; estimatedHours: number } {
  if (!route.distanceKm) return { score: 0, label: 'Unknown', estimatedHours: 0 };

  // Base walking speed: ~5 km/h
  const baseTimeHours = route.distanceKm / 5;
  
  // Naismith's rule: Add 1 hour for every 600 meters of ascent
  const elevationTimeHours = (route.elevationGainMeters || 0) / 600;
  
  // Load factor: Assume 1.5% slower per kg of pack weight
  const weightFactor = 1 + ((route.packWeightKg || 0) * 0.015);

  const estimatedHours = (baseTimeHours + elevationTimeHours) * weightFactor;
  const score = Math.round(estimatedHours * 20); // Scale to an arbitrary 0-100+ score

  let label = 'Light';
  if (score >= 80) label = 'Epic';
  else if (score >= 50) label = 'Hard';
  else if (score >= 30) label = 'Moderate';
  else if (score >= 15) label = 'Steady';

  return { score, label, estimatedHours: Number(estimatedHours.toFixed(2)) };
}
