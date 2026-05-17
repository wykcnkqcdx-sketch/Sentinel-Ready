import SparkLine from '@/src/components/charts/SparkLine';
import { deleteBodyCompEntry, loadBodyCompEntries, saveBodyCompEntry } from '@/src/services/bodyCompService';
import { useUser } from '@/src/screens/UserContext';
import type { BodyCompEntry } from '@/src/types/bodyComp';
import {
  calculateBmi,
  getBmiColor,
  getBmiLabel,
  getBmiStatus,
  getSkinfoldColor,
  getSkinfoldLabel,
  getSkinfoldStatus,
  weightSeries,
} from '@/src/utils/bodyCompUtils';
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function BodyCompScreen() {
  const { gender, heightCm, updateProfile } = useUser();

  const [entries, setEntries] = useState<BodyCompEntry[]>([]);
  const [weightKg, setWeightKg] = useState(80);
  const [includeSkinfold, setIncludeSkinfold] = useState(false);
  const [skinfoldMm, setSkinfoldMm] = useState(60);
  const [notes, setNotes] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBodyCompEntries().then((data) => {
      setEntries(data);
      setIsLoading(false);
    });
  }, []);

  const reload = useCallback(async () => {
    const data = await loadBodyCompEntries();
    setEntries(data);
  }, []);

  const handleSaveHeight = useCallback(() => {
    const trimmed = heightInput.trim();
    if (trimmed) {
      updateProfile({ heightCm: trimmed });
      setHeightInput('');
    }
  }, [heightInput, updateProfile]);

  const handleLogEntry = useCallback(async () => {
    const now = new Date();
    const id = now.toISOString();
    const date = id.slice(0, 10);
    const parsedHeight = parseFloat(heightCm);
    const bmi =
      heightCm && parsedHeight > 0
        ? calculateBmi(weightKg, parsedHeight)
        : undefined;
    const entry: BodyCompEntry = {
      id,
      date,
      weightKg,
      skinfoldMm: includeSkinfold ? skinfoldMm : undefined,
      bmi,
      notes,
    };
    await saveBodyCompEntry(entry);
    await reload();
    setNotes('');
    setSuccessMsg('Entry logged ✓');
    setTimeout(() => setSuccessMsg(''), 2000);
  }, [weightKg, includeSkinfold, skinfoldMm, notes, heightCm, reload]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteBodyCompEntry(id);
      await reload();
    },
    [reload]
  );

  const latestEntry = entries[0] ?? null;
  const sparkData = weightSeries(entries, 8);
  const parsedHeight = parseFloat(heightCm);
  const heightSet = !!heightCm && parsedHeight > 0;

  const currentBmiStatus =
    latestEntry?.bmi != null ? getBmiStatus(latestEntry.bmi) : null;

  const bmiColors: Record<string, string> = {
    underweight: '#4a9eff',
    optimal: '#91e6a3',
    overweight: '#FFB86B',
    obese: '#ff6b6b',
  };

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* SECTION 1 — Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>BODY COMPOSITION</Text>
        <Text style={styles.title}>Composition Tracker</Text>
      </View>

      {/* Height prompt */}
      {!heightSet && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Set your height to enable BMI tracking</Text>
          <View style={styles.heightRow}>
            <TextInput
              style={styles.heightInput}
              value={heightInput}
              onChangeText={setHeightInput}
              keyboardType="numeric"
              placeholder="175"
              placeholderTextColor="#aeb8aa"
            />
            <Text style={styles.unitLabel}>cm</Text>
            <TouchableOpacity style={styles.saveHeightBtn} onPress={handleSaveHeight}>
              <Text style={styles.saveHeightBtnText}>Save Height</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SECTION 2 — Current status */}
      {latestEntry && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.bigWeight}>{latestEntry.weightKg}</Text>
              <Text style={styles.unitSub}>kg</Text>
            </View>
            {latestEntry.bmi != null && currentBmiStatus && (
              <View style={styles.bmiBlock}>
                <Text style={styles.bmiValue}>{latestEntry.bmi}</Text>
                <View style={[styles.bmiStatusBadge, { borderColor: getBmiColor(currentBmiStatus) }]}>
                  <Text style={[styles.bmiStatusText, { color: getBmiColor(currentBmiStatus) }]}>
                    {getBmiLabel(currentBmiStatus)}
                  </Text>
                </View>
              </View>
            )}
          </View>
          {latestEntry.skinfoldMm != null && (
            <Text style={styles.skinfoldLine}>
              Skinfold: {latestEntry.skinfoldMm} mm
              {'  '}
              <Text style={{ color: getSkinfoldColor(getSkinfoldStatus(latestEntry.skinfoldMm, gender)) }}>
                {getSkinfoldLabel(getSkinfoldStatus(latestEntry.skinfoldMm, gender))}
              </Text>
            </Text>
          )}
          {sparkData.length >= 2 && (
            <View style={styles.sparkRow}>
              <SparkLine data={sparkData} width={180} height={32} color="#91e6a3" strokeWidth={2} />
            </View>
          )}
          <Text style={styles.lastLogged}>Last logged: {latestEntry.date}</Text>
        </View>
      )}

      {/* SECTION 3 — Log entry form */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>LOG ENTRY</Text>

        <Text style={styles.fieldLabel}>Weight</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setWeightKg((w) => Math.max(40, Math.round((w - 0.5) * 10) / 10))}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{weightKg} kg</Text>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setWeightKg((w) => Math.min(200, Math.round((w + 0.5) * 10) / 10))}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Include skinfold?</Text>
          <Switch
            value={includeSkinfold}
            onValueChange={setIncludeSkinfold}
            trackColor={{ true: '#91e6a3', false: '#1a2e1f' }}
            thumbColor="#f2f5ef"
          />
        </View>

        {includeSkinfold && (
          <>
            <Text style={styles.fieldLabel}>Skinfold (4-site sum)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setSkinfoldMm((m) => Math.max(10, m - 1))}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{skinfoldMm} mm</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setSkinfoldMm((m) => Math.min(200, m + 1))}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes"
          placeholderTextColor="#aeb8aa"
          multiline
        />

        <TouchableOpacity style={styles.logBtn} onPress={handleLogEntry}>
          <Text style={styles.logBtnText}>LOG ENTRY</Text>
        </TouchableOpacity>

        {successMsg ? (
          <Text style={styles.successMsg}>{successMsg}</Text>
        ) : null}
      </View>

      {/* SECTION 4 — DFITT reference */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>DFITT BMI BANDS</Text>
        {[
          { color: '#4a9eff', label: 'Underweight', range: '< 18.5', status: 'underweight' },
          { color: '#91e6a3', label: 'Optimal (Military)', range: '18.5 – 27.5', status: 'optimal' },
          { color: '#FFB86B', label: 'Overweight', range: '27.5 – 30.0', status: 'overweight' },
          { color: '#ff6b6b', label: 'Obese', range: '≥ 30.0', status: 'obese' },
        ].map((band) => {
          const isHere = heightSet && currentBmiStatus === band.status;
          return (
            <View key={band.status} style={styles.bandRow}>
              <View style={[styles.bandDot, { backgroundColor: band.color }]} />
              <Text style={styles.bandLabel}>{band.label}</Text>
              <Text style={styles.bandRange}>{band.range}</Text>
              {isHere && <Text style={styles.hereTag}>→ YOU ARE HERE</Text>}
            </View>
          );
        })}
      </View>

      {/* SECTION 5 — History */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>HISTORY</Text>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No entries logged yet.</Text>
        ) : (
          entries.slice(0, 10).map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>{entry.date}</Text>
                <Text style={styles.historyWeight}>{entry.weightKg} kg</Text>
                {entry.bmi != null && (
                  <Text style={[styles.historyBmi, { color: getBmiColor(getBmiStatus(entry.bmi)) }]}>
                    BMI {entry.bmi}
                  </Text>
                )}
                {entry.skinfoldMm != null && (
                  <Text style={styles.historySkinfold}>{entry.skinfoldMm} mm</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(entry.id)}
                accessibilityLabel="Delete entry"
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 20, gap: 14, paddingBottom: 60 },
  header: { gap: 6 },
  kicker: { color: '#8fbf8f', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#f2f5ef', fontSize: 28, fontWeight: '900' },
  card: {
    backgroundColor: '#0e1f15',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1a2e1f',
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: '#f2f5ef', fontSize: 15, fontWeight: '800' },
  heightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heightInput: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f2f5ef',
    fontSize: 16,
    fontWeight: '700',
    width: 80,
  },
  unitLabel: { color: '#aeb8aa', fontSize: 14, fontWeight: '700' },
  saveHeightBtn: {
    backgroundColor: '#91e6a3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveHeightBtnText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  sectionLabel: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigWeight: { color: '#f2f5ef', fontSize: 52, fontWeight: '900', lineHeight: 56 },
  unitSub: { color: '#aeb8aa', fontSize: 14, fontWeight: '700' },
  bmiBlock: { alignItems: 'flex-end', gap: 6 },
  bmiValue: { color: '#f2f5ef', fontSize: 28, fontWeight: '900' },
  bmiStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bmiStatusText: { fontSize: 11, fontWeight: '900' },
  skinfoldLine: { color: '#aeb8aa', fontSize: 13, fontWeight: '700' },
  sparkRow: { paddingTop: 4 },
  lastLogged: { color: '#aeb8aa', fontSize: 12, fontWeight: '700' },
  fieldLabel: { color: '#aeb8aa', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0d1812',
    borderWidth: 1,
    borderColor: '#1a2e1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: '#f2f5ef', fontSize: 20, fontWeight: '700' },
  stepperValue: { color: '#f2f5ef', fontSize: 18, fontWeight: '900', minWidth: 80, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: '#aeb8aa', fontSize: 13, fontWeight: '700' },
  notesInput: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f2f5ef',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 60,
  },
  logBtn: {
    backgroundColor: '#91e6a3',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logBtnText: { color: '#07110c', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  successMsg: { color: '#91e6a3', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bandDot: { width: 12, height: 12, borderRadius: 6 },
  bandLabel: { color: '#f2f5ef', fontSize: 13, fontWeight: '800', flex: 1 },
  bandRange: { color: '#aeb8aa', fontSize: 12, fontWeight: '700' },
  hereTag: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  emptyText: { color: '#aeb8aa', fontSize: 13, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1f',
  },
  historyInfo: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 },
  historyDate: { color: '#aeb8aa', fontSize: 12, fontWeight: '700', minWidth: 90 },
  historyWeight: { color: '#f2f5ef', fontSize: 14, fontWeight: '900' },
  historyBmi: { fontSize: 12, fontWeight: '800' },
  historySkinfold: { color: '#aeb8aa', fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2a0f0f',
    borderWidth: 1,
    borderColor: '#5a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#ff6b6b', fontSize: 14, fontWeight: '900' },
});
