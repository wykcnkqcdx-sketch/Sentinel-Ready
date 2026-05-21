import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Summary = {
  total: number;
  averageReadiness: string;
  fatigueWatch: number;
  weakLogs: number;
};

type Props = {
  summary: Summary;
  showWeakLogsOnly: boolean;
  onToggleWeakLogs: () => void;
};

const LogSummaryCards = memo(function LogSummaryCards({ summary, showWeakLogsOnly, onToggleWeakLogs }: Props) {
  return (
    <>
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
          onPress={onToggleWeakLogs}
        >
          <Text style={showWeakLogsOnly ? styles.weakFilterButtonTextActive : styles.weakFilterButtonText}>
            {showWeakLogsOnly ? 'Showing Weak' : 'Show Weak'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

export default LogSummaryCards;

const styles = StyleSheet.create({
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: '#0c1008', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)' },
  summaryCardWarning: { flex: 1, backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)' },
  summaryNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  summaryNumberWarning: { color: '#ffaa44', fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: '#b8c0b0', fontSize: 11, fontWeight: '800', marginTop: 4 },
  summaryLabelWarning: { color: '#ffaa44', fontSize: 11, fontWeight: '900', marginTop: 4 },
  weakSummaryCard: { backgroundColor: '#0c1008', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  weakSummaryCardWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  weakSummaryNumber: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  weakSummaryNumberWarning: { color: '#ffaa44', fontSize: 24, fontWeight: '900' },
  weakSummaryLabel: { color: '#b8c0b0', fontSize: 12, fontWeight: '800', marginTop: 4 },
  weakSummaryLabelWarning: { color: '#ffaa44', fontSize: 12, fontWeight: '900', marginTop: 4 },
  weakFilterButton: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  weakFilterButtonActive: { backgroundColor: '#ffaa44', borderWidth: 1, borderColor: '#ffaa44', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  weakFilterButtonText: { color: '#c8d8c5', fontSize: 12, fontWeight: '900' },
  weakFilterButtonTextActive: { color: '#080c05', fontSize: 12, fontWeight: '900' },
});
