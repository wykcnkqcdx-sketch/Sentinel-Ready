import TrainingLogForm, {
  defaultTrainingLogValues,
  quickTrainingLogTemplates,
  TrainingLogFormValues,
} from '@/src/components/log/TrainingLogForm';
import { useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';

export default function AddLogScreen() {
  const router = useRouter();
  const { addLog } = useTraining();

  async function handleSubmit(values: TrainingLogFormValues) {
    await addLog(values);
    router.replace('/log');
  }

  return (
    <TrainingLogForm
      title="Add Training Log"
      subtitle="Record the session clearly so readiness, recovery and progression data stay useful."
      submitLabel="Save Training Log"
      savingLabel="Saving..."
      saveErrorTitle="Save Failed"
      saveErrorMessage="The training log could not be saved. Please try again."
      initialValues={defaultTrainingLogValues}
      quickTemplates={quickTrainingLogTemplates}
      onBack={() => router.back()}
      onSubmit={handleSubmit}
    />
  );
}
