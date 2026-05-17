import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import {
  CATEGORY_COLORS,
  generateAdaptivePlan,
  GOAL_OPTIONS,
  INTENSITY_COLORS,
  type AdaptivePlan,
  type AdaptiveWeek,
  type PlanGoalType,
} from '@/src/utils/adaptivePlanUtils';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEK_OPTIONS = [4, 6, 8, 12];

function WeekView({ week }: { week: AdaptiveWeek }) {
  const [expanded, setExpanded] = useState(week.weekNum === 1);
  const accentColor = week.isDeloadWeek ? '#3fc8e4' : '#91e6a3';

  return (
    <View style={[styles.weekCard, week.isDeloadWeek && styles.weekDeload]}>
      <TouchableOpacity style={styles.weekHeader} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
        <View style={[styles.weekAccent, { backgroundColor: accentColor }]} />
        <View style={styles.weekHeaderInner}>
          <View>
            <Text style={[styles.weekLabel, { color: accentColor }]}>WEEK {week.weekNum}</Text>
            {week.isDeloadWeek && (
              <View style={styles.deloadChip}><Text style={styles.deloadText}>DELOAD</Text></View>
            )}
          </View>
          <Text style={styles.weekFocus} numberOfLines={1}>{week.focus.replace(`WEEK ${week.weekNum} — `, '')}</Text>
          <View style={styles.weekMeta}>
            <Text style={styles.weekMinutes}>{week.totalMinutes}min</Text>
            <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.daysGrid}>
          {week.days.map((dayItem) => (
            <View key={dayItem.dayIndex} style={styles.dayRow}>
              <Text style={[styles.dayLabel, dayItem.isRestDay && styles.dayLabelRest]}>{dayItem.label}</Text>
              <View style={styles.daySessions}>
                {dayItem.isRestDay
                  ? <Text style={styles.restText}>REST</Text>
                  : dayItem.sessions.map((sess, i) => {
                      const catColor = CATEGORY_COLORS[sess.category] ?? '#7a9480';
                      return (
                        <View key={i} style={[styles.sessionChip, { borderLeftColor: catColor, borderColor: catColor + '33' }]}>
                          <View style={styles.sessionTop}>
                            <Text style={[styles.sessionCat, { color: catColor }]}>{sess.category.toUpperCase()}</Text>
                            <Text style={[styles.sessionIntensity, { color: INTENSITY_COLORS[sess.intensity] }]}>
                              {sess.intensity.toUpperCase()}
                            </Text>
                            <Text style={styles.sessionDur}>{sess.durationMin}min</Text>
                          </View>
                          <Text style={styles.sessionDesc} numberOfLines={2}>{sess.description}</Text>
                        </View>
                      );
                    })
                }
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AdaptivePlanScreen() {
  const { logs } = useTraining();
  const { profile } = useUser();
  const router = useRouter();

  const [goalType, setGoalType] = useState<PlanGoalType>('general_fitness');
  const [weeks, setWeeks] = useState(8);
  const [plan, setPlan] = useState<AdaptivePlan | null>(null);

  function generate() {
    const generated = generateAdaptivePlan(goalType, weeks, profile, logs);
    setPlan(generated);
  }

  const selectedGoal = GOAL_OPTIONS.find((g) => g.value === goalType)!;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.screenKicker}>// ADAPTIVE PLANNER //</Text>
      </View>

      {/* Config card */}
      <View style={styles.configCard}>
        <View style={styles.cardAccent} />
        <View style={styles.configInner}>
          <Text style={styles.configKicker}>MISSION PARAMETERS</Text>
          <Text style={styles.configTitle}>Build Your Training Plan</Text>
          <Text style={styles.configSub}>
            Select a goal and timeline. The plan adapts to your training level ({profile.trainingLevel ?? 'Intermediate'}) with a deload every 4th week.
          </Text>

          {/* Goal type */}
          <Text style={styles.sectionLabel}>GOAL TYPE</Text>
          <View style={styles.goalGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.goalChip, goalType === opt.value && styles.goalChipActive]}
                onPress={() => setGoalType(opt.value)}
              >
                <Text style={[styles.goalChipLabel, goalType === opt.value && styles.goalChipLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.goalChipDesc} numberOfLines={2}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weeks */}
          <Text style={styles.sectionLabel}>DURATION</Text>
          <View style={styles.weeksRow}>
            {WEEK_OPTIONS.map((w) => (
              <TouchableOpacity
                key={w}
                style={[styles.weekChip, weeks === w && styles.weekChipActive]}
                onPress={() => setWeeks(w)}
              >
                <Text style={[styles.weekChipText, weeks === w && styles.weekChipTextActive]}>{w}W</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.generateBtn} onPress={generate} activeOpacity={0.8}>
            <Text style={styles.generateBtnText}>◈  GENERATE PLAN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Generated plan */}
      {plan && (
        <>
          <View style={styles.planHeader}>
            <View style={styles.planHeaderAccent} />
            <View style={styles.planHeaderInner}>
              <Text style={styles.planKicker}>// GENERATED PLAN</Text>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planSummary}>{plan.summary}</Text>
              <View style={styles.planStats}>
                <View style={styles.planStat}>
                  <Text style={styles.planStatVal}>{plan.weeksCount}</Text>
                  <Text style={styles.planStatLabel}>WEEKS</Text>
                </View>
                <View style={styles.planStat}>
                  <Text style={styles.planStatVal}>{plan.weeks.filter((w) => !w.isDeloadWeek).length}</Text>
                  <Text style={styles.planStatLabel}>BUILD</Text>
                </View>
                <View style={styles.planStat}>
                  <Text style={styles.planStatVal}>{plan.weeks.filter((w) => w.isDeloadWeek).length}</Text>
                  <Text style={styles.planStatLabel}>DELOAD</Text>
                </View>
                <View style={styles.planStat}>
                  <Text style={styles.planStatVal}>{plan.weeks.reduce((s, w) => s + w.totalMinutes, 0)}</Text>
                  <Text style={styles.planStatLabel}>TOTAL MIN</Text>
                </View>
              </View>
            </View>
          </View>

          {plan.weeks.map((week) => (
            <WeekView key={week.weekNum} week={week} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050e09' },
  content: { padding: 16, paddingBottom: 80, gap: 12 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 4 },
  backBtn: { paddingVertical: 6, paddingRight: 16 },
  backText: { color: '#3a6b46', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  screenKicker: { color: '#3a6b46', fontSize: 10, fontWeight: '900', letterSpacing: 3 },

  configCard: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  cardAccent: { width: 3, flexShrink: 0, backgroundColor: '#91e6a3' },
  configInner: { flex: 1, padding: 16, gap: 12 },
  configKicker: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  configTitle: { color: '#edf5ea', fontSize: 18, fontWeight: '900' },
  configSub: { color: '#7a9480', fontSize: 12, fontWeight: '600', lineHeight: 17 },

  sectionLabel: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5, marginTop: 4 },
  goalGrid: { gap: 6 },
  goalChip: { padding: 12, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#050e09' },
  goalChipActive: { borderColor: '#3a6b46', backgroundColor: 'rgba(145,230,163,0.06)' },
  goalChipLabel: { color: '#5a7a62', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 3 },
  goalChipLabelActive: { color: '#91e6a3' },
  goalChipDesc: { color: '#3a5040', fontSize: 11, fontWeight: '600', lineHeight: 15 },

  weeksRow: { flexDirection: 'row', gap: 8 },
  weekChip: { flex: 1, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#050e09', alignItems: 'center' },
  weekChipActive: { borderColor: '#3a6b46', backgroundColor: 'rgba(145,230,163,0.08)' },
  weekChipText: { color: '#5a7a62', fontSize: 13, fontWeight: '900' },
  weekChipTextActive: { color: '#91e6a3' },

  generateBtn: { backgroundColor: '#91e6a3', borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  generateBtnText: { color: '#050e09', fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  planHeader: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#235c32', backgroundColor: '#0a1610' },
  planHeaderAccent: { width: 3, flexShrink: 0, backgroundColor: '#91e6a3' },
  planHeaderInner: { flex: 1, padding: 16, gap: 8 },
  planKicker: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  planTitle: { color: '#edf5ea', fontSize: 18, fontWeight: '900' },
  planSummary: { color: '#7a9480', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  planStats: { flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: '#172c20', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  planStat: { flex: 1, padding: 10, alignItems: 'center', gap: 3, borderRightWidth: 1, borderRightColor: '#172c20' },
  planStatVal: { color: '#91e6a3', fontSize: 20, fontWeight: '900' },
  planStatLabel: { color: '#3a6b46', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },

  weekCard: { borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610', overflow: 'hidden' },
  weekDeload: { borderColor: '#1e4a5a', backgroundColor: '#071218' },
  weekHeader: { flexDirection: 'row' },
  weekAccent: { width: 3, flexShrink: 0 },
  weekHeaderInner: { flex: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  deloadChip: { backgroundColor: 'rgba(63,200,228,0.1)', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, marginTop: 2 },
  deloadText: { color: '#3fc8e4', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  weekFocus: { flex: 1, color: '#7a9480', fontSize: 11, fontWeight: '700' },
  weekMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekMinutes: { color: '#5a7a62', fontSize: 10, fontWeight: '900' },
  expandIcon: { color: '#3a6b46', fontSize: 9 },

  daysGrid: { borderTopWidth: 1, borderTopColor: '#172c20', padding: 12, gap: 6 },
  dayRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dayLabel: { width: 28, color: '#91e6a3', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, paddingTop: 8 },
  dayLabelRest: { color: '#3a5040' },
  daySessions: { flex: 1, gap: 4 },
  restText: { color: '#3a5040', fontSize: 9, fontWeight: '900', letterSpacing: 2, paddingTop: 6 },
  sessionChip: { borderRadius: 4, borderWidth: 1, borderLeftWidth: 3, padding: 8, backgroundColor: '#050e09', gap: 4 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionCat: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  sessionIntensity: { fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sessionDur: { marginLeft: 'auto', color: '#5a7a62', fontSize: 9, fontWeight: '900' },
  sessionDesc: { color: '#7a9480', fontSize: 11, fontWeight: '600', lineHeight: 15 },
});
