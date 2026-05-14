import dfift from '@/src/data/standards/dfift-standards.json';
import { useUser } from '@/src/screens/UserContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ProfileScreen() {
  const { gender, testDate, setGender, setTestDate } = useUser();
  const router = useRouter();
  const [dateInput, setDateInput] = useState(testDate ?? '');
  const [dateError, setDateError] = useState(false);

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

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#26382c', alignItems: 'center', backgroundColor: '#0a1410' },
  toggleBtnActive: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2f6b3c', alignItems: 'center', backgroundColor: '#102d1a' },
  toggleText: { color: '#4a5e4a', fontSize: 15, fontWeight: '900' },
  toggleTextActive: { color: '#91e6a3', fontSize: 15, fontWeight: '900' },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#07110c', borderRadius: 10, borderWidth: 1, borderColor: '#26382c', color: '#ffffff', fontSize: 16, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 12 },
  inputError: { borderColor: '#7a3a1f' },
  saveBtn: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  saveBtnText: { color: '#91e6a3', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#ffb86b', fontSize: 12, fontWeight: '800' },
  savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedText: { color: '#8fbf8f', fontSize: 13, fontWeight: '800' },
  clearText: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },

  infoCard: { backgroundColor: '#111a10', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#31411f', gap: 8 },
  infoTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#1a2c1e' },
  infoLabel: { color: '#aeb8aa', fontSize: 13, fontWeight: '800' },
  infoValue: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  infoFootnote: { color: '#4a5e4a', fontSize: 11, lineHeight: 16, marginTop: 4 },
});
