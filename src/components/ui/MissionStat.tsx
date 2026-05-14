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
    backgroundColor: '#101a14',
    borderRadius: 18,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: '#26382c',
  },
  label: {
    color: '#8fbf8f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  status: {
    color: '#aeb8aa',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
});