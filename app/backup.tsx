import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { buildSentinelBackup, parseSentinelBackup } from '@/src/utils/backupUtils';

function backupFileName() {
  return `sentinel-ready-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export default function BackupScreen() {
  const router = useRouter();
  const { logs, goals, replaceTrainingData, clearLogs, resetStarterData, isLoading } = useTraining();
  const { replaceProfile, resetProfile, ...profile } = useUser();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const summary = useMemo(() => ({
    logs: logs.length,
    goals: goals.length,
    profileReady: profile.isLoaded,
  }), [logs.length, goals.length, profile.isLoaded]);

  async function handleExportBackup() {
    try {
      setBusyAction('export');
      const backup = buildSentinelBackup({ logs, goals, profile });
      const uri = `${FileSystem.cacheDirectory ?? ''}${backupFileName()}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2), { encoding: 'utf8' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Sentinel Ready Backup',
        });
      } else {
        Alert.alert('Backup Created', `Backup file written to ${uri}`);
      }
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Backup could not be exported.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImportBackup() {
    try {
      setBusyAction('import');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const json = await FileSystem.readAsStringAsync(asset.uri);
      const backup = parseSentinelBackup(json);

      await replaceTrainingData(backup.logs, backup.goals);
      replaceProfile(backup.profile);
      Alert.alert('Backup Restored', `${backup.logs.length} logs and ${backup.goals.length} goals restored.`);
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Backup could not be imported.');
    } finally {
      setBusyAction(null);
    }
  }

  function confirmClearLogs() {
    Alert.alert('Clear Logs', 'Remove all training logs from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Logs',
        style: 'destructive',
        onPress: async () => {
          setBusyAction('clear');
          await clearLogs();
          setBusyAction(null);
        },
      },
    ]);
  }

  function confirmResetStarterData() {
    Alert.alert('Reset Starter Data', 'Replace logs and goals with starter data and reset profile defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setBusyAction('reset');
          await resetStarterData();
          resetProfile();
          setBusyAction(null);
        },
      },
    ]);
  }

  if (isLoading || !profile.isLoaded) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Data Backup</Text>
      <Text style={styles.subtitle}>Export, restore or reset local training data stored on this device.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.cardKicker}>CURRENT DATA</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{summary.logs}</Text>
            <Text style={styles.summaryLabel}>Logs</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{summary.goals}</Text>
            <Text style={styles.summaryLabel}>Goals</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{summary.profileReady ? 'Yes' : 'No'}</Text>
            <Text style={styles.summaryLabel}>Profile</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>BACKUP</Text>
        <Text style={styles.cardText}>Creates a JSON backup containing logs, goals and profile settings.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleExportBackup} disabled={busyAction !== null}>
          <Text style={styles.primaryButtonText}>{busyAction === 'export' ? 'Exporting...' : 'Export All Data'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>RESTORE</Text>
        <Text style={styles.cardText}>Imports a Sentinel Ready JSON backup and replaces current logs, goals and profile.</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleImportBackup} disabled={busyAction !== null}>
          <Text style={styles.secondaryButtonText}>{busyAction === 'import' ? 'Importing...' : 'Import Backup'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerCard}>
        <Text style={styles.cardKicker}>RESET</Text>
        <Text style={styles.cardText}>These actions change local data on this device.</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.dangerButton} onPress={confirmClearLogs} disabled={busyAction !== null}>
            <Text style={styles.dangerButtonText}>Clear Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={confirmResetStarterData} disabled={busyAction !== null}>
            <Text style={styles.dangerButtonText}>Reset Starter Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 18, paddingBottom: 90, gap: 14 },
  backButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  summaryCard: { backgroundColor: '#102016', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d6b3f', gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryStat: { flex: 1, gap: 3 },
  summaryNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '900' },
  card: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 10 },
  dangerCard: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardText: { color: '#c4cec0', fontSize: 13, lineHeight: 19 },
  primaryButton: { backgroundColor: '#91e6a3', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#07110c', fontSize: 14, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#91e6a3', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#91e6a3', fontSize: 14, fontWeight: '900' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dangerButton: { flexGrow: 1, borderWidth: 1, borderColor: '#ffb86b', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center' },
  dangerButtonText: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
});
