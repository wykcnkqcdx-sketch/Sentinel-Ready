import { StyleSheet, Text, View } from 'react-native';

type Props = {
  score: number;
  label: string;
  message: string;
};

export default function TrainingLogHealthCard({ score, label, message }: Props) {
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
}

const styles = StyleSheet.create({
  healthCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#2f6b3c', gap: 10 },
  healthCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  healthKicker: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  healthScore: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthScoreWarning: { color: '#ffb86b', fontSize: 34, fontWeight: '900', marginTop: 4 },
  healthPill: { backgroundColor: '#102d1a', borderRadius: 999, borderWidth: 1, borderColor: '#2f6b3c', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillWarning: { backgroundColor: '#2a1a0d', borderRadius: 999, borderWidth: 1, borderColor: '#7a4a1f', paddingHorizontal: 12, paddingVertical: 8 },
  healthPillText: { color: '#91e6a3', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthPillTextWarning: { color: '#ffb86b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  healthMessage: { color: '#aeb8aa', fontSize: 13, lineHeight: 19 },
  healthMessageWarning: { color: '#ffb86b', fontSize: 13, lineHeight: 19, fontWeight: '800' },
});
