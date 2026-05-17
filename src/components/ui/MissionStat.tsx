import { StyleSheet, Text, View } from 'react-native';

type MissionStatProps = {
  label: string;
  value: string;
  status?: string;
  accent?: string;
};

export default function MissionStat({ label, value, status, accent = '#91e6a3' }: MissionStatProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.topBar, { backgroundColor: accent }]} />
      <View style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accent }]}>{value}</Text>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
      <View style={[styles.cornerMark, { borderColor: accent + '55' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#090f0c',
    borderRadius: 6,
    width: '47%',
    borderWidth: 1,
    borderColor: '#172c20',
    overflow: 'hidden',
    position: 'relative',
  },
  topBar: {
    height: 2,
    width: '100%',
  },
  inner: {
    padding: 14,
    gap: 3,
  },
  label: {
    color: '#4e7558',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  status: {
    color: '#5e7a64',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cornerMark: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 10,
    height: 10,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
});
