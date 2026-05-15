import dfift from '@/src/data/standards/dfift-standards.json';
import type { DfiftStandards } from '@/src/types/dfift';
import { useUser } from '@/src/screens/UserContext';
import { useTraining } from '@/src/screens/TrainingContext';
import { buildMilestones, getEarnedMilestones, getNextMilestone } from '@/src/utils/milestoneUtils';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useState } from 'react';
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
  const milestones = useMemo(() => buildMilestones(logs, goals, { standards: dfiftStandards, gender }), [logs, goals, gender]);
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
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
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
          >
            <Text style={gender === 'M' ? styles.toggleTextActive : styles.toggleText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={gender === 'F' ? styles.toggleBtnActive : styles.toggleBtn}
            onPress={() => setGender('F')}
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
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDate}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
        {dateError ? (
          <Text style={styles.errorText}>Enter date as YYYY-MM-DD (e.g. 2025-09-15)</Text>
        ) : null}
        {testDate && !dateError ? (
          <View style={styles.savedRow}>
            <Text style={styles.savedText}>Saved: {testDate}</Text>
            <TouchableOpacity onPress={handleClearDate}>
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
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  back: { paddingVertical: 4 },
  backText: { color: '#91e6a3', fontSize: 14, fontWeight: '900' },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  title: { color: '#f4f7f1', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#c6d0c2', fontSize: 15, lineHeight: 22 },

  card: { backgroundColor: '#0e1812', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#26382c', gap: 10 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardLabel: { color: '#8fbf8f', fontSize: 13, lineHeight: 19 },
  inputLabel: { color: '#dfe8da', fontSize: 12, fontWeight: '900', marginTop: 4 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#26382c', alignItems: 'center', backgroundColor: '#0a1410' },
  toggleBtnActive: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2f6b3c', alignItems: 'center', backgroundColor: '#102d1a' },
  toggleText: { color: '#4a5e4a', fontSize: 15, fontWeight: '900' },
  toggleTextActive: { color: '#91e6a3', fontSize: 15, fontWeight: '900' },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#07110c', borderRadius: 10, borderWidth: 1, borderColor: '#26382c', color: '#ffffff', fontSize: 16, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 12 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#7a3a1f' },
  saveBtn: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  saveBtnText: { color: '#91e6a3', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#ffb86b', fontSize: 12, fontWeight: '800' },
  savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedText: { color: '#8fbf8f', fontSize: 13, fontWeight: '800' },
  clearText: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelBtn: { flexGrow: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#26382c', alignItems: 'center', backgroundColor: '#0a1410' },
  levelBtnActive: { flexGrow: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2f6b3c', alignItems: 'center', backgroundColor: '#102d1a' },
  levelText: { color: '#4a5e4a', fontSize: 13, fontWeight: '900' },
  levelTextActive: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },

  infoCard: { backgroundColor: '#111a10', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#31411f', gap: 8 },
  infoTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#1a2c1e' },
  infoLabel: { color: '#aeb8aa', fontSize: 13, fontWeight: '800' },
  infoValue: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  infoFootnote: { color: '#4a5e4a', fontSize: 11, lineHeight: 16, marginTop: 4 },
  milestoneScore: { color: '#ffffff', fontSize: 26, fontWeight: '900' },
  milestoneGrid: { gap: 8 },
  milestoneItem: { backgroundColor: '#07110c', borderRadius: 12, borderWidth: 1, borderColor: '#26382c', padding: 12, gap: 3 },
  milestoneItemEarned: { backgroundColor: '#102d1a', borderRadius: 12, borderWidth: 1, borderColor: '#2f6b3c', padding: 12, gap: 3 },
  milestoneTitle: { color: '#dfe8da', fontSize: 13, fontWeight: '900' },
  milestoneTitleEarned: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  milestoneDescription: { color: '#8fbf8f', fontSize: 12, lineHeight: 17 },
});
