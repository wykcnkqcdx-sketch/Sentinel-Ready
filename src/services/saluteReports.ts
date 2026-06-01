import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sentinel_salute_reports';

export type SaluteReportDraft = {
  size: string;
  activity: string;
  location: string;
  unit: string;
  time: string;
  equipment: string;
  notes: string;
};

export type SaluteReport = SaluteReportDraft & {
  id: string;
  createdAt: string;
};

export const EMPTY_SALUTE_DRAFT: SaluteReportDraft = {
  size: '',
  activity: '',
  location: '',
  unit: '',
  time: '',
  equipment: '',
  notes: '',
};

function createReportId() {
  return `salute-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function clean(value: string) {
  return value.trim();
}

export function normalizeSaluteDraft(draft: SaluteReportDraft): SaluteReportDraft {
  return {
    size: clean(draft.size),
    activity: clean(draft.activity),
    location: clean(draft.location),
    unit: clean(draft.unit),
    time: clean(draft.time),
    equipment: clean(draft.equipment),
    notes: clean(draft.notes),
  };
}

export function isSaluteDraftFileable(draft: SaluteReportDraft) {
  const normalized = normalizeSaluteDraft(draft);
  return Boolean(normalized.size || normalized.activity || normalized.location || normalized.unit || normalized.equipment);
}

export function createSaluteReport(draft: SaluteReportDraft, now = new Date()): SaluteReport {
  const normalized = normalizeSaluteDraft(draft);
  return {
    ...normalized,
    id: createReportId(),
    createdAt: now.toISOString(),
    time: normalized.time || now.toISOString(),
  };
}

export function formatSaluteReport(report: SaluteReport) {
  const filed = new Date(report.createdAt).toLocaleString();
  return [
    'SALUTE REPORT',
    `Filed: ${filed}`,
    '',
    `S - Size: ${report.size || 'Unknown'}`,
    `A - Activity: ${report.activity || 'Unknown'}`,
    `L - Location: ${report.location || 'Unknown'}`,
    `U - Unit: ${report.unit || 'Unknown'}`,
    `T - Time: ${report.time || 'Unknown'}`,
    `E - Equipment: ${report.equipment || 'Unknown'}`,
    report.notes ? '' : null,
    report.notes ? `Notes: ${report.notes}` : null,
  ].filter((line): line is string => line != null).join('\n');
}

function isReport(value: unknown): value is SaluteReport {
  if (typeof value !== 'object' || value === null) return false;
  const report = value as Partial<SaluteReport>;
  return (
    typeof report.id === 'string' &&
    typeof report.createdAt === 'string' &&
    typeof report.size === 'string' &&
    typeof report.activity === 'string' &&
    typeof report.location === 'string' &&
    typeof report.unit === 'string' &&
    typeof report.time === 'string' &&
    typeof report.equipment === 'string' &&
    typeof report.notes === 'string'
  );
}

export async function loadSaluteReports(): Promise<SaluteReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isReport).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function saveSaluteReports(reports: SaluteReport[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export async function addSaluteReport(draft: SaluteReportDraft): Promise<SaluteReport[]> {
  const report = createSaluteReport(draft);
  const existing = await loadSaluteReports();
  const updated = [report, ...existing];
  await saveSaluteReports(updated);
  return updated;
}

export async function deleteSaluteReport(id: string): Promise<SaluteReport[]> {
  const existing = await loadSaluteReports();
  const updated = existing.filter((report) => report.id !== id);
  await saveSaluteReports(updated);
  return updated;
}
