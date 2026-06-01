import { DS } from '@/constants/theme';
import {
  addInjuryEntry,
  deleteInjuryEntry,
  EMPTY_INJURY_DRAFT,
  getInjuryRisk,
  isInjuryDraftFileable,
  loadInjuryEntries,
  summarizeInjuryEntries,
  updateInjuryStatus,
  type InjuryEntry,
  type InjuryEntryDraft,
  type InjuryStatus,
} from '@/src/services/injuryLog';
import { useUser } from '@/src/screens/UserContext';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BODY_PARTS = ['Knee', 'Ankle', 'Shin', 'Calf', 'Foot', 'Hip', 'Back', 'Shoulder', 'Other'];
const STATUSES: InjuryStatus[] = ['active', 'recovering', 'healed'];

function formatDate(date: string) {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return date;
  }
}

function riskCopy(risk: string) {
  if (risk === 'high') {
    return { label: 'HIGH WATCH', color: DS.danger, text: 'Hold progression and prioritise recovery until symptoms improve.' };
  }
  if (risk === 'monitor') {
    return { label: 'MONITOR', color: DS.warning, text: 'Keep load controlled and log symptom changes after training.' };
  }
  return { label: 'CLEAR', color: DS.gold, text: 'No active structured injury risk on file.' };
}

