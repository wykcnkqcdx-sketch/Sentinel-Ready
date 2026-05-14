import { TrainingCategory, TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type TrainingFilter = 'All' | TrainingCategory;
type SortMode = 'Newest' | 'Oldest' | 'Highest Readiness' | 'Lowest Readiness';

const filters: TrainingFilter[] = ['All', 'Ruck', 'Strength', 'Run', 'Mobility', 'Test', 'Recovery'];
const sortModes: SortMode[] = ['Newest', 'Oldest', 'Highest Readiness', 'Lowest Readiness'];

function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

function getDateValue(date: string) {
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getReadinessLabel(readiness: string) {
  const score = Number(readiness);

  if (Number.isNaN(score)) return 'Unknown';
  if (score <= 3) return 'Low';
  if (score <= 5) return 'Fatigue Watch';
  if (score <= 7) return 'Moderate';

  return 'High';
}

function getNotesQualityMessage(notes: string) {
  const cleanNotes = notes.trim().toLowerCase();

  if (!cleanNotes) return 'missing notes';

  const weakNotes = ['ok', 'okay', 'good', 'fine', 'grand', 'easy', 'hard', 'done', 'completed'];

  if (weakNotes.includes(cleanNotes)) return 'notes too brief';
  if (cleanNotes.length < 15) return 'notes need more detail';

  return '';
}

function getWeakLogReasons(log: TrainingLog) {
  const reasons: string[] = [];

  if (!log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) reasons.push('date');
  if (!log.type || log.type.trim().length < 3) reasons.push('session type');
  if (!log.duration || log.duration.trim().length < 3) reasons.push('duration');
  if (!log.distanceLoad || log.distanceLoad.trim().length < 5) reasons.push('distance/load');

  const readinessNumber = Number(log.readiness);
  if (Number.isNaN(readinessNumber) || readinessNumber < 1 || readinessNumber > 10) {
    reasons.push('readiness score');
  }

  const notesIssue = getNotesQualityMessage(log.notes);
  if (notesIssue) reasons.push(notesIssue);

  return reasons;
}

function logNeedsImprovement(log: TrainingLog) {
  return getWeakLogReasons(log).length > 0;
}

function buildSummary(logs: TrainingLog[]) {
  const readinessScores = logs
    .map((log) => getReadinessNumber(log.readiness))
    .filter((score) => score > 0);

  const averageReadiness =
    readinessScores.length > 0
      ? (readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length).toFixed(1)
      : '0.0';

  return {
    total: logs.length,
    averageReadiness,
    ruck: logs.filter((log) => log.category === 'Ruck').length,
    strength: logs.filter((log) => log.category === 'Strength').length,
    run: logs.filter((log) => log.category === 'Run').length,
    recovery: logs.filter((log) => log.category === 'Recovery').length,
    fatigueWatch: logs.filter((log) => isFatigueWatch(log.readiness)).length,
    weakLogs: logs.filter((log) => logNeedsImprovement(log)).length,
  };
}

function calculateTrainingLogHealthScore(logs: TrainingLog[]) {
  if (logs.length === 0) return 0;

  const weakLogs = logs.filter((log) => logNeedsImprovement(log)).length;
  const fatigueLogs = logs.filter((log) => isFatigueWatch(log.readiness)).length;

  const readinessScores = logs
    .map((log) => getReadinessNumber(log.readiness))
    .filter((score) => score > 0);

  const averageReadiness =
    readinessScores.length > 0
      ? readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length
      : 0;

  const readinessScore = Math.round(averageReadiness * 10);
  const weakPenalty = Math.round((weakLogs / logs.length) * 35);
  const fatiguePenalty = Math.round((fatigueLogs / logs.length) * 15);

  return Math.max(0, Math.min(100, readinessScore - weakPenalty - fatiguePenalty));
}

function getTrainingLogHealthLabel(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Healthy';
  if (score >= 50) return 'Needs Work';

  return 'Poor Data';
}

function getTrainingLogHealthMessage(score: number) {
  if (score >= 85) return 'Training data is strong enough for useful readiness and recovery review.';
  if (score >= 70) return 'Training data is usable. Improve weak notes and missing details to sharpen analysis.';
  if (score >= 50) return 'Training data needs work. Fix weak logs so the app can give better feedback.';

  return 'Training data is too weak for reliable analysis. Add clearer notes, duration, load and readiness scores.';
}

function filterAndSortLogs(
  logs: TrainingLog[],
  activeFilter: TrainingFilter,
  searchQuery: string,
  sortMode: SortMode,
  showWeakLogsOnly: boolean
) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = logs.filter((log) => {
    const matchesFilter = activeFilter === 'All' || log.category === activeFilter;

    const searchableText = [
      log.date,
      log.category,
      log.type,
      log.duration,
      log.distanceLoad,
      log.readiness,
      log.notes,
    ].join(' ').toLowerCase();

    const matchesSearch = query.length === 0 || searchableText.includes(query);
    const matchesWeak = !showWeakLogsOnly || logNeedsImprovement(log);

    return matchesFilter && matchesSearch && matchesWeak;
  });

  return filtered.sort((a, b) => {
    if (sortMode === 'Oldest') {
      return getDateValue(a.date) - getDateValue(b.date) || a.id - b.id;
    }

    if (sortMode === 'Highest Readiness') {
      return getReadinessNumber(b.readiness) - getReadinessNumber(a.readiness) || b.id - a.id;
    }

    if (sortMode === 'Lowest Readiness') {
      return getReadinessNumber(a.readiness) - getReadinessNumber(b.readiness) || b.id - a.id;
    }

    return getDateValue(b.date) - getDateValue(a.date) || b.id - a.id;
  });
}

export default function LogScreen() {
  const { logs, isLoading, deleteLog } = useTraining();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<TrainingFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWeakLogsOnly, setShowWeakLogsOnly] = useState(false);

  const summary = buildSummary(logs);
  const trainingLogHealthScore = calculateTrainingLogHealthScore(logs);
  const trainingLogHealthLabel = getTrainingLogHealthLabel(trainingLogHealthScore);
  const trainingLogHealthMessage = getTrainingLogHealthMessage(trainingLogHealthScore);

  const visibleLogs = useMemo(
    () => filterAndSortLogs(logs, activeFilter, searchQuery, sortMode, showWeakLogsOnly),
    [logs, activeFilter, searchQuery, sortMode, showWeakLogsOnly]
  );

  function clearSearchAndFilters() {
    setActiveFilter('All');
    setSortMode('Newest');
    setSearchQuery('');
    setShowWeakLogsOnly(false);
  }

  function confirmDeleteLog(log: TrainingLog) {
    Alert.alert(
      'Delete Training Log',
      `Delete this ${log.category} log from ${log.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLog(log.id),
        },
      ]
    );
  }

  const renderLogItem = ({ item }: { item: TrainingLog }) => {
    const fatigueWatch = isFatigueWatch(item.readiness);
    const weakLog = logNeedsImprovement(item);
    const weakReasons = getWeakLogReasons(item);

    return (
      <View style={fatigueWatch ? styles.logCardWarning : styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.logHeaderText}>
            <Text style={styles.logCategory}>{item.category}</Text>
            <Text style={styles.logTitle}>{item.type}</Text>
          </View>

          <View style={fatigueWatch ? styles.readinessBadgeWarning : styles.readinessBadge}>
            <Text style={fatigueWatch ? styles.readinessTextWarning : styles.readinessText}>
              {item.readiness}/10
            </Text>
          </View>
        </View>

        <View style={styles.logMetaRow}>
          <Text style={styles.logMeta}>{item.date}</Text>
          <Text style={styles.logMeta}>{item.duration}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Distance / Load</Text>
          <Text style={styles.detailText}>{item.distanceLoad}</Text>
        </View>

        <Text style={styles.logNotes}>{item.notes}</Text>

        {weakLog ? (
          <View style={styles.weakLogBox}>
            <Text style={styles.weakLogTitle}>Weak Log</Text>
            <Text style={styles.weakLogText}>Improve: {weakReasons.join(', ')}</Text>
          </View>
        ) : null}

        <View style={styles.statusRow}>
          <Text style={fatigueWatch ? styles.statusWarning : styles.status}>
            {getReadinessLabel(item.readiness)}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/edit-log/${item.id}`)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            {weakLog ? (
              <TouchableOpacity style={styles.improveButton} onPress={() => router.push(`/edit-log/${item.id}`)}>
                <Text style={styles.improveButtonText}>Improve</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteLog(item)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading training logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleLogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>SENTINEL READY</Text>
            <Text style={styles.title}>Training Log</Text>
            <Text style={styles.subtitle}>
              Review saved sessions, readiness, fatigue watch and operational training balance.
            </Text>

            <View style={styles.topButtonRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/add-log')}>
                <Text style={styles.primaryButtonText}>Add Training Log</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/weekly-report')}>
                <Text style={styles.secondaryButtonText}>Weekly Report</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{summary.total}</Text>
                <Text style={styles.summaryLabel}>Total Logs</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{summary.averageReadiness}</Text>
                <Text style={styles.summaryLabel}>Avg Readiness</Text>
              </View>

              <View style={summary.fatigueWatch > 0 ? styles.summaryCardWarning : styles.summaryCard}>
                <Text style={summary.fatigueWatch > 0 ? styles.summaryNumberWarning : styles.summaryNumber}>
                  {summary.fatigueWatch}
                </Text>
                <Text style={summary.fatigueWatch > 0 ? styles.summaryLabelWarning : styles.summaryLabel}>
                  Fatigue Watch
                </Text>
              </View>
            </View>

            <View style={summary.weakLogs > 0 ? styles.weakSummaryCardWarning : styles.weakSummaryCard}>
              <View>
                <Text style={summary.weakLogs > 0 ? styles.weakSummaryNumberWarning : styles.weakSummaryNumber}>
                  {summary.weakLogs}
                </Text>
                <Text style={summary.weakLogs > 0 ? styles.weakSummaryLabelWarning : styles.weakSummaryLabel}>
                  Weak Logs Detected
                </Text>
              </View>

              <TouchableOpacity
                style={showWeakLogsOnly ? styles.weakFilterButtonActive : styles.weakFilterButton}
                onPress={() => setShowWeakLogsOnly((current) => !current)}
              >
                <Text style={showWeakLogsOnly ? styles.weakFilterButtonTextActive : styles.weakFilterButtonText}>
                  {showWeakLogsOnly ? 'Showing Weak' : 'Show Weak'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={trainingLogHealthScore < 60 ? styles.healthCardWarning : styles.healthCard}>
              <View style={styles.healthHeader}>
                <View>
                  <Text style={styles.healthKicker}>TRAINING LOG HEALTH</Text>
                  <Text style={trainingLogHealthScore < 60 ? styles.healthScoreWarning : styles.healthScore}>
                    {trainingLogHealthScore}/100
                  </Text>
                </View>

                <View style={trainingLogHealthScore < 60 ? styles.healthPillWarning : styles.healthPill}>
                  <Text style={trainingLogHealthScore < 60 ? styles.healthPillTextWarning : styles.healthPillText}>
                    {trainingLogHealthLabel}
                  </Text>
                </View>
              </View>

              <Text style={trainingLogHealthScore < 60 ? styles.healthMessageWarning : styles.healthMessage}>
                {trainingLogHealthMessage}
              </Text>
            </View>

            <View style={styles.categorySummary}>
              <Text style={styles.categorySummaryTitle}>Training Split</Text>
              <Text style={styles.categorySummaryText}>
                Ruck {summary.ruck} � Strength {summary.strength} � Run {summary.run} � Recovery {summary.recovery} � Weak {summary.weakLogs}
              </Text>
            </View>

            <View style={styles.controlsCard}>
              <View style={styles.controlsHeader}>
                <View>
                  <Text style={styles.controlsKicker}>MANAGE LOGS</Text>
                  <Text style={styles.controlsTitle}>Search, Filter and Sort</Text>
                </View>

                <TouchableOpacity style={styles.clearButton} onPress={clearSearchAndFilters}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search date, ruck, run, notes, load..."
                placeholderTextColor="#6f7d70"
              />

              <Text style={styles.controlLabel}>Filter</Text>
              <View style={styles.chipRow}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={activeFilter === filter ? styles.chipActive : styles.chip}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text style={activeFilter === filter ? styles.chipTextActive : styles.chipText}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.controlLabel}>Sort</Text>
              <View style={styles.chipRow}>
                {sortModes.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={sortMode === mode ? styles.sortChipActive : styles.sortChip}
                    onPress={() => setSortMode(mode)}
                  >
                    <Text style={sortMode === mode ? styles.sortChipTextActive : styles.sortChipText}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.resultCount}>
                Showing {visibleLogs.length} of {logs.length} logs {showWeakLogsOnly ? '� Weak logs only' : ''}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Recent Logs</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{logs.length === 0 ? 'No logs saved yet' : 'No matching logs'}</Text>
            <Text style={styles.emptyText}>
              {logs.length === 0
                ? 'Add your first training log to start building readiness and recovery data.'
                : 'Try clearing the search, changing the filter, or using a different sort option.'}
            </Text>

            {logs.length === 0 ? (
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/add-log')}>
                <Text style={styles.emptyButtonText}>Add First Log</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.emptyButton} onPress={clearSearchAndFilters}>
                <Text style={styles.emptyButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-log')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  loadingScreen: { flex: 1, backgroundColor: '#07110c', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#91e6a3', fontSize: 15, fontWeight: '900' },
  listContent: { padding: 18, paddingBottom: 110, gap: 14 },
  header: { gap: 12, marginBottom: 4 },
  kicker: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  topButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16 },
  primaryButtonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#91e6a3', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16 },
  secondaryButtonText: { color: '#91e6a3', fontSize: 13, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: '#0d1812', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#203529' },
  summaryCardWarning: { flex: 1, backgroundColor: '#21140b', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#7a4a1f' },
  summaryNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  summaryNumberWarning: { color: '#ffb86b', fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: '#aeb8aa', fontSize: 11, fontWeight: '800', marginTop: 4 },
  summaryLabelWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', marginTop: 4 },
  weakSummaryCard: { backgroundColor: '#0d1812', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#203529', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  weakSummaryCardWarning: { backgroundColor: '#21140b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  weakSummaryNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  weakSummaryNumberWarning: { color: '#ffb86b', fontSize: 24, fontWeight: '900' },
  weakSummaryLabel: { color: '#aeb8aa', fontSize: 12, fontWeight: '800', marginTop: 4 },
  weakSummaryLabelWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900', marginTop: 4 },
  weakFilterButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  weakFilterButtonActive: { backgroundColor: '#ffb86b', borderWidth: 1, borderColor: '#ffb86b', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  weakFilterButtonText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  weakFilterButtonTextActive: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  healthCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#2f6b3c', gap: 10 },
  healthCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  healthKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  healthScore: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthScoreWarning: { color: '#ffb86b', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthPill: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillWarning: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillText: { color: '#91e6a3', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthPillTextWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthMessage: { color: '#aeb8aa', fontSize: 13, lineHeight: 19 },
  healthMessageWarning: { color: '#ffb86b', fontSize: 13, lineHeight: 19, fontWeight: '800' },
  categorySummary: { backgroundColor: '#0d1812', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#203529' },
  categorySummaryTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  categorySummaryText: { color: '#aeb8aa', fontSize: 13, marginTop: 5 },
  controlsCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 10 },
  controlsHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  controlsKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  controlsTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginTop: 3 },
  clearButton: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  clearButtonText: { color: '#c8f7d0', fontSize: 12, fontWeight: '900' },
  searchInput: { backgroundColor: '#07110c', borderWidth: 1, borderColor: '#35523e', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, color: '#ffffff', fontSize: 14 },
  controlLabel: { color: '#dfe8da', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  chipActive: { backgroundColor: '#91e6a3', borderWidth: 1, borderColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  sortChip: { borderWidth: 1, borderColor: '#35523e', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  sortChipActive: { backgroundColor: '#1e3a27', borderWidth: 1, borderColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  sortChipText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  sortChipTextActive: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  resultCount: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  logCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 10 },
  logCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  logHeaderText: { flex: 1 },
  logCategory: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  logTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  readinessBadge: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  readinessBadgeWarning: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  readinessText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  readinessTextWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  logMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  logMeta: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  detailBox: { backgroundColor: '#07110c', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#26382c' },
  detailLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailText: { color: '#dfe8da', fontSize: 13, fontWeight: '800', marginTop: 4 },
  logNotes: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  weakLogBox: { backgroundColor: '#2a1a0d', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#7a4a1f' },
  weakLogTitle: { color: '#ffb86b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  weakLogText: { color: '#ffb86b', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  status: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  statusWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  editButton: { borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  editButtonText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  improveButton: { backgroundColor: '#ffb86b', borderWidth: 1, borderColor: '#ffb86b', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  improveButtonText: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  deleteButton: { borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  deleteButtonText: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  emptyCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#203529', alignItems: 'flex-start', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  emptyText: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  emptyButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#91e6a3', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabIcon: { color: '#07110c', fontSize: 32, fontWeight: '400' },
});
