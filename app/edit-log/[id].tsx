import { TrainingCategory, useTraining } from '@/src/screens/TrainingContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const categories: TrainingCategory[] = ['Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];

function getNotesQualityMessage(notes: string) {
  const cleanNotes = notes.trim().toLowerCase();

  if (cleanNotes.length === 0) {
    return 'Add a short note about effort, fatigue, pain, pace, load or recovery.';
  }

  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];

  if (weakNotes.includes(cleanNotes)) {
    return 'Note is too brief. Add effort, soreness, pace, load, breathing or recovery detail.';
  }

  if (cleanNotes.length < 15) {
    return 'Note is short. Add one more useful detail about how the session felt.';
  }

  return '';
}

function getNoteStarter(category: TrainingCategory) {
  if (category === 'Ruck') {
    return 'Ruck notes: pace felt controlled, pack sat well, feet checked after session, shoulders manageable, breathing steady, no major hot spots.';
  }

  if (category === 'Run') {
    return 'Run notes: pace controlled, breathing steady, legs felt good, calves monitored, finished with energy left, no unusual pain.';
  }

  if (category === 'Strength') {
    return 'Strength notes: main lifts completed, form stayed solid, effort controlled, no grinding reps, joints felt comfortable, recovery needed.';
  }

  if (category === 'Recovery') {
    return 'Recovery notes: mobility completed, hips/calves/hamstrings worked, stiffness reduced, hydration checked, sleep and soreness monitored.';
  }

  if (category === 'Test') {
    return 'Test notes: result recorded, pacing reviewed, weak points identified, breathing controlled, fatigue noted, next improvement target set.';
  }

  return 'Session notes: effort level, fatigue, soreness, breathing, load, pace, recovery and anything unusual recorded.';
}

