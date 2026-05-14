import { TrainingCategory, useTraining } from '@/src/screens/TrainingContext';
import { getCompletionScore, getNoteStarter, getNotesQualityWarning } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const categories: TrainingCategory[] = ['Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];

const quickTemplates = [
  {
    label: 'Ruck',
    category: 'Ruck' as TrainingCategory,
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '7',
    notes: 'Steady tactical pace. Monitor feet, shoulders, breathing and posture.',
  },
  {
    label: 'Run',
    category: 'Run' as TrainingCategory,
    type: 'Steady Run',
    duration: '35 minutes',
    distanceLoad: '5 km',
    readiness: '7',
    notes: 'Controlled aerobic pace. Keep the effort comfortable and consistent.',
  },
  {
    label: 'Strength',
    category: 'Strength' as TrainingCategory,
    type: 'Full Body Strength',
    duration: '50 minutes',
    distanceLoad: 'Squat - Press - Pull - Hinge - Carry',
    readiness: '8',
    notes: 'Keep form strict. Avoid grinding reps. Leave one or two reps in reserve.',
  },
  {
    label: 'Recovery',
    category: 'Recovery' as TrainingCategory,
    type: 'Recovery Mobility',
    duration: '25 minutes',
    distanceLoad: 'Hips - Calves - Hamstrings - Shoulders',
    readiness: '5',
    notes: 'Low intensity. Focus on breathing, mobility and reducing stiffness.',
  },
  {
    label: 'Test',
    category: 'Test' as TrainingCategory,
    type: 'Fitness Test Prep',
    duration: '40 minutes',
    distanceLoad: 'Run effort - Press-ups - Sit-ups - Carries',
    readiness: '8',
    notes: 'Record results clearly. Do not max out if fatigue is high.',
  },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}


export default function AddLogScreen() {
  const router = useRouter();
  const { addLog } = useTraining();

  const [date, setDate] = useState(getTodayDate());
  const [category, setCategory] = useState<TrainingCategory>('Ruck');
  const [type, setType] = useState('Loaded Ruck');
  const [duration, setDuration] = useState('60 minutes');
  const [distanceLoad, setDistanceLoad] = useState('6 km with 15 kg');
  const [readiness, setReadiness] = useState('7');
  const [notes, setNotes] = useState(getNoteStarter('Ruck'));
  const [saving, setSaving] = useState(false);

  const notesWarning = getNotesQualityWarning(notes);

  const completionScore = useMemo(
    () => getCompletionScore(date, category, type, duration, distanceLoad, readiness, notes),
    [date, category, type, duration, distanceLoad, readiness, notes]
  );

  function applyTemplate(template: typeof quickTemplates[number]) {
    setCategory(template.category);
    setType(template.type);
    setDuration(template.duration);
    setDistanceLoad(template.distanceLoad);
    setReadiness(template.readiness);
    setNotes(template.notes);
  }

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

      await addLog({
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
      Alert.alert('Save Failed', 'The training log could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>Add Training Log</Text>
        <Text style={styles.subtitle}>
          Record the session clearly so readiness, recovery and progression data stay useful.
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
        <Text style={styles.sectionTitle}>Quick Fill</Text>

        <View style={styles.templateRow}>
          {quickTemplates.map((template) => (
            <TouchableOpacity key={template.label} style={styles.templateButton} onPress={() => applyTemplate(template)}>
              <Text style={styles.templateText}>{template.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Training Log'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07110c',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 6,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  backButtonText: {
    color: '#c8f7d0',
    fontSize: 13,
    fontWeight: '900',
  },
  kicker: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 21,
  },
  completionCard: {
    backgroundColor: '#102d1a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  completionCardWarning: {
    backgroundColor: '#21140b',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  completionKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  completionScore: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  completionScoreWarning: {
    color: '#ffb86b',
    fontSize: 34,
    fontWeight: '900',
  },
  completionText: {
    color: '#91e6a3',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  completionTextWarning: {
    color: '#ffb86b',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#203529',
    gap: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    backgroundColor: '#102d1a',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  templateText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#91e6a3',
    borderWidth: 1,
    borderColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryText: {
    color: '#c8d8c5',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryTextActive: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  label: {
    color: '#dfe8da',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#07110c',
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 14,
  },
  notes: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  noteHelperBox: {
    backgroundColor: '#07110c',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26382c',
    gap: 5,
  },
  noteHelperTitle: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  noteHelperText: {
    color: '#aeb8aa',
    fontSize: 13,
    lineHeight: 19,
  },
  noteStarterButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  noteStarterButtonText: {
    color: '#07110c',
    fontSize: 12,
    fontWeight: '900',
  },
  warningBox: {
    backgroundColor: '#21140b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  warningTitle: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  warningText: {
    color: '#ffb86b',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  readyBox: {
    backgroundColor: '#102d1a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2f6b3c',
  },
  readyText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  saveButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#07110c',
    fontSize: 15,
    fontWeight: '900',
  },
});
