import { useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const SAMPLE_CSV = [
  'id,date,category,type,duration,distanceLoad,readiness,notes',
  '"1","2026-05-15","Ruck","Loaded Ruck","60 minutes","6 km with 15 kg","7","Steady pace, feet checked, breathing controlled."',
].join('\n');

function countImportRows(csv: string) {
  return Math.max(0, csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length - 1);
}

export default function ImportLogsScreen() {
  const router = useRouter();
  const { importLogsCsv, isLoading } = useTraining();
  const [csv, setCsv] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const rowCount = useMemo(() => countImportRows(csv), [csv]);
  const canImport = rowCount > 0 && csv.toLowerCase().includes('date') && csv.toLowerCase().includes('category');

  async function handleImport() {
    if (!canImport) {
      Alert.alert('Check CSV', 'Paste CSV with a header row and at least one log row.');
      return;
    }

    try {
      setIsImporting(true);
      const imported = await importLogsCsv(csv);
      Alert.alert('Import Complete', `${imported} ${imported === 1 ? 'log' : 'logs'} imported.`, [
        { text: 'View Logs', onPress: () => router.replace('/log') },
      ]);
    } catch {
      Alert.alert('Import Failed', 'The CSV could not be imported. Check the columns and try again.');
    } finally {
      setIsImporting(false);
    }
  }

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Import Logs</Text>
      <Text style={styles.subtitle}>Paste CSV exported from Sentinel Ready or a matching spreadsheet.</Text>

      <View style={styles.requirementsCard}>
        <Text style={styles.cardKicker}>CSV FORMAT</Text>
        <Text style={styles.requirementText}>Required columns: id, date, category, type, duration, distanceLoad, readiness, notes.</Text>
        <Text style={styles.requirementText}>Allowed categories: Ruck, Strength, Resistance, Run, Hiking, Military, Mobility, Test, Recovery.</Text>
      </View>

      <View style={styles.editorCard}>
        <View style={styles.editorHeader}>
          <View>
            <Text style={styles.cardKicker}>PASTE CSV</Text>
            <Text style={styles.rowCount}>{rowCount} {rowCount === 1 ? 'row' : 'rows'} detected</Text>
          </View>
          <TouchableOpacity style={styles.sampleButton} onPress={() => setCsv(SAMPLE_CSV)}>
            <Text style={styles.sampleButtonText}>Sample</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.csvInput}
          value={csv}
          onChangeText={setCsv}
          placeholder={SAMPLE_CSV}
          placeholderTextColor="#4a5e4a"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={canImport ? styles.importButton : styles.importButtonDisabled} onPress={handleImport} disabled={isImporting}>
        <Text style={styles.importButtonText}>{isImporting ? 'Importing...' : 'Import CSV'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 18, paddingBottom: 80, gap: 14 },
  backButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  requirementsCard: { backgroundColor: '#102016', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d6b3f', gap: 7 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  requirementText: { color: '#c4cec0', fontSize: 13, lineHeight: 19 },
  editorCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 10 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  rowCount: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 3 },
  sampleButton: { borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  sampleButtonText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  csvInput: { minHeight: 260, backgroundColor: '#07110c', borderWidth: 1, borderColor: '#35523e', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, color: '#ffffff', fontSize: 12, lineHeight: 18, textAlignVertical: 'top', fontFamily: 'monospace' },
  importButton: { backgroundColor: '#91e6a3', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  importButtonDisabled: { backgroundColor: '#35523e', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  importButtonText: { color: '#07110c', fontSize: 15, fontWeight: '900' },
});