function getCompletionScore(
  date: string,
  category: TrainingCategory,
  type: string,
  duration: string,
  distanceLoad: string,
  readiness: string,
  notes: string
) {
  const readinessNumber = Number(readiness);

  const checks = [
    date.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()),
    Boolean(category),
    type.trim().length >= 3,
    duration.trim().length >= 3,
    distanceLoad.trim().length >= 5,
    !Number.isNaN(readinessNumber) && readinessNumber >= 1 && readinessNumber <= 10,
    !getNotesQualityMessage(notes),
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export default function EditLogScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { logs, updateLog } = useTraining();

  const [date, setDate] = useState('');
  const [category, setCategory] = useState<TrainingCategory>('Ruck');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [distanceLoad, setDistanceLoad] = useState('');
  const [readiness, setReadiness] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [logFound, setLogFound] = useState(false);

  useEffect(() => {
    if (id) {
      const logToEdit = logs.find((log) => log.id === Number(id));
      if (logToEdit) {
        setDate(logToEdit.date);
        setCategory(logToEdit.category);
        setType(logToEdit.type);
        setDuration(logToEdit.duration);
        setDistanceLoad(logToEdit.distanceLoad);
        setReadiness(logToEdit.readiness);
        setNotes(logToEdit.notes);
        setLogFound(true);
      }
    }
  }, [id, logs]);

  const notesWarning = getNotesQualityMessage(notes);

  const completionScore = useMemo(
    () => getCompletionScore(date, category, type, duration, distanceLoad, readiness, notes),
    [date, category, type, duration, distanceLoad, readiness, notes]
  );

  function validateForm() {
    const readinessNumber = Number(readiness);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Check Date', 'Use the date format YYYY-MM-DD.');
      return false;
    }

    if (type.trim().length < 3) {
      Alert.alert('Check Session Type', 'Add a clearer session type.');
      return false;
    }

    if (duration.trim().length < 3) {
      Alert.alert('Check Duration', 'Add the session duration.');
      return false;
    }

    if (distanceLoad.trim().length < 5) {
      Alert.alert('Check Distance / Load', 'Add distance, load, or the main work completed.');
      return false;
    }

    if (Number.isNaN(readinessNumber) || readinessNumber < 1 || readinessNumber > 10) {
      Alert.alert('Check Readiness', 'Readiness must be a number from 1 to 10.');
      return false;
    }

    return true;
  }

  async function saveLog() {
    if (!validateForm()) {
      return;
    }

    if (completionScore < 80 || notesWarning) {
      Alert.alert(
        'Save Quality Warning',
        'This log is missing useful detail or the notes are weak. Save anyway?',
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Save Anyway',
            onPress: () => saveLogConfirmed(),
          },
        ]
      );

      return;
    }

    await saveLogConfirmed();
  }

  async function saveLogConfirmed() {
    try {
      setSaving(true);

      await updateLog(Number(id), {
        date: date.trim(),
        category,
        type: type.trim(),
        duration: duration.trim(),
        distanceLoad: distanceLoad.trim(),
        readiness: readiness.trim(),
        notes: notes.trim(),
      });

      router.replace('/log');
    } catch (error) {
      Alert.alert('Update Failed', 'The training log could not be updated. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!logFound) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Loading log data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>Edit Training Log</Text>
        <Text style={styles.subtitle}>
          Update your past session details.
        </Text>
      </View>

      <View style={completionScore < 80 ? styles.completionCardWarning : styles.completionCard}>
        <View>
          <Text style={styles.completionKicker}>ENTRY QUALITY</Text>
          <Text style={completionScore < 80 ? styles.completionScoreWarning : styles.completionScore}>
            {completionScore}%
          </Text>
        </View>

        <Text style={completionScore < 80 ? styles.completionTextWarning : styles.completionText}>
          {completionScore < 80 ? 'Add more detail before saving.' : 'Entry is ready to save.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={category === item ? styles.categoryButtonActive : styles.categoryButton}
              onPress={() => {
                setCategory(item);
                
                // Only auto-fill if empty or currently using an unmodified starter
                const isDefault = categories.some((c) => notes === getNoteStarter(c));
                if (notes.trim() === '' || isDefault) {
                  setNotes(getNoteStarter(item));
                }
              }}
            >
              <Text style={category === item ? styles.categoryTextActive : styles.categoryText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#6f7d70" />

        <Text style={styles.label}>Session Type</Text>
        <TextInput style={styles.input} value={type} onChangeText={setType} placeholder="Loaded Ruck, Steady Run, Strength Session" placeholderTextColor="#6f7d70" />

        <Text style={styles.label}>Duration</Text>
        <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="45 minutes" placeholderTextColor="#6f7d70" />

        <Text style={styles.label}>Distance / Load</Text>
        <TextInput style={styles.input} value={distanceLoad} onChangeText={setDistanceLoad} placeholder="5 km, 20 kg, Squat - Press - Pull" placeholderTextColor="#6f7d70" />

        <Text style={styles.label}>Readiness 1-10</Text>
        <TextInput style={styles.input} value={readiness} onChangeText={setReadiness} keyboardType="numeric" placeholder="7" placeholderTextColor="#6f7d70" />

        <Text style={styles.label}>Notes</Text>
        <View style={styles.noteHelperBox}>
          <Text style={styles.noteHelperTitle}>Note Starter</Text>
          <Text style={styles.noteHelperText}>{getNoteStarter(category)}</Text>

          <TouchableOpacity style={styles.noteStarterButton} onPress={() => setNotes(getNoteStarter(category))}>
            <Text style={styles.noteStarterButtonText}>Use Note Starter</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="How did the session feel?"
          placeholderTextColor="#6f7d70"
        />

        {notesWarning ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Notes Quality Check</Text>
            <Text style={styles.warningText}>{notesWarning}</Text>
          </View>
        ) : (
          <View style={styles.readyBox}>
            <Text style={styles.readyText}>Good note detail recorded.</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveLog} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Update Training Log'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  header: { gap: 6 },
  backButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 6 },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  completionCard: { backgroundColor: '#102d1a', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#2f6b3c', flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  completionCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  completionKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  completionScore: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  completionScoreWarning: { color: '#ffb86b', fontSize: 34, fontWeight: '900' },
  completionText: { color: '#91e6a3', fontSize: 13, fontWeight: '900', flex: 1, textAlign: 'right' },
  completionTextWarning: { color: '#ffb86b', fontSize: 13, fontWeight: '900', flex: 1, textAlign: 'right' },
  card: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryButtonActive: { backgroundColor: '#91e6a3', borderWidth: 1, borderColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  categoryTextActive: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  label: { color: '#dfe8da', fontSize: 13, fontWeight: '900', marginTop: 4 },
  input: { backgroundColor: '#07110c', borderWidth: 1, borderColor: '#35523e', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, color: '#ffffff', fontSize: 14 },
  notes: { minHeight: 110, textAlignVertical: 'top' },
  noteHelperBox: { backgroundColor: '#07110c', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#26382c', gap: 5 },
  noteHelperTitle: { color: '#91e6a3', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  noteHelperText: { color: '#aeb8aa', fontSize: 13, lineHeight: 19 },
  noteStarterButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start', marginTop: 5 },
  noteStarterButtonText: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  warningBox: { backgroundColor: '#21140b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#7a4a1f' },
  warningTitle: { color: '#ffb86b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  warningText: { color: '#ffb86b', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  readyBox: { backgroundColor: '#102d1a', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#2f6b3c' },
  readyText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  saveButton: { backgroundColor: '#91e6a3', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveButtonText: { color: '#07110c', fontSize: 15, fontWeight: '900' },
});