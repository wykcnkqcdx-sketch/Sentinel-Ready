import { tokens as T } from '@/src/theme/tokens';
import { useTraining, type TrainingCategory } from '@/src/screens/TrainingContext';
import { CATEGORY_COLORS } from '@/src/utils/adaptivePlanUtils';
import { buildTimeline, type TimelineEvent } from '@/src/utils/timelineUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FILTER_OPTIONS: Array<{ label: string; value: TrainingCategory | 'ALL' }> = [
  { label: 'ALL', value: 'ALL' },
  { label: 'RUCK', value: 'Ruck' },
  { label: 'STRENGTH', value: 'Strength' },
  { label: 'RUN', value: 'Run' },
  { label: 'MILITARY', value: 'Military' },
  { label: 'TEST', value: 'Test' },
  { label: 'RECOVERY', value: 'Recovery' },
  { label: 'MOBILITY', value: 'Mobility' },
];

function readinessTone(r: number): string {
  if (r >= 8) return '#91e6a3';
  if (r >= 6) return '#ffaa44';
  if (r > 0) return '#e05050';
  return '#2e5038';
}

function confidenceTone(c?: string): string {
  if (c === 'High') return '#91e6a3';
  if (c === 'Medium') return '#ffaa44';
  if (c === 'Low') return '#e05050';
  return 'transparent';
}

function EventRow({
  event,
  isLast,
  expanded,
  onPress,
}: {
  event: TimelineEvent;
  isLast: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  const catColor = CATEGORY_COLORS[event.category] ?? T.textAccent;
  const rColor = readinessTone(event.readiness);

  return (
    <TouchableOpacity
      style={styles.eventRow}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${event.dayLabel} ${event.type}`}
    >
      {/* Timeline spine */}
      <View style={styles.spine}>
        <View style={[styles.node, { borderColor: catColor, backgroundColor: catColor + '22' }]}>
          <View style={[styles.nodeCore, { backgroundColor: catColor }]} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content */}
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventDay}>{event.dayLabel}</Text>
          <View style={[styles.catBadge, { borderColor: catColor + '55' }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>{event.category.toUpperCase()}</Text>
          </View>
          {event.confidence && (
            <View style={[styles.gpsDot, { backgroundColor: confidenceTone(event.confidence) }]} />
          )}
        </View>

        <Text style={styles.eventType}>{event.type}</Text>

        <View style={styles.metricsRow}>
          <Text style={styles.metricPrimary}>{event.primaryMetric}</Text>
          {event.secondaryMetric ? (
            <Text style={styles.metricSecondary}>{event.secondaryMetric}</Text>
          ) : null}
        </View>

        <View style={styles.statusRow}>
          {event.readiness > 0 && (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipLabel}>READ</Text>
              <Text style={[styles.statusChipValue, { color: rColor }]}>{event.readiness}/10</Text>
            </View>
          )}
          {event.rpe != null && (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipLabel}>RPE</Text>
              <Text style={styles.statusChipValue}>{event.rpe}/10</Text>
            </View>
          )}
          {event.confidence && (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipLabel}>GPS</Text>
              <Text style={[styles.statusChipValue, { color: confidenceTone(event.confidence) }]}>
                {event.confidence.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {expanded && event.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>FIELD NOTES</Text>
            <Text style={styles.notesText}>{event.notes}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function TimelineScreen() {
  const router = useRouter();
  const { logs, isLoading } = useTraining();
  const [filter, setFilter] = useState<TrainingCategory | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const months = useMemo(
    () => buildTimeline(logs, filter === 'ALL' ? undefined : filter),
    [logs, filter],
  );

  const totalEvents = useMemo(() => months.reduce((s, m) => s + m.events.length, 0), [months]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>// OPERATIONS LOG //</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>INCIDENT TIMELINE</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalEvents}</Text>
          </View>
        </View>
        <View style={styles.divider} />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          const color = opt.value === 'ALL' ? T.textAccent : (CATEGORY_COLORS[opt.value] ?? T.textAccent);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterChip, active && { borderColor: color, backgroundColor: color + '18' }]}
              onPress={() => { setFilter(opt.value); setExpandedId(null); }}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${opt.label}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterChipText, active && { color }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.timelineContent}>
        {months.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO EVENTS</Text>
            <Text style={styles.emptySubtext}>No logged sessions match this filter.</Text>
          </View>
        ) : (
          months.map((month) => (
            <View key={month.key}>
              {/* Month separator */}
              <View style={styles.monthSep}>
                <View style={styles.monthLine} />
                <Text style={styles.monthLabel}>{month.label}</Text>
                <View style={styles.monthLine} />
              </View>

              {/* Events */}
              {month.events.map((event, idx) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isLast={idx === month.events.length - 1}
                  expanded={expandedId === event.id}
                  onPress={() => setExpandedId(expandedId === event.id ? null : event.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },

  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  filterChip: { borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipText: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  timelineContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 4 },

  monthSep: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  monthLine: { flex: 1, height: 1, backgroundColor: '#1e3826' },
  monthLabel: { color: '#2e5a3a', fontSize: 10, fontWeight: '900', letterSpacing: 3 },

  eventRow: { flexDirection: 'row', gap: 14, minHeight: 64 },
  spine: { width: 24, alignItems: 'center', paddingTop: 4 },
  node: { width: 14, height: 14, borderRadius: 2, borderWidth: 1.5, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' },
  nodeCore: { width: 5, height: 5, borderRadius: 1 },
  line: { flex: 1, width: 1, backgroundColor: '#172c20', marginTop: 4, marginBottom: 0 },

  eventContent: { flex: 1, paddingBottom: 20, gap: 5 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventDay: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  catBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
  catBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },

  eventType: { color: T.textPrimaryDark, fontSize: 14, fontWeight: '900', letterSpacing: 0.1 },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metricPrimary: { color: T.textSubtle, fontSize: 12, fontWeight: '800' },
  metricSecondary: { color: T.textHintDark, fontSize: 11, fontWeight: '700' },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  statusChipLabel: { color: '#2e5038', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  statusChipValue: { color: T.textSubtle, fontSize: 11, fontWeight: '900' },

  notesBox: { backgroundColor: '#0a1610', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: '#1e3826', borderWidth: 1, borderColor: T.borderDim, padding: 10, gap: 4, marginTop: 4 },
  notesLabel: { color: '#2e5038', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  notesText: { color: T.textSubtle, fontSize: 12, lineHeight: 18, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: T.textHintDark, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  emptySubtext: { color: '#2e5038', fontSize: 13, fontWeight: '700' },
});
