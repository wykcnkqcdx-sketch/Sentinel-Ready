import type { BodyCompEntry } from '@/src/types/bodyComp';

export type BmiStatus = 'underweight' | 'optimal' | 'overweight' | 'obese';

export function getBmiStatus(bmi: number): BmiStatus {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 27.5) return 'optimal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function getBmiLabel(status: BmiStatus): string {
  const labels: Record<BmiStatus, string> = {
    underweight: 'Underweight',
    optimal: 'DFITT Optimal',
    overweight: 'Overweight',
    obese: 'Obese',
  };
  return labels[status];
}

export function getBmiColor(status: BmiStatus): string {
  const colors: Record<BmiStatus, string> = {
    optimal: '#FC4C02',
    underweight: '#4a9eff',
    overweight: '#FFB86B',
    obese: '#ff6b6b',
  };
  return colors[status];
}

export type SkinfoldStatus = 'excellent' | 'good' | 'average' | 'below';

export function getSkinfoldStatus(mm: number, gender: 'M' | 'F'): SkinfoldStatus {
  if (gender === 'M') {
    if (mm < 40) return 'excellent';
    if (mm < 60) return 'good';
    if (mm < 80) return 'average';
    return 'below';
  }
  if (mm < 50) return 'excellent';
  if (mm < 70) return 'good';
  if (mm < 90) return 'average';
  return 'below';
}

export function getSkinfoldLabel(status: SkinfoldStatus): string {
  const labels: Record<SkinfoldStatus, string> = {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    below: 'Below Standard',
  };
  return labels[status];
}

export function getSkinfoldColor(status: SkinfoldStatus): string {
  const colors: Record<SkinfoldStatus, string> = {
    excellent: '#FC4C02',
    good: '#35C759',
    average: '#FFB86B',
    below: '#ff6b6b',
  };
  return colors[status];
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function weightSeries(entries: BodyCompEntry[], n: number): number[] {
  return entries.slice(0, n).map((e) => e.weightKg).reverse();
}
