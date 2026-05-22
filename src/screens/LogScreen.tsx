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
            {/* ── Stitch: OPERATIONAL OVERVIEW header ── */}
            <View style={ls.headerTop}>
              <Text style={styles.kicker}>OPERATIONAL OVERVIEW</Text>
            </View>
            <View style={ls.logHealthRow}>
              <Text style={ls.logHealthLabel}>[ LOG HEALTH: </Text>
              <Text style={[ls.logHealthValue, { color: healthScore >= 70 ? '#5E7A2F' : healthScore >= 50 ? '#ffaa44' : '#e05050' }]}>
                {healthScore}%
              </Text>
              <Text style={ls.logHealthLabel}> ]</Text>
            </View>
            <View style={styles.headerRule} />

            <View style={ls.topButtonRow}>
              <TouchableOpacity
                style={ls.primaryBtn}
                onPress={() => router.push('/add-log')}
                accessibilityRole="button"
                accessibilityLabel="Add training log"
              >
                <Text style={ls.primaryBtnText}>[ ADD SESSION ]</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ls.secondaryBtn}
                onPress={() => router.push('/weekly-report')}
                accessibilityRole="button"
                accessibilityLabel="View weekly report"
              >
                <Text style={ls.secondaryBtnText}>[ EXPORT REPORT ]</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ls.secondaryBtn} onPress={shareCsvExport}>
                <Text style={ls.secondaryBtnText}>[ CSV ]</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ls.secondaryBtn} onPress={() => router.push('/import-logs')}>
                <Text style={ls.secondaryBtnText}>[ IMPORT ]</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stitch: WEAK LOGS card ── */}
            {summary.weakLogs > 0 && (
              <View style={ls.weakLogsCard}>
                <View style={ls.weakLogsHeader}>
                  <Text style={ls.weakLogsKicker}>[ WEAK LOGS: DATA GAPS IDENTIFIED ]</Text>
                  <TouchableOpacity onPress={handleToggleWeakLogs}>
                    <Text style={ls.weakLogsToggle}>{showWeakLogsOnly ? '[ SHOW ALL ]' : `[ ${summary.weakLogs} FLAGGED ]`}</Text>
                  </TouchableOpacity>
                </View>
                {logs.filter((l) => (weakReasonsMap.get(l.id) ?? []).length > 0).slice(0, 3).map((l) => (
                  <View key={l.id} style={ls.weakLogRow}>
                    <View style={ls.weakLogInfo}>
                      <Text style={ls.weakLogTitle}>{l.category} — {l.date}</Text>
                      <Text style={ls.weakLogReasons}>{(weakReasonsMap.get(l.id) ?? []).join(' · ')}</Text>
                    </View>
                    <TouchableOpacity style={ls.repairBtn} onPress={() => handleEditLog(l.id)}>
                      <Text style={ls.repairBtnText}>REPAIR</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── Stitch: READINESS IMPACT ── */}
            {logs.length > 0 && (
              <View style={ls.impactCard}>
                <Text style={ls.impactKicker}>READINESS IMPACT</Text>
                <View style={ls.impactValueRow}>
                  <Text style={[ls.impactValue, { color: readinessTrend.status === 'good' ? '#5E7A2F' : readinessTrend.status === 'warning' ? '#e05050' : '#ffaa44' }]}>
                    {readinessTrend.status === 'good' ? '+' : readinessTrend.status === 'warning' ? '−' : '↔'}{' '}
                    {readinessTrend.label}
                  </Text>
                  <Text style={ls.impactSub}>7-DAY AGGREGATE</Text>
                </View>
              </View>
            )}

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

            <Text style={ls.sectionTitle}>RECENT TACTICAL ENTRIES</Text>
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
  screen: { flex: 1, backgroundColor: '#080c05' },
  loadingScreen: { flex: 1, backgroundColor: '#080c05', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#B5852C', fontSize: 15, fontWeight: '900' },
  listContent: { padding: 18, paddingBottom: 110, gap: 14 },
  header: { gap: 12, marginBottom: 4 },
  kicker: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  headerRule: { height: 1, backgroundColor: '#B5852C', opacity: 0.55, marginVertical: 2 },
  title: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#b8c0b0', fontSize: 14, lineHeight: 21 },
  topButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: { backgroundColor: '#B5852C', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16 },
  primaryButtonText: { color: '#080c05', fontSize: 13, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#B5852C', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16 },
  secondaryButtonText: { color: '#B5852C', fontSize: 13, fontWeight: '900' },
  infoCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 10 },
  infoCardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  infoCardText: { color: '#b8c0b0', fontSize: 13 },
  insightRow: { backgroundColor: '#080c05', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', padding: 10, gap: 3 },
  insightRowWarn: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', padding: 10, gap: 3 },
  insightTitle: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  insightTitleWarn: { color: '#ffaa44', fontSize: 13, fontWeight: '900' },
  insightText: { color: '#b8c0b0', fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 18, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', alignItems: 'flex-start', gap: 8 },
  emptyTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  emptyText: { color: '#b8c0b0', fontSize: 14, lineHeight: 21 },
  emptyButton: { backgroundColor: '#B5852C', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: '#080c05', fontSize: 13, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#B5852C', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabIcon: { color: '#080c05', fontSize: 32, fontWeight: '400' },
});

// ── Stitch-derived LogScreen additions ─────────────────────────────────
const ls = StyleSheet.create({
  headerTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logHealthRow:    { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  logHealthLabel:  { color: '#B5852C', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  logHealthValue:  { fontSize: 28, fontWeight: '900' },

  topButtonRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn:      { borderWidth: 1, borderColor: '#B5852C', borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(181,133,44,0.12)' },
  primaryBtnText:  { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  secondaryBtn:    { borderWidth: 1, borderColor: 'rgba(181,133,44,0.35)', borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryBtnText:{ color: '#b8c0b0', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  weakLogsCard: {
    backgroundColor: '#0c1008',
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: 'rgba(255,170,68,0.2)',
    borderLeftColor: '#ffaa44',
    padding: 14,
    gap: 10,
  },
  weakLogsHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weakLogsKicker:  { color: '#ffaa44', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, flex: 1 },
  weakLogsToggle:  { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  weakLogRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#080c05', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', padding: 10 },
  weakLogInfo:     { flex: 1, gap: 2 },
  weakLogTitle:    { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  weakLogReasons:  { color: '#b8c0b0', fontSize: 11 },
  repairBtn:       { borderWidth: 1, borderColor: '#ffaa44', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 },
  repairBtnText:   { color: '#ffaa44', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  impactCard:      { backgroundColor: '#0c1008', borderRadius: 6, borderWidth: 1, borderTopWidth: 2, borderColor: 'rgba(181,133,44,0.12)', borderTopColor: '#B5852C', padding: 14, gap: 4 },
  impactKicker:    { color: '#b8c0b0', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  impactValueRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  impactValue:     { fontSize: 28, fontWeight: '900' },
  impactSub:       { color: '#b8c0b0', fontSize: 11, fontWeight: '700' },

  sectionTitle:    { color: '#b8c0b0', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginTop: 4 },
});
