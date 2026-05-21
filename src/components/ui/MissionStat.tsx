import { StyleSheet, Text, View } from 'react-native';

type MissionStatProps = {
  label: string;
  value: string;
  status?: string;
};

export default function MissionStat({ label, value, status }: MissionStatProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRule} />
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.value}>{value}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c1008',
    borderRadius: 6,
    padding: 14,
    paddingTop: 12,
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.15)',
  },
  topRule: {
    height: 2,
    backgroundColor: '#B5852C',
    borderRadius: 1,
    marginBottom: 10,
  },
  label: {
    color: '#b8c0b0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  status: {
    color: '#b8c0b0',
    fontSize: 11,
    marginTop: 5,
    lineHeight: 16,
  },
});
