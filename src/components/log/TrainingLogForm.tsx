import { TrainingCategory, TrainingLog } from '@/src/screens/TrainingContext';
import { getCompletionScore, getNoteStarter, getNotesQualityWarning } from '@/src/utils/trainingLogUtils';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type TrainingLogFormValues = Omit<TrainingLog, 'id'>;

type QuickTemplate = TrainingLogFormValues & {
  label: string;
};

type Props = {
  title: string;
  subtitle: string;
  submitLabel: string;
  savingLabel: string;
  saveErrorTitle: string;
  saveErrorMessage: string;
  initialValues: TrainingLogFormValues;
  quickTemplates?: QuickTemplate[];
  onBack: () => void;
  onSubmit: (values: TrainingLogFormValues) => Promise<void>;
};

const categories: TrainingCategory[] = [
  'Ruck',
  'Strength',
  'Resistance',
  'Run',
  'Hiking',
  'Military',
  'Mobility',
  'Test',
  'Recovery',
];

export function getDefaultTrainingLogValues(): TrainingLogFormValues {
  return {
    date: new Date().toISOString().slice(0, 10),
    category: 'Ruck',
    type: 'Loaded Ruck',
    duration: '60 minutes',
    distanceLoad: '6 km with 15 kg',
    readiness: '7',
    notes: getNoteStarter('Ruck'),
  };
}

export function getQuickTemplates(): QuickTemplate[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      label: 'Ruck',
      category: 'Ruck',
      type: 'Loaded Ruck',
      duration: '60 minutes',
      distanceLoad: '6 km with 15 kg',
      readiness: '7',
      notes: 'Steady tactical pace. Monitor feet, shoulders, breathing and posture.',
      date: today,
    },
    {
      label: 'Run',
      category: 'Run',
      type: 'Steady Run',
      duration: '35 minutes',
      distanceLoad: '5 km',
      readiness: '7',
      notes: 'Controlled aerobic pace. Keep the effort comfortable and consistent.',
      date: today,
    },
    {
      label: 'Strength',
      category: 'Strength',
      type: 'Full Body Strength',
      duration: '50 minutes',
      distanceLoad: 'Squat - Press - Pull - Hinge - Carry',
      readiness: '8',
      notes: 'Keep form strict. Avoid grinding reps. Leave one or two reps in reserve.',
      date: today,
    },
    {
      label: 'Resistance',
      category: 'Resistance',
      type: 'Resistance Circuit',
      duration: '40 minutes',
      distanceLoad: 'Push - Pull - Core - Grip - Carries',
      readiness: '7',
      notes: 'Circuit pace controlled. Track grip, core fatigue, breathing and movement quality under repeated effort.',
      date: today,
    },
    {
      label: 'Hiking',
      category: 'Hiking',
      type: 'Terrain Hike',
      duration: '90 minutes',
      distanceLoad: '8 km mixed terrain with light day kit',
      readiness: '7',
      notes: 'Terrain pace steady. Monitor footing, calves, hips, feet, navigation stops and energy after climbs.',
      date: today,
    },
    {
      label: 'Military',
      category: 'Military',
      type: 'Field Skills',
      duration: '60 minutes',
      distanceLoad: 'Navigation - tactical movement - casualty drag - kit checks',
      readiness: '7',
      notes: 'Skills block completed with controlled intensity. Record movement quality, kit issues, navigation accuracy and recovery cost.',
      date: today,
    },
    {
      label: 'Recovery',
      category: 'Recovery',
      type: 'Recovery Mobility',
      duration: '25 minutes',
      distanceLoad: 'Hips - Calves - Hamstrings - Shoulders',
      readiness: '5',
      notes: 'Low intensity. Focus on breathing, mobility and reducing stiffness.',
      date: today,
    },
    {
      label: 'Test',
      category: 'Test',
      type: 'Fitness Test Prep',
      duration: '40 minutes',
      distanceLoad: 'Run effort - Press-ups - Sit-ups - Carries',
      readiness: '8',
      notes: 'Record results clearly. Do not max out if fatigue is high.',
      date: today,
    },
  ];
}

