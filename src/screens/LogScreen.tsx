import { TrainingLog, useTraining } from '@/src/screens/TrainingContext';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function getReadinessNumber(readiness: string) {
  const score = Number(readiness);
  return Number.isNaN(score) ? 0 : score;
}

function isFatigueWatch(readiness: string) {
  const score = Number(readiness);
  return !Number.isNaN(score) && score <= 5;
}

function getReadinessLabel(readiness: string) {
  const score = Number(readiness);

  if (Number.isNaN(score)) {
    return 'Unknown';
  }

  if (score <= 3) {
    return 'Low';
  }

  if (score <= 5) {
    return 'Fatigue Watch';
  }

  if (score <= 7) {
    return 'Moderate';
  }

  return 'High';
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
  };
}

export default function LogScreen() {
  const { logs, isLoading } = useTraining();
  const router = useRouter();

  const sortedLogs = [...logs].sort((a, b) => b.id - a.id);
  const summary = buildSummary(sortedLogs);

  const renderLogItem = ({ item }: { item: TrainingLog }) => {
    const fatigueWatch = isFatigueWatch(item.readiness);

    return (
      <View style={fatigueWatch ? styles.logCardWarning : styles.logCard}>
        <View style={styles.logHeader}>
          <View>
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

        <View style={styles.statusRow}>
          <Text style={fatigueWatch ? styles.statusWarning : styles.status}>
            {getReadinessLabel(item.readiness)}
          </Text>
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
        data={sortedLogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>SENTINEL READY</Text>
            <Text style={styles.title}>Training Log</Text>
            <Text style={styles.subtitle}>
              Review saved sessions, readiness, fatigue watch and operational training balance.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/add-log')}>
              <Text style={styles.primaryButtonText}>Add Training Log</Text>
            </TouchableOpacity>

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

            <View style={styles.categorySummary}>
              <Text style={styles.categorySummaryTitle}>Training Split</Text>
              <Text style={styles.categorySummaryText}>
                Ruck {summary.ruck} · Strength {summary.strength} · Run {summary.run} · Recovery {summary.recovery}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Recent Logs</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No logs saved yet</Text>
            <Text style={styles.emptyText}>
              Add your first training log to start building readiness and recovery data.
            </Text>

            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/add-log')}>
              <Text style={styles.emptyButtonText}>Add First Log</Text>
            </TouchableOpacity>
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
  screen: {
    flex: 1,
    backgroundColor: '#07110c',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#07110c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#91e6a3',
    fontSize: 15,
    fontWeight: '900',
  },
  listContent: {
    padding: 18,
    paddingBottom: 110,
    gap: 14,
  },
  header: {
    gap: 12,
    marginBottom: 4,
  },
  kicker: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#07110c',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0d1812',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#203529',
  },
  summaryCardWarning: {
    flex: 1,
    backgroundColor: '#21140b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#7a4a1f',
  },
  summaryNumber: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  summaryNumberWarning: {
    color: '#ffb86b',
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#aeb8aa',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryLabelWarning: {
    color: '#ffb86b',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  categorySummary: {
    backgroundColor: '#0d1812',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#203529',
  },
  categorySummaryTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  categorySummaryText: {
    color: '#aeb8aa',
    fontSize: 13,
    marginTop: 5,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  logCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#203529',
    gap: 10,
  },
  logCardWarning: {
    backgroundColor: '#21140b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    gap: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  logCategory: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  logTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  readinessBadge: {
    backgroundColor: '#102d1a',
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignSelf: 'flex-start',
  },
  readinessBadgeWarning: {
    backgroundColor: '#2a1a0d',
    borderWidth: 1,
    borderColor: '#7a4a1f',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignSelf: 'flex-start',
  },
  readinessText: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  readinessTextWarning: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
  },
  logMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  logMeta: {
    color: '#8fbf8f',
    fontSize: 12,
    fontWeight: '800',
  },
  detailBox: {
    backgroundColor: '#07110c',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26382c',
  },
  detailLabel: {
    color: '#8fbf8f',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailText: {
    color: '#dfe8da',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  logNotes: {
    color: '#c4cec0',
    fontSize: 14,
    lineHeight: 21,
  },
  statusRow: {
    flexDirection: 'row',
  },
  status: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
  },
  statusWarning: {
    color: '#ffb86b',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    backgroundColor: '#0d1812',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#203529',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: '#aeb8aa',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyButtonText: {
    color: '#07110c',
    fontSize: 13,
    fontWeight: '900',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#91e6a3',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    color: '#07110c',
    fontSize: 32,
    fontWeight: '400',
  },
});
