import LogControls from '@/src/components/log/LogControls';
import LogSummaryCards from '@/src/components/log/LogSummaryCards';
import ReadinessTrendCard from '@/src/components/log/ReadinessTrendCard';
import SessionRecommendationCard from '@/src/components/log/SessionRecommendationCard';
import TrainingLogCard from '@/src/components/log/TrainingLogCard';
import TrainingLogHealthCard from '@/src/components/log/TrainingLogHealthCard';
import WeeklyLoadRiskCard from '@/src/components/log/WeeklyLoadRiskCard';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { buildTrainingInsights } from '@/src/utils/insightUtils';
import {
  RecommendationActionType,
  SortMode,
  TrainingFilter,
  buildReadinessTrend,
  buildSessionRecommendation,
  buildSummary,
  buildWeeklyLoadRisk,
  calculateTrainingLogHealthScore,
  filterAndSortLogs,
  getTrainingLogHealthLabel,
  getTrainingLogHealthMessage,
  getWeakLogReasons,
} from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const EMPTY_REASONS: string[] = [];

export default function LogScreen() {
  const { logs, goals, isLoading, deleteLog, duplicateLog, exportLogsCsv } = useTraining();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<TrainingFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWeakLogsOnly, setShowWeakLogsOnly] = useState(false);

  const summary = useMemo(() => buildSummary(logs), [logs]);
  const healthScore = useMemo(() => calculateTrainingLogHealthScore(logs), [logs]);
  const readinessTrend = useMemo(() => buildReadinessTrend(logs), [logs]);
  const sessionRecommendation = useMemo(() => buildSessionRecommendation(logs), [logs]);
  const weeklyLoadRisk = useMemo(() => buildWeeklyLoadRisk(logs), [logs]);
  const insights = useMemo(() => buildTrainingInsights(logs), [logs]);
  
  const weakReasonsMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const log of logs) {
      const reasons = getWeakLogReasons(log);
      if (reasons.length > 0) map.set(log.id, reasons);
    }
    return map;
  }, [logs]);

  const handleRecommendationAction = useCallback((actionType: RecommendationActionType) => {
    if (actionType === 'weak-logs') {
      setShowWeakLogsOnly(true);
    } else {
      router.push('/add-log');
    }
  }, [router]);

  const handleToggleWeakLogs = useCallback(() => {
    setShowWeakLogsOnly((current) => !current);
  }, []);

  const visibleLogs = useMemo(
    () => filterAndSortLogs(logs, activeFilter, searchQuery, sortMode, showWeakLogsOnly),
    [logs, activeFilter, searchQuery, sortMode, showWeakLogsOnly]
  );

  const clearSearchAndFilters = useCallback(() => {
    setActiveFilter('All');
    setSortMode('Newest');
    setSearchQuery('');
    setShowWeakLogsOnly(false);
  }, []);

  const handleDuplicateLog = useCallback(async (id: number) => {
    try {
      await duplicateLog(id);
    } catch {
      Alert.alert('Duplicate Failed', 'The log could not be duplicated. Please try again.');
    }
  }, [duplicateLog]);

  const shareCsvExport = useCallback(async () => {
    try {
      await Share.share({
        title: 'Sentinel Ready Training Logs CSV',
        message: exportLogsCsv(),
      });
    } catch {
      Alert.alert('Export Failed', 'The CSV export could not be shared.');
    }
  }, [exportLogsCsv]);

  const confirmDeleteLog = useCallback((log: TrainingLog) => {
    Alert.alert('Delete Training Log', `Delete this ${log.category} log from ${log.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(log.id);
          } catch {
            Alert.alert('Error', 'Failed to delete log. Please try again.');
          }
        },
      },
    ]);
  }, [deleteLog]);

  const handleEditLog = useCallback((id: number) => router.push(`/edit-log/${id}`), [router]);

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
        renderItem={({ item }) => (
          <TrainingLogCard
            log={item}
            weakReasons={weakReasonsMap.get(item.id) ?? EMPTY_REASONS}
            onEdit={handleEditLog}
            onDuplicate={handleDuplicateLog}
            onDelete={confirmDeleteLog}
          />
        )}
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
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/add-log')}
                accessibilityRole="button"
                accessibilityLabel="Add training log"
              >
                <Text style={styles.primaryButtonText}>Add Training Log</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/weekly-report')}
                accessibilityRole="button"
                accessibilityLabel="View weekly report"
              >
                <Text style={styles.secondaryButtonText}>Weekly Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/goals')}>
                <Text style={styles.secondaryButtonText}>Goals ({goals.filter((goal) => goal.status === 'active').length})</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={shareCsvExport}>
                <Text style={styles.secondaryButtonText}>Export CSV</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/import-logs')}>
                <Text style={styles.secondaryButtonText}>Import CSV</Text>
              </TouchableOpacity>
            </View>

            <SessionRecommendationCard
              recommendation={sessionRecommendation}
              onAction={handleRecommendationAction}
            />

            <LogSummaryCards
              summary={summary}
              showWeakLogsOnly={showWeakLogsOnly}
              onToggleWeakLogs={handleToggleWeakLogs}
            />

            <TrainingLogHealthCard
              score={healthScore}
              label={getTrainingLogHealthLabel(healthScore)}
              message={getTrainingLogHealthMessage(healthScore)}
            />

            <WeeklyLoadRiskCard risk={weeklyLoadRisk} />

            <ReadinessTrendCard trend={readinessTrend} />

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Training Insights</Text>
              {insights.slice(0, 3).map((insight) => (
                <View key={insight.title} style={insight.severity === 'warning' ? styles.insightRowWarn : styles.insightRow}>
                  <Text style={insight.severity === 'warning' ? styles.insightTitleWarn : styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightText}>{insight.message}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.infoCard, { gap: 4 }]}>
              <Text style={styles.infoCardTitle}>Training Split</Text>
              <Text style={styles.infoCardText}>
                Ruck {summary.ruck} · Strength {summary.strength} · Run {summary.run} · Recovery {summary.recovery} · Weak {summary.weakLogs}
              </Text>
            </View>

            <LogControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onClear={clearSearchAndFilters}
              visibleCount={visibleLogs.length}
              totalCount={logs.length}
              showWeakLogsOnly={showWeakLogsOnly}
            />

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
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/add-log')}
                accessibilityRole="button"
                accessibilityLabel="Add first log"
              >
                <Text style={styles.emptyButtonText}>Add First Log</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={clearSearchAndFilters}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <Text style={styles.emptyButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-log')}
        accessibilityRole="button"
        accessibilityLabel="Add training log"
      >
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
  infoCard: { backgroundColor: '#0d1812', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 10 },
  infoCardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  infoCardText: { color: '#aeb8aa', fontSize: 13 },
  insightRow: { backgroundColor: '#07110c', borderRadius: 12, borderWidth: 1, borderColor: '#26382c', padding: 10, gap: 3 },
  insightRowWarn: { backgroundColor: '#21140b', borderRadius: 12, borderWidth: 1, borderColor: '#7a4a1f', padding: 10, gap: 3 },
  insightTitle: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  insightTitleWarn: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  insightText: { color: '#aeb8aa', fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#203529', alignItems: 'flex-start', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  emptyText: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  emptyButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#91e6a3', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabIcon: { color: '#07110c', fontSize: 32, fontWeight: '400' },
});
