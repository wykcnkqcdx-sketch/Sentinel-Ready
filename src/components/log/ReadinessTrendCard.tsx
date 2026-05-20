import { memo } from 'react';
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

const ReadinessTrendCard = memo(function ReadinessTrendCard({ trend }: Props) {
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
});

export default ReadinessTrendCard;

const styles = StyleSheet.create({
  trendCard: { backgroundColor: '#1E2229', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  trendCardWarning: { backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', gap: 8 },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  trendKicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  trendTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  trendTitleWarning: { color: '#F5A623', fontSize: 24, fontWeight: '900', marginTop: 4 },
  trendPill: { backgroundColor: '#252B35', borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  trendPillWarning: { backgroundColor: 'rgba(245,166,35,0.1)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  trendPillText: { color: '#FC4C02', fontSize: 12, fontWeight: '900' },
  trendPillTextWarning: { color: '#F5A623', fontSize: 12, fontWeight: '900' },
  trendText: { color: '#A7ADB8', fontSize: 13, lineHeight: 19 },
  trendTextWarning: { color: '#F5A623', fontSize: 13, lineHeight: 19, fontWeight: '800' },
});
