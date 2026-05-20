import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { tokens as T } from '@/src/theme/tokens';

export function AppShell({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.shell, style]}>{children}</View>;
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, toneStyles[tone]]}>{value}</Text>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon = 'play',
  danger,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, danger && styles.dangerButton]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons name={icon} size={18} color="#0F1115" />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MapControlButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.mapControl, active && styles.mapControlActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={active ? '#0F1115' : T.textPrimary} />
    </TouchableOpacity>
  );
}

export function RouteMapCard({
  title,
  subtitle,
  distance,
  elevation,
  time,
}: {
  title: string;
  subtitle?: string;
  distance?: string;
  elevation?: string;
  time?: string;
}) {
  return (
    <View style={styles.routeCard}>
      <View style={styles.routePreview}>
        <Svg width="100%" height="100%" viewBox="0 0 220 120">
          <Polyline points="18,84 42,58 70,66 96,38 132,42 158,76 198,50" fill="none" stroke="#2D333D" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points="18,84 42,58 70,66 96,38 132,42 158,76 198,50" fill="none" stroke={T.textAccent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={18} cy={84} r={6} fill="#35C759" />
          <Circle cx={198} cy={50} r={6} fill={T.textAccent} />
        </Svg>
      </View>
      <Text style={styles.routeTitle}>{title}</Text>
      {subtitle ? <Text style={styles.routeSubtitle}>{subtitle}</Text> : null}
      <View style={styles.routeStats}>
        {distance ? <Text style={styles.routeStat}>{distance}</Text> : null}
        {elevation ? <Text style={styles.routeStat}>{elevation}</Text> : null}
        {time ? <Text style={styles.routeStat}>{time}</Text> : null}
      </View>
    </View>
  );
}

export function ActivityCard({
  title,
  meta,
  stats,
}: {
  title: string;
  meta?: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={16} color="#0F1115" />
        </View>
        <View style={styles.activityText}>
          <Text style={styles.activityTitle}>{title}</Text>
          {meta ? <Text style={styles.activityMeta}>{meta}</Text> : null}
        </View>
      </View>
      <RouteMapCard title="Route preview" />
      <View style={styles.activityStats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.activityStat}>
            <Text style={styles.activityStatValue}>{stat.value}</Text>
            <Text style={styles.activityStatLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProgressChartCard({ title, values }: { title: string; values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => `${12 + index * (176 / Math.max(1, values.length - 1))},${96 - (value / max) * 72}`)
    .join(' ');

  return (
    <View style={styles.chartCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Svg width="100%" height={110} viewBox="0 0 200 110">
        <Polyline points={points} fill="none" stroke={T.textAccent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function IntelligenceModal({
  visible,
  summary,
  onClose,
}: {
  visible: boolean;
  summary: string;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.intelligenceModal}>
          <Text style={styles.modalTitle}>Athlete Intelligence</Text>
          <MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={58} color={T.textAccent} />
          <Text style={styles.modalSummary}>{summary}</Text>
          <PrimaryButton label="Got It" icon="check" onPress={onClose} />
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.feedback}>Share feedback</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function BottomNav() {
  return null;
}

const toneStyles = StyleSheet.create({
  neutral: { color: T.textPrimary },
  accent: { color: T.textAccent },
  success: { color: T.textOk },
  warning: { color: T.textWarn },
  danger: { color: T.dotRed },
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: T.bgScreen },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: T.borderSubtle, backgroundColor: T.bgPanelDark, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { borderColor: T.textAccent, backgroundColor: '#2A1B14' },
  chipText: { color: T.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  chipTextActive: { color: T.textAccent },
  metricCard: { flex: 1, minWidth: 128, borderRadius: 18, padding: 16, backgroundColor: T.bgPanel, borderWidth: 1, borderColor: T.borderSubtle },
  metricLabel: { color: T.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3 },
  metricValue: { color: T.textPrimary, fontSize: 30, fontWeight: '900', marginTop: 8 },
  metricDetail: { color: T.textMuted, fontSize: 12, marginTop: 5 },
  primaryButton: { minHeight: 52, borderRadius: 16, backgroundColor: T.textAccent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  dangerButton: { backgroundColor: T.dotRed },
  primaryButtonText: { color: '#0F1115', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  mapControl: { width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(15,17,21,0.88)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.borderSubtle },
  mapControlActive: { backgroundColor: T.textAccent, borderColor: T.textAccent },
  routeCard: { borderRadius: 18, padding: 14, backgroundColor: T.bgPanel, borderWidth: 1, borderColor: T.borderSubtle, gap: 8 },
  routePreview: { height: 130, borderRadius: 14, backgroundColor: '#141820', overflow: 'hidden' },
  routeTitle: { color: T.textPrimary, fontSize: 17, fontWeight: '900' },
  routeSubtitle: { color: T.textMuted, fontSize: 12 },
  routeStats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  routeStat: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  activityCard: { borderRadius: 20, padding: 14, backgroundColor: T.bgPanel, borderWidth: 1, borderColor: T.borderSubtle, gap: 12 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 999, backgroundColor: T.textAccent, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1 },
  activityTitle: { color: T.textPrimary, fontSize: 16, fontWeight: '900' },
  activityMeta: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  activityStats: { flexDirection: 'row', gap: 12 },
  activityStat: { flex: 1 },
  activityStatValue: { color: T.textPrimary, fontSize: 18, fontWeight: '900' },
  activityStatLabel: { color: T.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  chartCard: { borderRadius: 18, padding: 16, backgroundColor: T.bgPanel, borderWidth: 1, borderColor: T.borderSubtle },
  cardTitle: { color: T.textPrimary, fontSize: 16, fontWeight: '900' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)', padding: 22 },
  intelligenceModal: { width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: '#FFFFFF', padding: 24, alignItems: 'center', gap: 18 },
  modalTitle: { color: '#111111', fontSize: 20, fontWeight: '900' },
  modalSummary: { color: '#111111', fontSize: 18, fontWeight: '800', lineHeight: 25, textAlign: 'center' },
  feedback: { color: T.textAccent, fontSize: 14, fontWeight: '900' },
});
