import { tokens as T } from '@/src/theme/tokens';
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
  card: { backgroundColor: T.bgPanel, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderSubtle, gap: 12 },
  cardModerate: { backgroundColor: T.bgWarnModerate, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderWarnModerate, gap: 12 },
  cardHigh: { backgroundColor: T.bgWarn, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.borderWarn, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  kicker: { color: T.textAccent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  riskLabel: { color: T.textAccent, fontSize: 30, fontWeight: '900', marginTop: 2 },
  riskLabelModerate: { color: T.textWarnModerate, fontSize: 30, fontWeight: '900', marginTop: 2 },
  riskLabelHigh: { color: T.textWarn, fontSize: 30, fontWeight: '900', marginTop: 2 },
  riskLabelMuted: { color: T.textMutedAccent, fontSize: 30, fontWeight: '900', marginTop: 2 },
  badge: { backgroundColor: T.bgDeep, borderWidth: 1, borderColor: T.borderAccent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeModerate: { backgroundColor: T.bgWarnModerateBadge, borderWidth: 1, borderColor: T.borderWarnModerate, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeHigh: { backgroundColor: T.bgWarnBadge, borderWidth: 1, borderColor: T.borderWarn, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeMuted: { backgroundColor: '#0b1710', borderWidth: 1, borderColor: T.borderField, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  badgeTextModerate: { color: T.textWarnModerate, fontSize: 12, fontWeight: '900' },
  badgeTextHigh: { color: T.textWarn, fontSize: 12, fontWeight: '900' },
  badgeTextMuted: { color: T.textMutedAccent, fontSize: 12, fontWeight: '900' },
  message: { color: T.textMuted, fontSize: 13, lineHeight: 20 },
  messageWarning: { color: T.textWarnMuted, fontSize: 13, lineHeight: 20, fontWeight: '800' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { color: T.textBodyAlt, backgroundColor: T.bgScreen, borderWidth: 1, borderColor: T.borderField, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '800' },
  factorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factor: { backgroundColor: T.bgDeep, borderWidth: 1, borderColor: T.borderAccent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factorWarning: { backgroundColor: T.bgWarnBadge, borderWidth: 1, borderColor: T.borderWarn, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factorText: { color: T.textAccent, fontSize: 11, fontWeight: '900' },
  factorTextWarning: { color: T.textWarn, fontSize: 11, fontWeight: '900' },
});
