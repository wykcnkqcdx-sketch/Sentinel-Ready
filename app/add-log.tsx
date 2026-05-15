import TrainingLogForm, {
  getDefaultTrainingLogValues,
  getQuickTemplates,
  TrainingLogFormValues,
} from '@/src/components/log/TrainingLogForm';
import { TrainingCategory } from '@/src/screens/TrainingContext';
import { useTraining } from '@/src/screens/TrainingContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

const categories: TrainingCategory[] = ['Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildInitialValues(params: Record<string, string | string[] | undefined>): TrainingLogFormValues {
  const defaults = getDefaultTrainingLogValues();
  const categoryParam = getParam(params.category);
  const category = categories.includes(categoryParam as TrainingCategory)
    ? categoryParam as TrainingCategory
    : defaults.category;

  return {
    date: getParam(params.date) ?? defaults.date,
    category,
    type: getParam(params.type) ?? defaults.type,
    duration: getParam(params.duration) ?? defaults.duration,
    distanceLoad: getParam(params.distanceLoad) ?? defaults.distanceLoad,
    readiness: getParam(params.readiness) ?? defaults.readiness,
    notes: getParam(params.notes) ?? defaults.notes,
  };
}

export default function AddLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addLog } = useTraining();
  const initialValues = useMemo(() => buildInitialValues(params), [params]);

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
      initialValues={initialValues}
      quickTemplates={getQuickTemplates()}
      onBack={() => router.back()}
      onSubmit={handleSubmit}
    />
  );
}
