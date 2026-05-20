import { StyleSheet, Text, View } from 'react-native';

type MissionStatProps = {
  label: string;
  value: string;
  status?: string;
};

export default function MissionStat({ label, value, status }: MissionStatProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2229',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    color: '#A7ADB8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  status: {
    color: '#A7ADB8',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
});
