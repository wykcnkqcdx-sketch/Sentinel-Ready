import { WeeklyLoadRisk } from '@/src/utils/trainingLogUtils';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  risk: WeeklyLoadRisk;
};

const WeeklyLoadRiskCard = memo(function WeeklyLoadRiskCard({ risk }: Props) {
  const isHigh = risk.status === 'high';
  const isModerate = risk.status === 'moderate';
  const isNoData = risk.status === 'no-data';

  const cardStyle = isHigh ? styles.cardHigh : isModerate ? styles.cardModerate : styles.card;
  const labelStyle = isHigh ? styles.riskLabelHigh : isModerate ? styles.riskLabelModerate : isNoData ? styles.riskLabelMuted : styles.riskLabel;
  const badgeStyle = isHigh ? styles.badgeHigh : isModerate ? styles.badgeModerate : isNoData ? styles.badgeMuted : styles.badge;
  const badgeTextStyle = isHigh ? styles.badgeTextHigh : isModerate ? styles.badgeTextModerate : isNoData ? styles.badgeTextMuted : styles.badgeText;

  return (
    <View style={cardStyle}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>WEEKLY LOAD RISK</Text>
          <Text style={labelStyle}>{risk.label}</Text>
        </View>

        <View style={badgeStyle}>
          <Text style={badgeTextStyle}>{risk.totalSessions} sessions</Text>
        </View>
      </View>

      <Text style={isHigh || isModerate ? styles.messageWarning : styles.message}>{risk.message}</Text>

      <View style={styles.metricRow}>
        <Text style={styles.metric}>Ruck {risk.ruckSessions}</Text>
        <Text style={styles.metric}>Run {risk.runSessions}</Text>
        <Text style={styles.metric}>Strength {risk.strengthSessions}</Text>
        <Text style={styles.metric}>Recovery {risk.recoverySessions}</Text>
      </View>

      <View style={styles.factorRow}>
        {risk.factors.slice(0, 3).map((factor) => (
          <View key={factor} style={isHigh || isModerate ? styles.factorWarning : styles.factor}>
            <Text style={isHigh || isModerate ? styles.factorTextWarning : styles.factorText}>{factor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

export default WeeklyLoadRiskCard;

const styles = StyleSheet.create({
  card: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 12 },
  cardModerate: { backgroundColor: '#1c1408', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#6b5020', gap: 12 },
  cardHigh: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  kicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  riskLabel: { color: '#91e6a3', fontSize: 30, fontWeight: '900', marginTop: 2 },
  riskLabelModerate: { color: '#f0c070', fontSize: 30, fontWeight: '900', marginTop: 2 },
  riskLabelHigh: { color: '#ffb86b', fontSize: 30, fontWeight: '900', marginTop: 2 },
  riskLabelMuted: { color: '#8fbf8f', fontSize: 30, fontWeight: '900', marginTop: 2 },
  badge: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeModerate: { backgroundColor: '#2a220d', borderWidth: 1, borderColor: '#6b5020', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeHigh: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeMuted: { backgroundColor: '#0b1710', borderWidth: 1, borderColor: '#26382c', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  badgeTextModerate: { color: '#f0c070', fontSize: 12, fontWeight: '900' },
  badgeTextHigh: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  badgeTextMuted: { color: '#8fbf8f', fontSize: 12, fontWeight: '900' },
  message: { color: '#aeb8aa', fontSize: 13, lineHeight: 20 },
  messageWarning: { color: '#c8a070', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { color: '#dfe8da', backgroundColor: '#07110c', borderWidth: 1, borderColor: '#26382c', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  factorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factor: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factorWarning: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factorText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  factorTextWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900' },
});
