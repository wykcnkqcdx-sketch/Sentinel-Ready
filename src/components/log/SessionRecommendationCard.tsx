import { RecommendationActionType, SessionRecommendation } from '@/src/utils/trainingLogUtils';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  recommendation: SessionRecommendation;
  onAction: (actionType: RecommendationActionType) => void;
};

export default function SessionRecommendationCard({ recommendation, onAction }: Props) {
  const { sessionType, reason, suggestion, actionLabel, actionType, status } = recommendation;

  const isWarning = status === 'warning';
  const isCaution = status === 'caution';
  const isGood = status === 'good';

  const cardStyle = isWarning ? styles.cardWarning : isCaution ? styles.cardCaution : isGood ? styles.cardGood : styles.card;
  const kickerStyle = isWarning || isCaution ? styles.kickerWarning : styles.kicker;
  const sessionTypeStyle = isWarning ? styles.sessionTypeWarning : isCaution ? styles.sessionTypeCaution : isGood ? styles.sessionTypeGood : styles.sessionType;
  const dividerStyle = isWarning ? styles.dividerWarning : isCaution ? styles.dividerCaution : styles.divider;
  const labelStyle = isWarning || isCaution ? styles.labelWarning : styles.label;
  const bodyStyle = isWarning || isCaution ? styles.bodyWarning : styles.body;
  const buttonStyle = isWarning ? styles.buttonWarning : isCaution ? styles.buttonCaution : styles.button;
  const buttonTextStyle = styles.buttonText;

  return (
    <View style={cardStyle}>
      <Text style={kickerStyle}>NEXT RECOMMENDED SESSION</Text>
      <Text style={sessionTypeStyle}>{sessionType}</Text>

      <View style={dividerStyle} />

      <Text style={labelStyle}>Reason</Text>
      <Text style={bodyStyle}>{reason}</Text>

      <Text style={[labelStyle, styles.labelSpacing]}>Suggested session</Text>
      <Text style={bodyStyle}>{suggestion}</Text>

      <TouchableOpacity style={buttonStyle} onPress={() => onAction(actionType)}>
        <Text style={buttonTextStyle}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 6 },
  cardGood: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f6b3c', gap: 6 },
  cardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 6 },
  cardCaution: { backgroundColor: '#1c1408', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#6b5020', gap: 6 },

  kicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  kickerWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },

  sessionType: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeGood: { color: '#91e6a3', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeWarning: { color: '#ffb86b', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeCaution: { color: '#f0c070', fontSize: 26, fontWeight: '900', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#203529', marginVertical: 6 },
  dividerWarning: { height: 1, backgroundColor: '#7a4a1f', marginVertical: 6 },
  dividerCaution: { height: 1, backgroundColor: '#6b5020', marginVertical: 6 },

  label: { color: '#91e6a3', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelSpacing: { marginTop: 8 },

  body: { color: '#aeb8aa', fontSize: 13, lineHeight: 20 },
  bodyWarning: { color: '#c8a070', fontSize: 13, lineHeight: 20 },

  button: { backgroundColor: '#91e6a3', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonWarning: { backgroundColor: '#ffb86b', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonCaution: { backgroundColor: '#f0c070', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonText: { color: '#07110c', fontSize: 13, fontWeight: '900' },
});
