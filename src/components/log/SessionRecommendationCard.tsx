import { RecommendationActionType, SessionRecommendation } from '@/src/utils/trainingLogUtils';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  recommendation: SessionRecommendation;
  onAction: (actionType: RecommendationActionType) => void;
};

export default function SessionRecommendationCard({ recommendation, onAction }: Props) {
  const { title, detail, actionLabel, actionType, status } = recommendation;

  const cardStyle = status === 'warning' ? styles.cardWarning
    : status === 'caution' ? styles.cardCaution
    : status === 'good' ? styles.cardGood
    : styles.card;

  const kickerStyle = status === 'warning' || status === 'caution' ? styles.kickerWarning : styles.kicker;
  const titleStyle = status === 'warning' ? styles.titleWarning
    : status === 'caution' ? styles.titleCaution
    : status === 'good' ? styles.titleGood
    : styles.title;
  const detailStyle = status === 'warning' || status === 'caution' ? styles.detailWarning : styles.detail;

  const buttonStyle = status === 'warning' ? styles.buttonWarning
    : status === 'caution' ? styles.buttonCaution
    : styles.button;
  const buttonTextStyle = status === 'warning' || status === 'caution' ? styles.buttonTextWarning : styles.buttonText;

  return (
    <View style={cardStyle}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={kickerStyle}>SESSION RECOMMENDATION</Text>
          <Text style={titleStyle}>{title}</Text>
        </View>

        <View style={status === 'warning' ? styles.iconBadgeWarning : status === 'caution' ? styles.iconBadgeCaution : status === 'good' ? styles.iconBadgeGood : styles.iconBadge}>
          <Text style={status === 'warning' || status === 'caution' ? styles.iconWarning : styles.icon}>
            {status === 'warning' ? '!' : status === 'caution' ? '~' : status === 'good' ? '↑' : '→'}
          </Text>
        </View>
      </View>

      <Text style={detailStyle}>{detail}</Text>

      <TouchableOpacity style={buttonStyle} onPress={() => onAction(actionType)}>
        <Text style={buttonTextStyle}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 10 },
  cardGood: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 10 },
  cardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  cardCaution: { backgroundColor: '#1c1408', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#6b5020', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  kicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  kickerWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  titleGood: { color: '#91e6a3', fontSize: 20, fontWeight: '900', marginTop: 4 },
  titleWarning: { color: '#ffb86b', fontSize: 20, fontWeight: '900', marginTop: 4 },
  titleCaution: { color: '#f0c070', fontSize: 20, fontWeight: '900', marginTop: 4 },
  detail: { color: '#aeb8aa', fontSize: 13, lineHeight: 20 },
  detailWarning: { color: '#c8a070', fontSize: 13, lineHeight: 20 },
  iconBadge: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#203529', borderRadius: 999, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  iconBadgeGood: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  iconBadgeWarning: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  iconBadgeCaution: { backgroundColor: '#241c0a', borderWidth: 1, borderColor: '#6b5020', borderRadius: 999, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  icon: { color: '#91e6a3', fontSize: 16, fontWeight: '900' },
  iconWarning: { color: '#ffb86b', fontSize: 16, fontWeight: '900' },
  button: { backgroundColor: '#91e6a3', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  buttonGood: { backgroundColor: '#91e6a3', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  buttonWarning: { backgroundColor: '#ffb86b', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  buttonCaution: { backgroundColor: '#f0c070', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  buttonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  buttonTextWarning: { color: '#07110c', fontSize: 13, fontWeight: '900' },
});
