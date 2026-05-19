import { buildSafetyAlerts, type AlertLevel, type RuckSafetyInput, type SafetyAlert } from '@/src/utils/ruckSafetyUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ACCENT: Record<AlertLevel, string> = {
  green: '#91e6a3',
  amber: '#e6c84a',
  red: '#e64a4a',
};

const BG: Record<AlertLevel, string> = {
  green: 'rgba(145,230,163,0.06)',
  amber: 'rgba(230,200,74,0.06)',
  red: 'rgba(230,74,74,0.06)',
};

function AlertCard({ alert }: { alert: SafetyAlert }) {
  const color = ACCENT[alert.level];
  return (
    <View style={[styles.card, { backgroundColor: BG[alert.level], borderColor: color + '44' }]}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text style={[styles.title, { color }]}>{alert.title}</Text>
        <Text style={styles.detail} numberOfLines={2}>{alert.detail}</Text>
      </View>
    </View>
  );
}

export function RuckSafetyAlerts(props: RuckSafetyInput) {
  const alerts = buildSafetyAlerts(props);
  if (alerts.length === 0) return null;
  return (
    <View style={styles.container}>
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  card: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accent: { width: 3, flexShrink: 0 },
  body: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  title: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  detail: { color: '#7a9480', fontSize: 11, fontWeight: '600', lineHeight: 15 },
});
