import AsyncStorage from '@react-native-async-storage/async-storage';

export type VaultTag = 'INTEL' | 'TRAINING' | 'EQUIPMENT' | 'LESSON' | 'ADMIN';

export type VaultEntry = {
  id: number;
  date: string;
  title: string;
  body: string;
  tag: VaultTag;
};

export const VAULT_TAG_COLORS: Record<VaultTag, string> = {
  INTEL:    '#3fc8e4',
  TRAINING: '#91e6a3',
  EQUIPMENT:'#ffaa44',
  LESSON:   '#c097f7',
  ADMIN:    '#7a9480',
};

const STORAGE_KEY = 'sentinel_vault_entries';

function isVaultEntry(item: unknown): item is VaultEntry {
  if (typeof item !== 'object' || item === null) return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.id === 'number' &&
    typeof e.date === 'string' &&
    typeof e.title === 'string' &&
    typeof e.body === 'string' &&
    typeof e.tag === 'string'
  );
}

export async function loadVault(): Promise<VaultEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isVaultEntry);
  } catch {
    return [];
  }
}

async function persist(entries: VaultEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addVaultEntry(
  entries: VaultEntry[],
  draft: Omit<VaultEntry, 'id' | 'date'>,
): Promise<VaultEntry[]> {
  const entry: VaultEntry = {
    ...draft,
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
  };
  const next = [entry, ...entries];
  await persist(next);
  return next;
}

export async function updateVaultEntry(
  entries: VaultEntry[],
  updated: VaultEntry,
): Promise<VaultEntry[]> {
  const next = entries.map((e) => (e.id === updated.id ? updated : e));
  await persist(next);
  return next;
}

export async function deleteVaultEntry(
  entries: VaultEntry[],
  id: number,
): Promise<VaultEntry[]> {
  const next = entries.filter((e) => e.id !== id);
  await persist(next);
  return next;
}
