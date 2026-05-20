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
  card: { backgroundColor: '#00253D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  cardModerate: { backgroundColor: 'rgba(212,160,26,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', gap: 12 },
  cardHigh: { backgroundColor: 'rgba(204,42,42,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(204,42,42,0.3)', gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  kicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  riskLabel: { color: '#B5852C', fontSize: 28, fontWeight: '900', marginTop: 2 },
  riskLabelModerate: { color: '#D4A01A', fontSize: 28, fontWeight: '900', marginTop: 2 },
  riskLabelHigh: { color: '#CC2A2A', fontSize: 28, fontWeight: '900', marginTop: 2 },
  riskLabelMuted: { color: '#8FAEC8', fontSize: 28, fontWeight: '900', marginTop: 2 },
  badge: { backgroundColor: 'rgba(181,133,44,0.1)', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeModerate: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeHigh: { backgroundColor: 'rgba(204,42,42,0.1)', borderWidth: 1, borderColor: 'rgba(204,42,42,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeMuted: { backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  badgeTextModerate: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },
  badgeTextHigh: { color: '#CC2A2A', fontSize: 12, fontWeight: '900' },
  badgeTextMuted: { color: '#8FAEC8', fontSize: 12, fontWeight: '900' },
  message: { color: '#8FAEC8', fontSize: 13, lineHeight: 20 },
  messageWarning: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { color: '#FFFFFF', backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  factorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factor: { backgroundColor: 'rgba(181,133,44,0.1)', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factorWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factorText: { color: '#B5852C', fontSize: 11, fontWeight: '900' },
  factorTextWarning: { color: '#D4A01A', fontSize: 11, fontWeight: '900' },
});