const TrainingLogForm = memo(function TrainingLogForm({
  title,
  subtitle,
  submitLabel,
  savingLabel,
  saveErrorTitle,
  saveErrorMessage,
  initialValues,
  quickTemplates,
  onBack,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<TrainingLogFormValues>(initialValues);
  const [saving, setSaving] = useState(false);

  const { date, category, type, duration, distanceLoad, readiness, notes } = values;

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const notesWarning = useMemo(() => getNotesQualityWarning(notes), [notes]);

  const completionScore = useMemo(
    () => getCompletionScore(date, category, type, duration, distanceLoad, readiness, notes),
    [date, category, type, duration, distanceLoad, readiness, notes]
  );

  const applyTemplate = useCallback((template: QuickTemplate) => {
    setValues((prev) => ({
      ...prev,
      category: template.category,
      type: template.type,
      duration: template.duration,
      distanceLoad: template.distanceLoad,
      readiness: template.readiness,
      notes: template.notes,
    }));
  }, []);

  const validateForm = useCallback(() => {
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
  }, [date, type, duration, distanceLoad, readiness]);

  const saveLogConfirmed = useCallback(async () => {
    try {
      setSaving(true);

      await onSubmit({
        date: date.trim(),
        category,
        type: type.trim(),
        duration: duration.trim(),
        distanceLoad: distanceLoad.trim(),
        readiness: readiness.trim(),
        notes: notes.trim(),
      });
    } catch {
      Alert.alert(saveErrorTitle, saveErrorMessage);
    } finally {
      setSaving(false);
    }
  }, [onSubmit, date, category, type, duration, distanceLoad, readiness, notes, saveErrorTitle, saveErrorMessage]);

  const saveLog = useCallback(async () => {
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
  }, [validateForm, completionScore, notesWarning, saveLogConfirmed]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.kicker}>SENTINEL READY</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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

      {quickTemplates ? (
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
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={category === item ? styles.categoryButtonActive : styles.categoryButton}
              onPress={() => {
              setValues((prev) => {
                const isDefault = categories.some((c) => prev.notes === getNoteStarter(c));
                return {
                  ...prev,
                  category: item,
                  notes: prev.notes.trim() === '' || isDefault ? getNoteStarter(item) : prev.notes,
                };
              });
              }}
            >
              <Text style={category === item ? styles.categoryTextActive : styles.categoryText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={(text) => setValues((prev) => ({ ...prev, date: text }))} placeholder="YYYY-MM-DD" placeholderTextColor="#6f7d70" maxLength={10} />

        <Text style={styles.label}>Session Type</Text>
        <TextInput style={styles.input} value={type} onChangeText={(text) => setValues((prev) => ({ ...prev, type: text }))} placeholder="Loaded Ruck, Steady Run, Strength Session" placeholderTextColor="#6f7d70" maxLength={100} />

        <Text style={styles.label}>Duration</Text>
        <TextInput style={styles.input} value={duration} onChangeText={(text) => setValues((prev) => ({ ...prev, duration: text }))} placeholder="45 minutes" placeholderTextColor="#6f7d70" maxLength={50} />

        <Text style={styles.label}>Distance / Load</Text>
        <TextInput style={styles.input} value={distanceLoad} onChangeText={(text) => setValues((prev) => ({ ...prev, distanceLoad: text }))} placeholder="5 km, 20 kg, Squat - Press - Pull" placeholderTextColor="#6f7d70" maxLength={100} />

        <Text style={styles.label}>Readiness 1-10</Text>
        <TextInput style={styles.input} value={readiness} onChangeText={(text) => setValues((prev) => ({ ...prev, readiness: text }))} keyboardType="numeric" placeholder="7" placeholderTextColor="#6f7d70" maxLength={2} />

        <Text style={styles.label}>Notes</Text>
        <View style={styles.noteHelperBox}>
          <Text style={styles.noteHelperTitle}>Note Starter</Text>
          <Text style={styles.noteHelperText}>{getNoteStarter(category)}</Text>

          <TouchableOpacity style={styles.noteStarterButton} onPress={() => setValues((prev) => ({ ...prev, notes: getNoteStarter(category) }))}>
            <Text style={styles.noteStarterButtonText}>Use Note Starter</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={(text) => setValues((prev) => ({ ...prev, notes: text }))}
          multiline
          placeholder="How did the session feel?"
          placeholderTextColor="#6f7d70"
          maxLength={500}
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
        <Text style={styles.saveButtonText}>{saving ? savingLabel : submitLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

export default TrainingLogForm;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000D1A' },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  header: { gap: 6 },
  backButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 6 },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#8FAEC8', fontSize: 14, lineHeight: 21 },
  completionCard: { backgroundColor: '#003050', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  completionCardWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  completionKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  completionScore: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  completionScoreWarning: { color: '#D4A01A', fontSize: 34, fontWeight: '900' },
  completionText: { color: '#B5852C', fontSize: 13, fontWeight: '900', flex: 1, textAlign: 'right' },
  completionTextWarning: { color: '#D4A01A', fontSize: 13, fontWeight: '900', flex: 1, textAlign: 'right' },
  card: { backgroundColor: '#00253D', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 },
  sectionTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateButton: { backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  templateText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryButtonActive: { backgroundColor: '#B5852C', borderWidth: 1, borderColor: '#B5852C', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  categoryTextActive: { color: '#000D1A', fontSize: 12, fontWeight: '900' },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 4 },
  input: { backgroundColor: '#000D1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, color: '#ffffff', fontSize: 14 },
  notes: { minHeight: 110, textAlignVertical: 'top' },
  noteHelperBox: { backgroundColor: '#000D1A', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 5 },
  noteHelperTitle: { color: '#B5852C', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  noteHelperText: { color: '#8FAEC8', fontSize: 13, lineHeight: 19 },
  noteStarterButton: { backgroundColor: '#B5852C', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start', marginTop: 5 },
  noteStarterButtonText: { color: '#000D1A', fontSize: 12, fontWeight: '900' },
  warningBox: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)' },
  warningTitle: { color: '#D4A01A', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  warningText: { color: '#D4A01A', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  readyBox: { backgroundColor: '#003050', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)' },
  readyText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  saveButton: { backgroundColor: '#B5852C', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveButtonText: { color: '#000D1A', fontSize: 15, fontWeight: '900' },
});
