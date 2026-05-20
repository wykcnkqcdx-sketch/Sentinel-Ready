import dfift from '@/src/data/standards/dfift-standards.json';
import type { DfiftStandards } from '@/src/types/dfift';
import { useUser } from '@/src/screens/UserContext';
import { useTraining } from '@/src/screens/TrainingContext';
import { buildMilestones, getEarnedMilestones, getNextMilestone } from '@/src/utils/milestoneUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ProfileScreen() {
  const { gender, testDate, age, role, trainingLevel, equipment, injuryNotes, setGender, setTestDate, updateProfile } = useUser();
  const { logs, goals } = useTraining();
  const router = useRouter();
  const [dateInput, setDateInput] = useState(testDate ?? '');
  const [dateError, setDateError] = useState(false);
  const dfiftStandards = dfift as DfiftStandards;
  const milestones = useMemo(() => buildMilestones(logs, goals, { standards: dfiftStandards, gender }), [logs, goals, gender, dfiftStandards]);
  const earnedMilestones = useMemo(() => getEarnedMilestones(milestones), [milestones]);
  const nextMilestone = useMemo(() => getNextMilestone(milestones), [milestones]);

  function handleSaveDate() {
    const trimmed = dateInput.trim();
    if (trimmed === '') {
      setTestDate(null);
      setDateError(false);
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      setTestDate(trimmed);
      setDateError(false);
    } else {
      setDateError(true);
    }
  }

  function handleClearDate() {
    setDateInput('');
    setTestDate(null);
    setDateError(false);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>
        Set your gender and target test date to personalise DFIFT standards and planning.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>GENDER</Text>
        <Text style={styles.cardLabel}>Used to apply the correct DFIFT pass/fail thresholds</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={gender === 'M' ? styles.toggleBtnActive : styles.toggleBtn}
            onPress={() => setGender('M')}
            accessibilityRole="button"
            accessibilityLabel="Male"
          >
            <Text style={gender === 'M' ? styles.toggleTextActive : styles.toggleText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={gender === 'F' ? styles.toggleBtnActive : styles.toggleBtn}
            onPress={() => setGender('F')}
            accessibilityRole="button"
            accessibilityLabel="Female"
          >
            <Text style={gender === 'F' ? styles.toggleTextActive : styles.toggleText}>Female</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>TARGET TEST DATE</Text>
        <Text style={styles.cardLabel}>Your scheduled DFIFT assessment date — shows a countdown on the Tests screen</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, dateError ? styles.inputError : null]}
            value={dateInput}
            onChangeText={(t) => { setDateInput(t); setDateError(false); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#4a5e4a"
            onBlur={handleSaveDate}
            keyboardType="numeric"
            maxLength={10}
            accessibilityLabel="Target test date"
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveDate}
            accessibilityRole="button"
            accessibilityLabel="Save date"
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
        {dateError ? (
          <Text style={styles.errorText}>Enter date as YYYY-MM-DD (e.g. 2025-09-15)</Text>
        ) : null}
        {testDate && !dateError ? (
          <View style={styles.savedRow}>
            <Text style={styles.savedText}>Saved: {testDate}</Text>
            <TouchableOpacity
              onPress={handleClearDate}
              accessibilityRole="button"
              accessibilityLabel="Clear date"
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>TRAINING PROFILE</Text>
        <Text style={styles.cardLabel}>Used to adjust training plan targets and recovery cautions.</Text>

        <Text style={styles.inputLabel}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={(value) => updateProfile({ age: value })}
          placeholder="Age"
          placeholderTextColor="#4a5e4a"
          keyboardType="numeric"
          maxLength={3}
        />

        <Text style={styles.inputLabel}>Role / focus</Text>
        <TextInput
          style={styles.input}
          value={role}
          onChangeText={(value) => updateProfile({ role: value })}
          placeholder="General readiness, selection prep, return to fitness"
          placeholderTextColor="#4a5e4a"
        />

        <Text style={styles.inputLabel}>Training level</Text>
        <View style={styles.levelRow}>
          {(['Foundation', 'Intermediate', 'Advanced'] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={trainingLevel === level ? styles.levelBtnActive : styles.levelBtn}
              onPress={() => updateProfile({ trainingLevel: level })}
            >
              <Text style={trainingLevel === level ? styles.levelTextActive : styles.levelText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Equipment access</Text>
        <TextInput
          style={styles.input}
          value={equipment}
          onChangeText={(value) => updateProfile({ equipment: value })}
          placeholder="Ruck, gym, pull-up bar, running route"
          placeholderTextColor="#4a5e4a"
        />

        <Text style={styles.inputLabel}>Injury notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={injuryNotes}
          onChangeText={(value) => updateProfile({ injuryNotes: value })}
          placeholder="Anything the plan should respect"
          placeholderTextColor="#4a5e4a"
          multiline
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>DATA</Text>
        <Text style={styles.cardLabel}>Back up logs, goals and profile settings or restore local data.</Text>
        <TouchableOpacity
          style={styles.dataButton}
          onPress={() => router.push('/backup')}
          accessibilityRole="button"
          accessibilityLabel="Open data backup"
        >
          <Text style={styles.dataButtonText}>Data Backup</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>DFIFT Standards (current)</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Push-ups</Text>
          <Text style={styles.infoValue}>{dfift.events.pushUps.male} reps / {dfift.events.pushUps.timeLimitSeconds}s</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sit-ups</Text>
          <Text style={styles.infoValue}>{dfift.events.sitUps.male} reps / {dfift.events.sitUps.timeLimitSeconds}s</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>2.4km Run (Male)</Text>
          <Text style={styles.infoValue}>Under {formatSeconds(dfift.events.run.maleMaxSeconds)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>2.4km Run (Female)</Text>
          <Text style={styles.infoValue}>Under {formatSeconds(dfift.events.run.femaleMaxSeconds)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Skinfold (Male)</Text>
          <Text style={styles.infoValue}>Under {dfift.events.skinfold.maleMaxMm}mm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Skinfold (Female)</Text>
          <Text style={styles.infoValue}>Under {dfift.events.skinfold.femaleMaxMm}mm</Text>
        </View>
        <Text style={styles.infoFootnote}>Verify against current official Defence Forces guidance before assessment.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>MILESTONES</Text>
        <Text style={styles.milestoneScore}>{earnedMilestones.length} / {milestones.length} earned</Text>
        {nextMilestone ? (
          <Text style={styles.cardLabel}>Next: {nextMilestone.title} · {nextMilestone.progress}%</Text>
        ) : (
          <Text style={styles.cardLabel}>All current milestones earned.</Text>
        )}
        <View style={styles.milestoneGrid}>
          {milestones.map((milestone) => (
            <View key={milestone.id} style={milestone.earned ? styles.milestoneItemEarned : styles.milestoneItem}>
              <Text style={milestone.earned ? styles.milestoneTitleEarned : styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneDescription}>{milestone.description}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  back: { paddingVertical: 4 },
  backText: { color: '#FC4C02', fontSize: 14, fontWeight: '900' },
  kicker: { color: '#FC4C02', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#A7ADB8', fontSize: 15, lineHeight: 22 },

  card: { backgroundColor: '#1E2229', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 },
  cardKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardLabel: { color: '#A7ADB8', fontSize: 13, lineHeight: 19 },
  inputLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginTop: 4 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', backgroundColor: '#252B35' },
  toggleBtnActive: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', alignItems: 'center', backgroundColor: '#252B35' },
  toggleText: { color: '#6B717E', fontSize: 15, fontWeight: '900' },
  toggleTextActive: { color: '#FC4C02', fontSize: 15, fontWeight: '900' },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#0F1115', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff', fontSize: 16, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 12 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: 'rgba(255,69,58,0.4)' },
  saveBtn: { backgroundColor: '#252B35', borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  saveBtnText: { color: '#FC4C02', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#F5A623', fontSize: 12, fontWeight: '800' },
  savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedText: { color: '#A7ADB8', fontSize: 13, fontWeight: '800' },
  clearText: { color: '#F5A623', fontSize: 13, fontWeight: '900' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelBtn: { flexGrow: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', backgroundColor: '#252B35' },
  levelBtnActive: { flexGrow: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', alignItems: 'center', backgroundColor: '#252B35' },
  levelText: { color: '#6B717E', fontSize: 13, fontWeight: '900' },
  levelTextActive: { color: '#FC4C02', fontSize: 13, fontWeight: '900' },
  dataButton: { backgroundColor: '#FC4C02', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  dataButtonText: { color: '#0F1115', fontSize: 14, fontWeight: '900' },

  infoCard: { backgroundColor: '#1E2229', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  infoTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { color: '#A7ADB8', fontSize: 13, fontWeight: '800' },
  infoValue: { color: '#FC4C02', fontSize: 13, fontWeight: '900' },
  infoFootnote: { color: '#6B717E', fontSize: 11, lineHeight: 16, marginTop: 4 },
  milestoneScore: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  milestoneGrid: { gap: 8 },
  milestoneItem: { backgroundColor: '#0F1115', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, gap: 3 },
  milestoneItemEarned: { backgroundColor: '#252B35', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', padding: 12, gap: 3 },
  milestoneTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  milestoneTitleEarned: { color: '#FC4C02', fontSize: 13, fontWeight: '900' },
  milestoneDescription: { color: '#A7ADB8', fontSize: 12, lineHeight: 17 },
});
