import { tokens as T } from '@/src/theme/tokens';
import { useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type MentalState = 'SHARP' | 'NOMINAL' | 'DEGRADED' | 'CRITICAL';
type Hydration = 'FULL' | 'PARTIAL' | 'DEPLETED';

const MENTAL_OPTIONS: Array<{ value: MentalState; color: string }> = [
  { value: 'SHARP',    color: '#91e6a3' },
  { value: 'NOMINAL',  color: '#3fc8e4' },
  { value: 'DEGRADED', color: '#ffaa44' },
  { value: 'CRITICAL', color: '#e05050' },
];

const HYDRATION_OPTIONS: Array<{ value: Hydration; color: string }> = [
  { value: 'FULL',     color: '#91e6a3' },
  { value: 'PARTIAL',  color: '#ffaa44' },
  { value: 'DEPLETED', color: '#e05050' },
];

const SORENESS_AREAS = ['HEAD', 'NECK', 'SHOULDERS', 'CHEST', 'BACK', 'CORE', 'HIPS', 'QUADS', 'HAMSTRINGS', 'CALVES', 'FEET'];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeReadiness(sleep: number, mental: MentalState, hydration: Hydration, sorenessCount: number): number {
  let score = sleep;
  if (mental === 'SHARP') score += 0.5;
  else if (mental === 'DEGRADED') score -= 1;
  else if (mental === 'CRITICAL') score -= 2;
  if (hydration === 'PARTIAL') score -= 0.5;
  else if (hydration === 'DEPLETED') score -= 1;
  if (sorenessCount >= 4) score -= 2;
  else if (sorenessCount >= 2) score -= 1;
  return Math.max(1, Math.min(10, Math.round(score)));
}

function buildNotes(sleep: number, mental: MentalState, hydration: Hydration, soreness: string[], fieldNotes: string): string {
  const parts = [
    `SLEEP: ${sleep}/10`,
    `MENTAL: ${mental}`,
    `HYDRATION: ${hydration}`,
    soreness.length > 0 ? `SORENESS: ${soreness.join(', ')}` : 'SORENESS: NIL',
  ];
  if (fieldNotes.trim()) parts.push(`FIELD: ${fieldNotes.trim()}`);
  return parts.join(' | ');
}

function parseNote(note: string): Record<string, string> {
  const result: Record<string, string> = {};
  note.split(' | ').forEach((part) => {
    const colon = part.indexOf(': ');
    if (colon !== -1) {
      result[part.slice(0, colon)] = part.slice(colon + 2);
    }
  });
  return result;
}

export default function DailyCheckScreen() {
  const router = useRouter();
  const { logs, addLog } = useTraining();
  const today = todayStr();

  const existingEntry = useMemo(
    () => logs.find((l) => l.date === today && l.type === 'Daily SITREP'),
    [logs, today],
  );

  const [sleep, setSleep] = useState(7);
  const [mental, setMental] = useState<MentalState>('NOMINAL');
  const [hydration, setHydration] = useState<Hydration>('FULL');
  const [soreness, setSoreness] = useState<string[]>([]);
  const [fieldNotes, setFieldNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const previewReadiness = computeReadiness(sleep, mental, hydration, soreness.length);

  async function handleSubmit() {
    const readiness = computeReadiness(sleep, mental, hydration, soreness.length);
    await addLog({
      date: today,
      category: 'Recovery',
      type: 'Daily SITREP',
      duration: '',
      distanceLoad: '',
      readiness: String(readiness),
      notes: buildNotes(sleep, mental, hydration, soreness, fieldNotes),
    });
    setSubmitted(true);
  }

  function toggleSoreness(area: string) {
    setSoreness((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  }

  if (existingEntry || submitted) {
    const parsed = parseNote(existingEntry?.notes ?? buildNotes(sleep, mental, hydration, soreness, fieldNotes));
    const r = Number(existingEntry?.readiness ?? previewReadiness);
    const rColor = r >= 8 ? '#91e6a3' : r >= 6 ? '#ffaa44' : '#e05050';
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.kicker}>{'// OPERATIONS CENTRE //'}</Text>
            <Text style={styles.title}>DAILY SITREP</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.filedBanner}>
            <View style={[styles.filedDot, { backgroundColor: '#91e6a3' }]} />
            <Text style={styles.filedText}>SITREP FILED — {today}</Text>
          </View>

          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>READINESS ON FILE</Text>
            <Text style={[styles.reportScore, { color: rColor }]}>{r}<Text style={styles.reportScoreUnit}>/10</Text></Text>
          </View>

          {Object.entries(parsed).map(([key, val]) => (
            <View key={key} style={styles.reportRow}>
              <Text style={styles.reportKey}>{key}</Text>
              <Text style={styles.reportVal}>{val}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.kicker}>{'// OPERATIONS CENTRE //'}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>DAILY SITREP</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{today}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        {/* Sleep Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SLEEP QUALITY</Text>
          <View style={styles.scoreGrid}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = sleep === n;
              const color = n <= 3 ? '#e05050' : n <= 5 ? '#ffaa44' : '#91e6a3';
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.scoreBtn, active && { borderColor: color, backgroundColor: color + '22' }]}
                  onPress={() => setSleep(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sleep score ${n}`}
                >
                  <Text style={[styles.scoreBtnText, active && { color }]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mental State */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MENTAL STATE</Text>
          <View style={styles.optionRow}>
            {MENTAL_OPTIONS.map((opt) => {
              const active = mental === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionBtn, active && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
                  onPress={() => setMental(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.value}
                >
                  <Text style={[styles.optionBtnText, active && { color: opt.color }]}>{opt.value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hydration */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HYDRATION STATUS</Text>
          <View style={styles.optionRow}>
            {HYDRATION_OPTIONS.map((opt) => {
              const active = hydration === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionBtn, active && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
                  onPress={() => setHydration(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.value}
                >
                  <Text style={[styles.optionBtnText, active && { color: opt.color }]}>{opt.value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Soreness */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SORENESS FLAGS</Text>
          <View style={styles.sorenessGrid}>
            {SORENESS_AREAS.map((area) => {
              const active = soreness.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  style={[styles.sorenessChip, active && styles.sorenessChipActive]}
                  onPress={() => toggleSoreness(area)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={area}
                >
                  <Text style={[styles.sorenessChipText, active && styles.sorenessChipTextActive]}>{area}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Field Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FIELD NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.notesInput}
            value={fieldNotes}
            onChangeText={setFieldNotes}
            placeholder="Any additional observations..."
            placeholderTextColor={T.textHintDark}
            multiline
            numberOfLines={3}
            accessibilityLabel="Field notes"
          />
        </View>

        {/* Readiness preview */}
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>COMPUTED READINESS</Text>
          <Text style={[styles.previewScore, {
            color: previewReadiness >= 8 ? '#91e6a3' : previewReadiness >= 6 ? '#ffaa44' : '#e05050'
          }]}>{previewReadiness}/10</Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} accessibilityRole="button" accessibilityLabel="Submit SITREP">
          <Text style={styles.submitBtnText}>SUBMIT SITREP</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4, marginBottom: 16 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  dateBadge: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 10, paddingVertical: 4 },
  dateBadgeText: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  section: { paddingHorizontal: 16, marginBottom: 20, gap: 10 },
  sectionLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 3 },

  scoreGrid: { flexDirection: 'row', gap: 6 },
  scoreBtn: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingVertical: 10, alignItems: 'center' },
  scoreBtnText: { color: T.textHintDark, fontSize: 13, fontWeight: '900' },

  optionRow: { flexDirection: 'row', gap: 6 },
  optionBtn: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingVertical: 10, alignItems: 'center' },
  optionBtnText: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  sorenessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sorenessChip: { borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 12, paddingVertical: 7 },
  sorenessChipActive: { borderColor: '#e05050' + '88', backgroundColor: '#e05050' + '15' },
  sorenessChipText: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sorenessChipTextActive: { color: '#e05050' },

  notesInput: { backgroundColor: T.bgPanelAlt, borderWidth: 1, borderColor: T.borderDim, borderRadius: 4, padding: 12, color: T.textSubtle, fontSize: 13, fontWeight: '600', minHeight: 72, textAlignVertical: 'top' },

  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 16, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 16, paddingVertical: 12 },
  previewLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  previewScore: { fontSize: 22, fontWeight: '900' },

  submitBtn: { marginHorizontal: 16, backgroundColor: '#0e2018', borderRadius: 4, borderWidth: 1, borderColor: '#235c32', paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: T.textAccent, fontSize: 11, fontWeight: '900', letterSpacing: 3 },

  // Submitted / read-only view
  filedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#91e6a3' + '44', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#91e6a3' + '0c' },
  filedDot: { width: 7, height: 7, borderRadius: 3.5 },
  filedText: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  reportCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportTitle: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  reportScore: { fontSize: 28, fontWeight: '900' },
  reportScoreUnit: { fontSize: 14, fontWeight: '700', color: T.textSubtle },
  reportRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 14, paddingVertical: 10 },
  reportKey: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2, flex: 0 },
  reportVal: { color: T.textSubtle, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },
});
