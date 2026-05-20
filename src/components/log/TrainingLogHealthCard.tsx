import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  score: number;
  label: string;
  message: string;
};

const TrainingLogHealthCard = memo(function TrainingLogHealthCard({ score, label, message }: Props) {
  const isWarning = score < 60;

  return (
    <View style={isWarning ? styles.healthCardWarning : styles.healthCard}>
      <View style={styles.healthHeader}>
        <View>
          <Text style={styles.healthKicker}>TRAINING LOG HEALTH</Text>
          <Text style={isWarning ? styles.healthScoreWarning : styles.healthScore}>
            {score}/100
          </Text>
        </View>

        <View style={isWarning ? styles.healthPillWarning : styles.healthPill}>
          <Text style={isWarning ? styles.healthPillTextWarning : styles.healthPillText}>
            {label}
          </Text>
        </View>
      </View>

      <Text style={isWarning ? styles.healthMessageWarning : styles.healthMessage}>
        {message}
      </Text>
    </View>
  );
});

export default TrainingLogHealthCard;

const styles = StyleSheet.create({
  healthCard: { backgroundColor: '#00253D', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', gap: 10 },
  healthCardWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', gap: 10 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  healthKicker: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  healthScore: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthScoreWarning: { color: '#D4A01A', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthPill: { backgroundColor: '#003050', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillText: { color: '#B5852C', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthPillTextWarning: { color: '#D4A01A', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthMessage: { color: '#8FAEC8', fontSize: 13, lineHeight: 19 },
  healthMessageWarning: { color: '#D4A01A', fontSize: 13, lineHeight: 19, fontWeight: '800' },
});
