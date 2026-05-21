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
  card: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.12)', gap: 6 },
  cardGood: { backgroundColor: '#0c1008', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 6 },
  cardWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 6 },
  cardCaution: { backgroundColor: 'rgba(255,170,68,0.06)', borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(255,170,68,0.3)', gap: 6 },

  kicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  kickerWarning: { color: '#ffaa44', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },

  sessionType: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeGood: { color: '#B5852C', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeWarning: { color: '#ffaa44', fontSize: 26, fontWeight: '900', marginTop: 2 },
  sessionTypeCaution: { color: '#ffaa44', fontSize: 26, fontWeight: '900', marginTop: 2 },

  divider: { height: 1, backgroundColor: 'rgba(181,133,44,0.12)', marginVertical: 6 },
  dividerWarning: { height: 1, backgroundColor: 'rgba(255,170,68,0.3)', marginVertical: 6 },
  dividerCaution: { height: 1, backgroundColor: 'rgba(255,170,68,0.3)', marginVertical: 6 },

  label: { color: '#B5852C', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelWarning: { color: '#ffaa44', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  labelSpacing: { marginTop: 8 },

  body: { color: '#b8c0b0', fontSize: 13, lineHeight: 20 },
  bodyWarning: { color: '#b8c0b0', fontSize: 13, lineHeight: 20 },

  button: { backgroundColor: '#B5852C', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonWarning: { backgroundColor: '#ffaa44', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonCaution: { backgroundColor: '#ffaa44', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  buttonText: { color: '#080c05', fontSize: 13, fontWeight: '900' },
});