export default function InjuryLogScreen() {
  const router = useRouter();
  const { updateProfile } = useUser();
  const [entries, setEntries] = useState<InjuryEntry[]>([]);
  const [draft, setDraft] = useState<InjuryEntryDraft>(EMPTY_INJURY_DRAFT);
  const [isLoading, setIsLoading] = useState(true);

  const syncProfileInjuries = useCallback((nextEntries: InjuryEntry[]) => {
    updateProfile({ injuryNotes: summarizeInjuryEntries(nextEntries) });
  }, [updateProfile]);

  useEffect(() => {
    let isMounted = true;
    loadInjuryEntries().then((loaded) => {
      if (!isMounted) return;
      setEntries(loaded);
      syncProfileInjuries(loaded);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [syncProfileInjuries]);

  const activeCount = useMemo(() => entries.filter((entry) => entry.status === 'active').length, [entries]);
  const recoveringCount = useMemo(() => entries.filter((entry) => entry.status === 'recovering').length, [entries]);
  const risk = useMemo(() => getInjuryRisk(entries), [entries]);
  const riskState = riskCopy(risk);

  const handleDraftChange = useCallback((key: keyof InjuryEntryDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFile = useCallback(async () => {
    if (!isInjuryDraftFileable(draft)) {
      Alert.alert('Missing body part', 'Select or enter a body part before filing an injury entry.');
      return;
    }
    const updated = await addInjuryEntry(draft);
    setEntries(updated);
    syncProfileInjuries(updated);
    setDraft({ ...EMPTY_INJURY_DRAFT, date: new Date().toISOString().slice(0, 10) });
  }, [draft, syncProfileInjuries]);

  const handleStatus = useCallback(async (id: string, status: InjuryStatus) => {
    const updated = await updateInjuryStatus(id, status);
    setEntries(updated);
    syncProfileInjuries(updated);
  }, [syncProfileInjuries]);

  const handleDelete = useCallback((entry: InjuryEntry) => {
    Alert.alert('Delete injury entry?', `${entry.bodyPart} will be removed from the injury log.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await deleteInjuryEntry(entry.id);
          setEntries(updated);
          syncProfileInjuries(updated);
        },
      },
    ]);
  }, [syncProfileInjuries]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>{'<'} BACK</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>RECOVERY INTELLIGENCE</Text>
        <Text style={styles.title}>Injury Log</Text>
        <Text style={styles.subtitle}>Track pain, severity and recovery status. Active entries feed Injury Watch and readiness guidance.</Text>
      </View>

      <View style={[styles.heroCard, { borderColor: riskState.color }]}>
        <View>
          <Text style={styles.heroKicker}>CURRENT RISK</Text>
          <Text style={[styles.heroStatus, { color: riskState.color }]}>{riskState.label}</Text>
        </View>
        <Text style={styles.heroText}>{riskState.text}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryNumber}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>ACTIVE</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryNumber}>{recoveringCount}</Text>
            <Text style={styles.summaryLabel}>RECOVERING</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardKicker}>NEW ENTRY</Text>
          <Text style={styles.cardMeta}>1-5 severity</Text>
        </View>

        <Text style={styles.inputLabel}>Body part</Text>
        <View style={styles.chipRow}>
          {BODY_PARTS.map((part) => {
            const active = draft.bodyPart === part;
            return (
              <TouchableOpacity
                key={part}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleDraftChange('bodyPart', part)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{part}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          value={draft.bodyPart}
          onChangeText={(value) => handleDraftChange('bodyPart', value)}
          placeholder="Custom body part"
          placeholderTextColor={DS.textMuted}
        />

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.inputLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {[1, 2, 3, 4, 5].map((level) => {
                const active = draft.severity === String(level);
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.severityButton, active && styles.severityButtonActive]}
                    onPress={() => handleDraftChange('severity', String(level))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.severityText, active && styles.severityTextActive]}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.column}>
            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={draft.date}
              onChangeText={(value) => handleDraftChange('date', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={DS.textMuted}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((status) => {
            const active = draft.status === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusButton, active && styles.statusButtonActive]}
                onPress={() => setDraft((prev) => ({ ...prev, status }))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{status.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={draft.notes}
          onChangeText={(value) => handleDraftChange('notes', value)}
          placeholder="Trigger, pain pattern, limits, rehab notes"
          placeholderTextColor={DS.textMuted}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.fileButton, !isInjuryDraftFileable(draft) && styles.buttonDisabled]}
          onPress={handleFile}
          disabled={!isInjuryDraftFileable(draft)}
          accessibilityRole="button"
          accessibilityLabel="File injury entry"
        >
          <Text style={styles.fileButtonText}>FILE INJURY ENTRY</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardKicker}>INJURY HISTORY</Text>
          <Text style={styles.cardMeta}>{entries.length} TOTAL</Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No injury entries</Text>
            <Text style={styles.emptyText}>Add active or recovering issues here so recovery guidance can protect your plan.</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={entry.status === 'active' ? styles.entryCardActive : styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleBlock}>
                  <Text style={styles.entryTitle}>{entry.bodyPart}</Text>
                  <Text style={styles.entryMeta}>{formatDate(entry.date)} - Severity {entry.severity}/5</Text>
                </View>
                <View style={entry.status === 'active' ? styles.statusBadgeActive : entry.status === 'recovering' ? styles.statusBadgeRecovering : styles.statusBadgeHealed}>
                  <Text style={styles.statusBadgeText}>{entry.status.toUpperCase()}</Text>
                </View>
              </View>
              {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
              <View style={styles.entryActions}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.smallButton, entry.status === status && styles.smallButtonActive]}
                    onPress={() => handleStatus(entry.id, status)}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${entry.bodyPart} ${status}`}
                  >
                    <Text style={[styles.smallButtonText, entry.status === status && styles.smallButtonTextActive]}>{status}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(entry)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${entry.bodyPart} injury entry`}
                >
                  <Text style={styles.deleteButtonText}>delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.bgPrimary },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 16, paddingBottom: 86, gap: 14 },
  header: { gap: 5 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  backButtonText: { color: DS.gold, fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  kicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: DS.textPrimary, fontSize: 32, fontWeight: '900' },
  subtitle: { color: DS.textSecondary, fontSize: 14, lineHeight: 20 },
  heroCard: { backgroundColor: DS.bgCard, borderRadius: 6, borderWidth: 1, padding: 16, gap: 10 },
  heroKicker: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroStatus: { fontSize: 30, fontWeight: '900', marginTop: 2 },
  heroText: { color: DS.textSecondary, fontSize: 13, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryPill: { flex: 1, borderWidth: 1, borderColor: DS.border, borderRadius: 6, backgroundColor: DS.bgPrimary, padding: 10, alignItems: 'center', gap: 2 },
  summaryNumber: { color: DS.textPrimary, fontSize: 22, fontWeight: '900' },
  summaryLabel: { color: DS.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  card: { backgroundColor: DS.bgCard, borderRadius: 6, borderWidth: 1, borderColor: DS.border, padding: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardKicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardMeta: { color: DS.textSecondary, fontSize: 11, fontWeight: '900' },
  inputLabel: { color: DS.textPrimary, fontSize: 12, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: DS.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: DS.bgPrimary },
  chipActive: { borderColor: DS.gold, backgroundColor: DS.gold },
  chipText: { color: DS.textSecondary, fontSize: 11, fontWeight: '900' },
  chipTextActive: { color: DS.bgPrimary },
  input: { minHeight: 44, backgroundColor: DS.bgPrimary, borderWidth: 1, borderColor: DS.border, borderRadius: 6, color: DS.textPrimary, fontSize: 14, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 92, lineHeight: 20 },
  twoColumn: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 6 },
  severityRow: { flexDirection: 'row', gap: 6 },
  severityButton: { flex: 1, minHeight: 44, borderRadius: 6, borderWidth: 1, borderColor: DS.border, backgroundColor: DS.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  severityButtonActive: { borderColor: DS.warning, backgroundColor: DS.warning },
  severityText: { color: DS.textSecondary, fontSize: 14, fontWeight: '900' },
  severityTextActive: { color: DS.bgPrimary },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, minHeight: 42, borderRadius: 6, borderWidth: 1, borderColor: DS.border, backgroundColor: DS.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  statusButtonActive: { borderColor: DS.gold, backgroundColor: DS.gold },
  statusButtonText: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statusButtonTextActive: { color: DS.bgPrimary },
  fileButton: { minHeight: 48, borderRadius: 6, backgroundColor: DS.gold, alignItems: 'center', justifyContent: 'center' },
  fileButtonText: { color: DS.bgPrimary, fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  buttonDisabled: { opacity: 0.45 },
  emptyBox: { backgroundColor: DS.bgPrimary, borderWidth: 1, borderColor: DS.border, borderRadius: 6, padding: 14, gap: 4 },
  emptyTitle: { color: DS.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyText: { color: DS.textSecondary, fontSize: 13, lineHeight: 19 },
  entryCard: { backgroundColor: DS.bgPrimary, borderRadius: 6, borderWidth: 1, borderColor: DS.border, padding: 12, gap: 10 },
  entryCardActive: { backgroundColor: DS.bgWarn, borderRadius: 6, borderWidth: 1, borderColor: DS.borderWarn, padding: 12, gap: 10 },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  entryTitleBlock: { flex: 1, gap: 3 },
  entryTitle: { color: DS.textPrimary, fontSize: 16, fontWeight: '900' },
  entryMeta: { color: DS.textSecondary, fontSize: 12, fontWeight: '800' },
  statusBadgeActive: { borderRadius: 999, backgroundColor: '#3a1a0d', borderWidth: 1, borderColor: DS.borderWarn, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeRecovering: { borderRadius: 999, backgroundColor: '#2a2410', borderWidth: 1, borderColor: DS.warning, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeHealed: { borderRadius: 999, backgroundColor: 'rgba(94,122,47,0.15)', borderWidth: 1, borderColor: DS.borderHighlight, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeText: { color: DS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  entryNotes: { color: DS.textSecondary, fontSize: 13, lineHeight: 19 },
  entryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  smallButton: { borderRadius: 999, borderWidth: 1, borderColor: DS.border, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: DS.bgPrimary },
  smallButtonActive: { borderColor: DS.gold },
  smallButtonText: { color: DS.textSecondary, fontSize: 11, fontWeight: '900' },
  smallButtonTextActive: { color: DS.gold },
  deleteButton: { borderRadius: 999, borderWidth: 1, borderColor: DS.danger, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#25100f' },
  deleteButtonText: { color: DS.danger, fontSize: 11, fontWeight: '900' },
});
