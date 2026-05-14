import LogControls from '@/src/components/log/LogControls';
import LogSummaryCards from '@/src/components/log/LogSummaryCards';
import ReadinessTrendCard from '@/src/components/log/ReadinessTrendCard';
import TrainingLogCard from '@/src/components/log/TrainingLogCard';
import TrainingLogHealthCard from '@/src/components/log/TrainingLogHealthCard';
import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import {
  SortMode,
  TrainingFilter,
  buildReadinessTrend,
  buildSummary,
  calculateTrainingLogHealthScore,
  filterAndSortLogs,
  getTrainingLogHealthLabel,
  getTrainingLogHealthMessage,
} from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LogScreen() {
  const { logs, isLoading, deleteLog } = useTraining();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<TrainingFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWeakLogsOnly, setShowWeakLogsOnly] = useState(false);

  const summary = buildSummary(logs);
  const healthScore = calculateTrainingLogHealthScore(logs);
  const readinessTrend = buildReadinessTrend(logs);

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
    Alert.alert('Delete Training Log', `Delete this ${log.category} log from ${log.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLog(log.id) },
    ]);
  }

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
            onEdit={(id) => router.push(`/edit-log/${id}`)}
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
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/add-log')}>
                <Text style={styles.primaryButtonText}>Add Training Log</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/weekly-report')}>
                <Text style={styles.secondaryButtonText}>Weekly Report</Text>
              </TouchableOpacity>
            </View>

            <LogSummaryCards
              summary={summary}
              showWeakLogsOnly={showWeakLogsOnly}
              onToggleWeakLogs={() => setShowWeakLogsOnly((current) => !current)}
            />

            <TrainingLogHealthCard
              score={healthScore}
              label={getTrainingLogHealthLabel(healthScore)}
              message={getTrainingLogHealthMessage(healthScore)}
            />

            <ReadinessTrendCard trend={readinessTrend} />

            <View style={styles.categorySummary}>
              <Text style={styles.categorySummaryTitle}>Training Split</Text>
              <Text style={styles.categorySummaryText}>
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
  categorySummary: { backgroundColor: '#0d1812', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#203529' },
  categorySummaryTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  categorySummaryText: { color: '#aeb8aa', fontSize: 13, marginTop: 5 },
  sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#203529', alignItems: 'flex-start', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  emptyText: { color: '#aeb8aa', fontSize: 14, lineHeight: 21 },
  emptyButton: { backgroundColor: '#91e6a3', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#91e6a3', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabIcon: { color: '#07110c', fontSize: 32, fontWeight: '400' },
});
