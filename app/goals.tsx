import { GoalCategory, GoalStatus, TrainingGoal, useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import dfiftJson from '@/src/data/standards/dfift-standards.json';
import type { DfiftStandards } from '@/src/types/dfift';
import { buildGoalSuggestions, GoalSuggestion } from '@/src/utils/goalSuggestionUtils';
import { buildGoalAction, buildGoalSummary, getGoalProgress } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const categories: GoalCategory[] = [
  'Ruck',
  'Run',
  'Strength',
  'Resistance',
  'Hiking',
  'Military',
  'Recovery',
  'Test',
  'Consistency',
];

const blankGoal = {
  category: 'Ruck' as GoalCategory,
  title: '',
  target: '',
  current: '',
  deadline: '',
  notes: '',
  status: 'active' as GoalStatus,
};

function GoalCard({
  goal,
  onToggle,
  onDelete,
  onEdit,
}: {
  goal: TrainingGoal;
  onToggle: (goal: TrainingGoal) => void;
  onDelete: (goal: TrainingGoal) => void;
  onEdit: (goal: TrainingGoal) => void;
}) {
  const complete = goal.status === 'complete';
  const progress = getGoalProgress(goal);
  return (
    <View style={complete ? styles.goalCardComplete : styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleBlock}>
          <Text style={styles.goalKicker}>{goal.category.toUpperCase()}</Text>
          <Text style={complete ? styles.goalTitleComplete : styles.goalTitle}>{goal.title}</Text>
        </View>
        <TouchableOpacity style={complete ? styles.statusPillComplete : styles.statusPill} onPress={() => onToggle(goal)}>
          <Text style={complete ? styles.statusTextComplete : styles.statusText}>{complete ? 'Complete' : 'Active'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.goalText}>Target: {goal.target}</Text>
      <Text style={styles.goalText}>Current: {goal.current || 'Not recorded yet'}</Text>
      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressValue}>{progress.label}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
        </View>
      </View>
      {goal.deadline ? <Text style={styles.goalSubText}>Deadline: {goal.deadline}</Text> : null}
      {goal.notes ? <Text style={styles.goalSubText}>{goal.notes}</Text> : null}
      <View style={styles.goalActions}>
        <TouchableOpacity style={styles.smallButton} onPress={() => onEdit(goal)}>
          <Text style={styles.smallButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButtonDanger} onPress={() => onDelete(goal)}>
          <Text style={styles.smallButtonDangerText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const router = useRouter();
  const { logs, goals, addGoal, updateGoal, deleteGoal, isLoading } = useTraining();
  const { gender } = useUser();
  const [draft, setDraft] = useState(blankGoal);
  const [editingId, setEditingId] = useState<number | null>(null);
  const summary = useMemo(() => buildGoalSummary(goals), [goals]);
  const goalAction = useMemo(() => buildGoalAction(goals, logs), [goals, logs]);
  const dfiftStandards = dfiftJson as DfiftStandards;
  const suggestions = useMemo(
    () => buildGoalSuggestions(logs, goals, { standards: dfiftStandards, gender }),
    [logs, goals, gender]
  );

  async function saveGoal() {
    if (draft.title.trim().length < 3 || draft.target.trim().length < 3) {
      Alert.alert('Check Goal', 'Add a clear title and target.');
      return;
    }
    const payload = {
      category: draft.category,
      title: draft.title.trim(),
      target: draft.target.trim(),
      current: draft.current.trim(),
      deadline: draft.deadline.trim(),
      notes: draft.notes.trim(),
      status: draft.status,
    };
    if (editingId) {
      await updateGoal(editingId, payload);
    } else {
      await addGoal(payload);
    }
    setDraft(blankGoal);
    setEditingId(null);
  }

  function editGoal(goal: TrainingGoal) {
    setDraft({
      category: goal.category,
      title: goal.title,
      target: goal.target,
      current: goal.current,
      deadline: goal.deadline,
      notes: goal.notes,
      status: goal.status,
    });
    setEditingId(goal.id);
  }

  function confirmDelete(goal: TrainingGoal) {
    Alert.alert('Delete Goal', `Delete ${goal.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goal.id) },
    ]);
  }

  async function addSuggestedGoal(suggestion: GoalSuggestion) {
    await addGoal({
      category: suggestion.category,
      title: suggestion.title,
      target: suggestion.target,
      current: suggestion.current,
      deadline: '',
      notes: suggestion.notes,
      status: 'active',
    });
  }

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.kicker}>SENTINEL READY</Text>
      <Text style={styles.title}>Goals</Text>
      <Text style={styles.subtitle}>Set targets that shape the dashboard, training plan and weekly report.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.cardKicker}>GOAL TRACKING</Text>
        <Text style={styles.summaryNumber}>{summary.active} active / {summary.complete} complete</Text>
        <Text style={styles.summaryProgress}>{summary.averageProgress > 0 ? `${summary.averageProgress}% average measured progress` : 'No measured progress yet'}</Text>
        <Text style={styles.summaryText}>{summary.message}</Text>
      </View>

      <View style={goalAction.status === 'warning' ? styles.actionCardWarning : styles.actionCard}>
        <Text style={styles.cardKicker}>NEXT GOAL ACTION</Text>
        <Text style={goalAction.status === 'warning' ? styles.actionTitleWarning : styles.actionTitle}>{goalAction.title}</Text>
        <Text style={styles.summaryText}>{goalAction.reason}</Text>
        <Text style={styles.actionText}>{goalAction.action}</Text>
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.suggestionCard}>
          <Text style={styles.cardKicker}>SUGGESTED GOALS</Text>
          {suggestions.map((suggestion) => (
            <View key={`${suggestion.category}-${suggestion.title}`} style={styles.suggestionItem}>
              <View style={styles.suggestionTextBlock}>
                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                <Text style={styles.suggestionTarget}>{suggestion.target}</Text>
              </View>
              <TouchableOpacity style={styles.suggestionButton} onPress={() => addSuggestedGoal(suggestion)}>
                <Text style={styles.suggestionButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.cardKicker}>{editingId ? 'EDIT GOAL' : 'NEW GOAL'}</Text>
        <View style={styles.categoryRow}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={draft.category === category ? styles.categoryActive : styles.categoryButton}
              onPress={() => setDraft((current) => ({ ...current, category }))}
            >
              <Text style={draft.category === category ? styles.categoryTextActive : styles.categoryText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} value={draft.title} onChangeText={(title) => setDraft((current) => ({ ...current, title }))} placeholder="Goal title" placeholderTextColor="#6f7d70" />
        <TextInput style={styles.input} value={draft.target} onChangeText={(target) => setDraft((current) => ({ ...current, target }))} placeholder="Target" placeholderTextColor="#6f7d70" />
        <TextInput style={styles.input} value={draft.current} onChangeText={(current) => setDraft((old) => ({ ...old, current }))} placeholder="Current status" placeholderTextColor="#6f7d70" />
        <TextInput style={styles.input} value={draft.deadline} onChangeText={(deadline) => setDraft((current) => ({ ...current, deadline }))} placeholder="Deadline YYYY-MM-DD optional" placeholderTextColor="#6f7d70" maxLength={10} />
        <TextInput style={[styles.input, styles.notes]} value={draft.notes} onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))} placeholder="Notes" placeholderTextColor="#6f7d70" multiline />
        <TouchableOpacity style={styles.saveButton} onPress={saveGoal}>
          <Text style={styles.saveButtonText}>{editingId ? 'Update Goal' : 'Add Goal'}</Text>
        </TouchableOpacity>
      </View>

      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onEdit={editGoal}
          onDelete={confirmDelete}
          onToggle={(item) => updateGoal(item.id, { ...item, status: item.status === 'active' ? 'complete' : 'active' })}
        />
      ))}
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
  summaryCard: { backgroundColor: '#102016', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d6b3f', gap: 7 },
  cardKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  summaryNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  summaryProgress: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  summaryText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },
  actionCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 7 },
  actionCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 7 },
  actionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  actionTitleWarning: { color: '#ffb86b', fontSize: 20, fontWeight: '900' },
  actionText: { color: '#dfe8da', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  suggestionCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 10 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#07110c', borderRadius: 14, borderWidth: 1, borderColor: '#26382c', padding: 12 },
  suggestionTextBlock: { flex: 1, gap: 3 },
  suggestionTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  suggestionReason: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  suggestionTarget: { color: '#aeb8aa', fontSize: 12, lineHeight: 18 },
  suggestionButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  suggestionButtonText: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  formCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryActive: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  categoryTextActive: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  input: { backgroundColor: '#07110c', borderWidth: 1, borderColor: '#35523e', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, color: '#ffffff', fontSize: 14 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#91e6a3', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: '#07110c', fontSize: 14, fontWeight: '900' },
  goalCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 8 },
  goalCardComplete: { backgroundColor: '#0a1510', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 8 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  goalTitleBlock: { flex: 1 },
  goalKicker: { color: '#91e6a3', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  goalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 3 },
  goalTitleComplete: { color: '#91e6a3', fontSize: 18, fontWeight: '900', marginTop: 3 },
  goalText: { color: '#dfe8da', fontSize: 13, lineHeight: 19, fontWeight: '800' },
  goalSubText: { color: '#8fbf8f', fontSize: 12, lineHeight: 18 },
  progressBlock: { gap: 6, marginTop: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  progressValue: { color: '#dfe8da', fontSize: 11, fontWeight: '900', flex: 1, textAlign: 'right' },
  progressTrack: { height: 8, backgroundColor: '#07110c', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#26382c' },
  progressFill: { height: '100%', backgroundColor: '#91e6a3', borderRadius: 999 },
  statusPill: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusPillComplete: { backgroundColor: '#1e3a27', borderWidth: 1, borderColor: '#58d77a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  statusTextComplete: { color: '#bfffcf', fontSize: 11, fontWeight: '900' },
  goalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  smallButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: '#c8f7d0', fontSize: 12, fontWeight: '900' },
  smallButtonDanger: { borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonDangerText: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
});
