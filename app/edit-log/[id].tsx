import TrainingLogForm, { TrainingLogFormValues } from '@/src/components/log/TrainingLogForm';
import { useTraining } from '@/src/screens/TrainingContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EditLogScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { logs, updateLog, isLoading } = useTraining();

  const logId = Number(Array.isArray(id) ? id[0] : id);
  const logToEdit = useMemo(
    () => logs.find((log) => log.id === logId),
    [logs, logId]
  );

  async function handleSubmit(values: TrainingLogFormValues) {
    await updateLog(logId, values);
    router.replace('/log');
  }

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!logToEdit) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.notFoundTitle}>Log not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TrainingLogForm
      title="Edit Training Log"
      subtitle="Update your past session details."
      submitLabel="Update Training Log"
      savingLabel="Saving..."
      saveErrorTitle="Update Failed"
      saveErrorMessage="The training log could not be updated. Please try again."
      initialValues={logToEdit}
      onBack={() => router.back()}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    backgroundColor: '#07110c',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#8fbf8f',
    fontSize: 14,
    fontWeight: '800',
  },
  notFoundTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  backLink: {
    color: '#91e6a3',
    fontSize: 14,
    fontWeight: '900',
  },
});
