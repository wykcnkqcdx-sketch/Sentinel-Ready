import { StyleSheet, Text, View } from 'react-native';

type SentinelCardProps = {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
};

export default function SentinelCard({
  title,
  children,
  variant = 'default',
}: SentinelCardProps) {
  return (
    <View style={[styles.card, styles[variant]]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  default: {
    backgroundColor: '#102018',
    borderColor: '#26382c',
  },
  warning: {
    backgroundColor: '#1a160d',
    borderColor: '#4a3a1d',
  },
  success: {
    backgroundColor: '#102017',
    borderColor: '#2f5f3a',
  },
  title: {
    color: '#f2f5ef',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    gap: 8,
  },
});