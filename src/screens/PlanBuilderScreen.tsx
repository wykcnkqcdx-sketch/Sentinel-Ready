import {
  clearCustomPlan,
  emptyPlan,
  loadCustomPlan,
  saveCustomPlan,
} from '@/src/services/customPlanService';
import type { CustomPlan, PlanCategory, PlanDay, PlanSession } from '@/src/types/customPlan';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CATEGORIES: PlanCategory[] = [
  'Ruck',
  'Run',
  'Strength',
  'Recovery',
  'Hiking',
  'Mobility',
  'Test',
];

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type InlineForm = {
  dayIndex: number;
  category: PlanCategory;
  durationMin: number;
};

function makeSessionId(dayIndex: number): string {
  return `${dayIndex}-${Date.now()}`;
}

function clampDuration(value: number): number {
  return Math.min(180, Math.max(15, value));
}

export default function PlanBuilderScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomPlan>(emptyPlan());
  const [activeForm, setActiveForm] = useState<InlineForm | null>(null);

  useEffect(() => {
    loadCustomPlan().then((saved) => {
      if (saved) setPlan(saved);
    });
  }, []);

  const openForm = useCallback((dayIndex: number) => {
    setActiveForm({ dayIndex, category: 'Ruck', durationMin: 60 });
  }, []);

  const closeForm = useCallback(() => {
    setActiveForm(null);
  }, []);

  const setFormCategory = useCallback((category: PlanCategory) => {
    setActiveForm((prev) => (prev ? { ...prev, category } : prev));
  }, []);

  const stepDuration = useCallback((delta: number) => {
    setActiveForm((prev) =>
      prev ? { ...prev, durationMin: clampDuration(prev.durationMin + delta) } : prev
    );
  }, []);

  const commitSession = useCallback(() => {
    if (!activeForm) return;
    const { dayIndex, category, durationMin } = activeForm;
    const newSession: PlanSession = {
      id: makeSessionId(dayIndex),
      category,
      durationMin,
      notes: '',
    };
    setPlan((prev) => {
      const days = prev.days.map((d) =>
        d.dayIndex === dayIndex
          ? { ...d, sessions: [...d.sessions, newSession] }
          : d
      );
      return { ...prev, days, updatedAt: new Date().toISOString() };
    });
    setActiveForm(null);
  }, [activeForm]);

  const deleteSession = useCallback((dayIndex: number, sessionId: string) => {
    setPlan((prev) => {
      const days = prev.days.map((d) =>
        d.dayIndex === dayIndex
          ? { ...d, sessions: d.sessions.filter((s) => s.id !== sessionId) }
          : d
      );
      return { ...prev, days, updatedAt: new Date().toISOString() };
    });
  }, []);

  const handleSave = useCallback(async () => {
    await saveCustomPlan(plan);
    Alert.alert('Saved', 'Your plan has been saved.');
    router.back();
  }, [plan, router]);

  const handleReset = useCallback(async () => {
    await clearCustomPlan();
    router.back();
  }, [router]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WEEKLY PLAN</Text>
        <TouchableOpacity onPress={handleReset} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Reset to Auto</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {plan.days.map((day: PlanDay) => (
          <DayCard
            key={day.dayIndex}
            day={day}
            activeForm={activeForm}
            onOpenForm={openForm}
            onCloseForm={closeForm}
            onSetCategory={setFormCategory}
            onStepDuration={stepDuration}
            onCommit={commitSession}
            onDeleteSession={deleteSession}
          />
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>SAVE PLAN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type DayCardProps = {
  day: PlanDay;
  activeForm: InlineForm | null;
  onOpenForm: (dayIndex: number) => void;
  onCloseForm: () => void;
  onSetCategory: (cat: PlanCategory) => void;
  onStepDuration: (delta: number) => void;
  onCommit: () => void;
  onDeleteSession: (dayIndex: number, sessionId: string) => void;
};

function DayCard({
  day,
  activeForm,
  onOpenForm,
  onCloseForm,
  onSetCategory,
  onStepDuration,
  onCommit,
  onDeleteSession,
}: DayCardProps) {
  const isFormOpen = activeForm?.dayIndex === day.dayIndex;

  return (
    <View style={styles.dayCard}>
      <Text style={styles.dayLabel}>{DAY_LABELS[day.dayIndex]}</Text>

      {day.sessions.map((session) => (
        <View key={session.id} style={styles.sessionRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{session.category}</Text>
          </View>
          <Text style={styles.sessionDuration}>{session.durationMin} min</Text>
          <TouchableOpacity
            onPress={() => onDeleteSession(day.dayIndex, session.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {isFormOpen && activeForm ? (
        <View style={styles.inlineForm}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPills}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  activeForm.category === cat && styles.categoryPillActive,
                ]}
                onPress={() => onSetCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    activeForm.category === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => onStepDuration(-15)}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{activeForm.durationMin} min</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => onStepDuration(15)}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.addButton} onPress={onCommit}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCloseForm}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addSessionButton}
          onPress={() => onOpenForm(day.dayIndex)}
        >
          <Text style={styles.addSessionText}>+ Add Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: { color: '#91e6a3', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  ghostButton: {
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ghostButtonText: { color: '#aeb8aa', fontSize: 13, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 120, gap: 12 },

  dayCard: {
    backgroundColor: '#0e1f15',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a2e1f',
    gap: 10,
  },
  dayLabel: { color: '#91e6a3', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#07110c',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1a2e1f',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipText: { color: '#91e6a3', fontSize: 12, fontWeight: '700' },
  sessionDuration: { color: '#aeb8aa', fontSize: 12, fontWeight: '700', flex: 1 },
  deleteButton: { padding: 4 },
  deleteButtonText: { color: '#aeb8aa', fontSize: 14, fontWeight: '700' },

  addSessionButton: {
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  addSessionText: { color: '#91e6a3', fontSize: 13, fontWeight: '700' },

  inlineForm: { gap: 10 },
  categoryPills: { gap: 6, flexDirection: 'row' },
  categoryPill: {
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillActive: { backgroundColor: '#91e6a3', borderColor: '#91e6a3' },
  categoryPillText: { color: '#aeb8aa', fontSize: 12, fontWeight: '700' },
  categoryPillTextActive: { color: '#07110c', fontSize: 12, fontWeight: '700' },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'center',
  },
  stepperButton: {
    backgroundColor: '#1a2e1f',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { color: '#91e6a3', fontSize: 20, fontWeight: '700' },
  stepperValue: { color: '#f4f7f0', fontSize: 16, fontWeight: '700', minWidth: 70, textAlign: 'center' },

  formActions: { flexDirection: 'row', gap: 10 },
  addButton: {
    flex: 1,
    backgroundColor: '#91e6a3',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1a2e1f',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#aeb8aa', fontSize: 13, fontWeight: '700' },

  saveButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#07110c', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
