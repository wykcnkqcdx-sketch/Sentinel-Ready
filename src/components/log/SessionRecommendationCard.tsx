import { RecommendationActionType, SessionRecommendation } from '@/src/utils/trainingLogUtils';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  recommendation: SessionRecommendation;
  onAction: (actionType: RecommendationActionType) => void;
};

const SessionRecommendationCard = memo(function SessionRecommendationCard({ recommendation, onAction }: Props) {
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
});

export default SessionRecommendationCard;

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E2229', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 },
  cardGood: { backgroundColor: '#1E2229', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(252,76,2,0.3)', gap: 6 },
  cardWarning: { backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', gap: 6 },
  cardCaution: { backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', gap: 6 },

  kicker: { color: '#FC4C02', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  kickerWarning: { color: '#F5A623', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },

  sessionType: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeGood: { color: '#FC4C02', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeWarning: { color: '#F5A623', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeCaution: { color: '#F5A623', fontSize: 26, fontWeight: '900', marginTop: 2 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 },
  dividerWarning: { height: 1, backgroundColor: 'rgba(245,166,35,0.3)', marginVertical: 6 },
  dividerCaution: { height: 1, backgroundColor: 'rgba(245,166,35,0.3)', marginVertical: 6 },

  label: { color: '#FC4C02', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelWarning: { color: '#F5A623', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelSpacing: { marginTop: 8 },

  body: { color: '#A7ADB8', fontSize: 13, lineHeight: 20 },
  bodyWarning: { color: '#A7ADB8', fontSize: 13, lineHeight: 20 },

  button: { backgroundColor: '#FC4C02', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonWarning: { backgroundColor: '#F5A623', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonCaution: { backgroundColor: '#F5A623', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonText: { color: '#0F1115', fontSize: 13, fontWeight: '900' },
});
