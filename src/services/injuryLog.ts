import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sentinel_injury_logs';

export type InjuryStatus = 'active' | 'recovering' | 'healed';

export type InjuryEntryDraft = {
  bodyPart: string;
  severity: string;
  status: InjuryStatus;
  date: string;
  notes: string;
};

export type InjuryEntry = {
  id: string;
  bodyPart: string;
  severity: number;
  status: InjuryStatus;
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_INJURY_DRAFT: InjuryEntryDraft = {
  bodyPart: '',
  severity: '3',
  status: 'active',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

function createId() {
  return `injury-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function clampSeverity(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function clean(value: string) {
  return value.trim();
}

export function normalizeInjuryDraft(draft: InjuryEntryDraft): InjuryEntryDraft {
  return {
    bodyPart: clean(draft.bodyPart),
    severity: String(clampSeverity(draft.severity)),
    status: draft.status,
    date: clean(draft.date) || new Date().toISOString().slice(0, 10),
    notes: clean(draft.notes),
  };
}

export function isInjuryDraftFileable(draft: InjuryEntryDraft) {
  const normalized = normalizeInjuryDraft(draft);
  return Boolean(normalized.bodyPart && normalized.date);
}

export function createInjuryEntry(draft: InjuryEntryDraft, now = new Date()): InjuryEntry {
  const normalized = normalizeInjuryDraft(draft);
  return {
    id: createId(),
    bodyPart: normalized.bodyPart,
    severity: clampSeverity(normalized.severity),
    status: normalized.status,
    date: normalized.date,
    notes: normalized.notes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function isInjuryEntry(value: unknown): value is InjuryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<InjuryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.bodyPart === 'string' &&
    typeof entry.severity === 'number' &&
    (entry.status === 'active' || entry.status === 'recovering' || entry.status === 'healed') &&
    typeof entry.date === 'string' &&
    typeof entry.notes === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.updatedAt === 'string'
  );
}

export function summarizeInjuryEntries(entries: InjuryEntry[]) {
  const relevant = entries
    .filter((entry) => entry.status !== 'healed')
    .sort((a, b) => b.severity - a.severity || b.date.localeCompare(a.date));

  if (relevant.length === 0) return '';

  return relevant
    .map((entry) => {
      const status = entry.status === 'active' ? 'active' : 'recovering';
      const note = entry.notes ? ` - ${entry.notes}` : '';
      return `${entry.bodyPart} ${status} injury severity ${entry.severity}/5${note}`;
    })
    .join('; ');
}

export function getInjuryRisk(entries: InjuryEntry[]) {
  const active = entries.filter((entry) => entry.status === 'active');
  const recovering = entries.filter((entry) => entry.status === 'recovering');
  const maxSeverity = Math.max(0, ...entries.filter((entry) => entry.status !== 'healed').map((entry) => entry.severity));
  if (active.some((entry) => entry.severity >= 4) || active.length >= 2) return 'high';
  if (maxSeverity >= 3 || active.length > 0 || recovering.length >= 2) return 'monitor';
  return 'clear';
}

export async function loadInjuryEntries(): Promise<InjuryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isInjuryEntry).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveInjuryEntries(entries: InjuryEntry[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addInjuryEntry(draft: InjuryEntryDraft): Promise<InjuryEntry[]> {
  const entry = createInjuryEntry(draft);
  const existing = await loadInjuryEntries();
  const updated = [entry, ...existing];
  await saveInjuryEntries(updated);
  return updated;
}

export async function updateInjuryStatus(id: string, status: InjuryStatus): Promise<InjuryEntry[]> {
  const existing = await loadInjuryEntries();
  const now = new Date().toISOString();
  const updated = existing.map((entry) => entry.id === id ? { ...entry, status, updatedAt: now } : entry);
  await saveInjuryEntries(updated);
  return updated;
}

export async function deleteInjuryEntry(id: string): Promise<InjuryEntry[]> {
  const existing = await loadInjuryEntries();
  const updated = existing.filter((entry) => entry.id !== id);
  await saveInjuryEntries(updated);
  return updated;
}
