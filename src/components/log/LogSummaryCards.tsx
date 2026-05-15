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
});
