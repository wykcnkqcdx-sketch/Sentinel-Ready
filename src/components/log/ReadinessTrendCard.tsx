import { StyleSheet, Text, View } from 'react-native';

type Trend = {
  latest: number;
  previous: number;
  change: number;
  label: string;
  message: string;
  status: 'good' | 'warning' | 'neutral';
};

type Props = {
  trend: Trend;
};

export default function ReadinessTrendCard({ trend }: Props) {
  const isWarning = trend.status === 'warning';

  return (
    <View style={isWarning ? styles.trendCardWarning : styles.trendCard}>
      <View style={styles.trendHeader}>
        <View>
          <Text style={styles.trendKicker}>READINESS TREND</Text>
          <Text style={isWarning ? styles.trendTitleWarning : styles.trendTitle}>
            {trend.label}
          </Text>
        </View>

        <View style={isWarning ? styles.trendPillWarning : styles.trendPill}>
          <Text style={isWarning ? styles.trendPillTextWarning : styles.trendPillText}>
            {trend.change > 0 ? '+' : ''}{trend.change}
          </Text>
        </View>
      </View>

      <Text style={isWarning ? styles.trendTextWarning : styles.trendText}>
        {trend.label === 'Baseline'
          ? `Latest ${trend.latest}/10`
          : `Latest ${trend.latest}/10 · Previous ${trend.previous}/10`}
      </Text>

      <Text style={isWarning ? styles.trendTextWarning : styles.trendText}>
        {trend.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trendCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#203529', gap: 8 },
  trendCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', gap: 8 },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  trendKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  trendTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  trendTitleWarning: { color: '#ffb86b', fontSize: 24, fontWeight: '900', marginTop: 4 },
  trendPill: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  trendPillWarning: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  trendPillText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  trendPillTextWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  trendText: { color: '#aeb8aa', fontSize: 13, lineHeight: 19 },
  trendTextWarning: { color: '#ffb86b', fontSize: 13, lineHeight: 19, fontWeight: '800' },
});
