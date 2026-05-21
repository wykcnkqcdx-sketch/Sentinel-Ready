import RuckMap from '@/src/components/log/RuckMap';
import { getCategoryPalette } from '@/constants/theme';
import { TrainingLog } from '@/src/screens/TrainingContext';
import { getReadinessLabel, getWeakLogReasons, isFatigueWatch } from '@/src/utils/trainingLogUtils';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';

type Props = {
  log: TrainingLog;
  weakReasons?: string[];
  onEdit: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (log: TrainingLog) => void;
};

function getReadinessTier(readiness: string): 'green' | 'amber' | 'red' {
  const n = Number(readiness) || 0;
  if (n >= 8) return 'green';
  if (n >= 6) return 'amber';
  return 'red';
}

const TIER_STYLES = {
  green: {
    badge: { backgroundColor: 'rgba(94,122,47,0.2)', borderColor: 'rgba(94,122,47,0.5)' },
    text: { color: '#5E7A2F' },
    label: 'FIT',
  },
  amber: {
    badge: { backgroundColor: 'rgba(255,170,68,0.15)', borderColor: 'rgba(255,170,68,0.4)' },
    text: { color: '#ffaa44' },
    label: 'MOD',
  },
  red: {
    badge: { backgroundColor: 'rgba(224,80,80,0.15)', borderColor: 'rgba(224,80,80,0.4)' },
    text: { color: '#e05050' },
    label: 'LOW',
  },
};

const TrainingLogCard = memo(function TrainingLogCard({
  log,
  weakReasons: propWeakReasons,
  onEdit,
  onDuplicate,
  onDelete,
}: Props) {
  const fatigueWatch = isFatigueWatch(log.readiness);
  const weakReasons = propWeakReasons ?? getWeakLogReasons(log);
  const weakLog = weakReasons.length > 0;
  const colorScheme = useColorScheme() ?? 'dark';
  const catPalette = getCategoryPalette(log.category);
  const tier = getReadinessTier(log.readiness);
  const tierStyle = TIER_STYLES[tier];

  const cardBorderTopColor = fatigueWatch ? '#ffaa44' : catPalette.color;

  return (
    <View style={[styles.card, { borderTopColor: cardBorderTopColor }]}>

      {/* ── HEADER: category + readiness badge ── */}
      <View style={styles.header}>
        <View style={styles.categoryTag}>
          <View style={[styles.categoryDot, { backgroundColor: catPalette.color }]} />
          <Text style={[styles.categoryLabel, { color: catPalette.color }]}>
            {log.category.toUpperCase()}
          </Text>
        </View>

        <View style={[styles.readinessBadge, tierStyle.badge]}>
          <Text style={[styles.readinessScore, tierStyle.text]}>{log.readiness}/10</Text>
          <Text style={[styles.readinessTierLabel, tierStyle.text]}>{tierStyle.label}</Text>
        </View>
      </View>

      {/* ── SESSION TITLE ── */}
      <Text style={styles.sessionTitle}>{log.type}</Text>

      {/* ── META ROW: date + duration ── */}
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>{log.date}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>{log.duration}</Text>
        </View>
        {fatigueWatch && (
          <>
            <View style={styles.metaDivider} />
            <View style={styles.fatigueChip}>
              <Text style={styles.fatigueChipText}>⚠ FATIGUE WATCH</Text>
            </View>
          </>
        )}
      </View>

      {/* ── STATS GRID ── */}
      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>DISTANCE / LOAD</Text>
          <Text style={styles.statValue}>{log.distanceLoad || '—'}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>READINESS STATUS</Text>
          <Text style={[styles.statValue, tierStyle.text]}>{getReadinessLabel(log.readiness)}</Text>
        </View>
        {log.ruck && (
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>PACK WEIGHT</Text>
            <Text style={styles.statValue}>{log.ruck.packWeightKg} kg</Text>
          </View>
        )}
        {log.ruck?.elevationGainMeters !== undefined && (
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>ELEVATION GAIN</Text>
            <Text style={styles.statValue}>{log.ruck.elevationGainMeters} m</Text>
          </View>
        )}
      </View>

      {/* ── RUCK MAP ── */}
      {log.category === 'Ruck' && log.route ? (
        <View style={styles.mapContainer}>
          <RuckMap route={log.route} routePoints={log.routePoints} colorScheme={colorScheme} />
          {log.ruck && (
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>
                {log.ruck.distanceKm} km · {log.ruck.packWeightKg} kg
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* ── DEBRIEF NOTES ── */}
      {log.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>DEBRIEF</Text>
          <Text style={styles.notesText}>{log.notes}</Text>
        </View>
      ) : null}

      {/* ── WEAK LOG WARNING ── */}
      {weakLog ? (
        <View style={styles.weakBox}>
          <Text style={styles.weakTitle}>⚠ WEAK LOG</Text>
          <Text style={styles.weakText}>Improve: {weakReasons.join(' · ')}</Text>
        </View>
      ) : null}

      {/* ── ACTION ROW ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onEdit(log.id)}
          accessibilityRole="button"
          accessibilityLabel="Edit log"
        >
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onDuplicate(log.id)}
          accessibilityRole="button"
          accessibilityLabel="Duplicate log"
        >
          <Text style={styles.actionBtnText}>Duplicate</Text>
        </TouchableOpacity>

        {weakLog ? (
          <TouchableOpacity
            style={styles.improveBtn}
            onPress={() => onEdit(log.id)}
            accessibilityRole="button"
            accessibilityLabel="Improve log"
          >
            <Text style={styles.improveBtnText}>Improve</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(log)}
          accessibilityRole="button"
          accessibilityLabel="Delete log"
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
});

export default TrainingLogCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c1008',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.15)',
    borderTopWidth: 3,
    overflow: 'hidden',
    gap: 12,
    padding: 16,
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryDot: { width: 8, height: 8, borderRadius: 2 },
  categoryLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },

  readinessBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  readinessScore: { fontSize: 13, fontWeight: '900' },
  readinessTierLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Session title
  sessionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', lineHeight: 26 },

  // Meta row
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaChip: {
    backgroundColor: '#080c05',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaText: { color: '#b8c0b0', fontSize: 12, fontWeight: '800' },
  metaDivider: { width: 1, height: 14, backgroundColor: 'rgba(181,133,44,0.2)' },
  fatigueChip: {
    backgroundColor: 'rgba(255,170,68,0.12)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,170,68,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fatigueChipText: { color: '#ffaa44', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#080c05',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.1)',
    padding: 12,
  },
  statCell: { flex: 1, minWidth: '45%', gap: 3 },
  statLabel: { color: '#b8c0b0', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  statValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  // Map
  mapContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(8,12,5,0.82)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.25)',
  },
  mapOverlayText: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // Notes
  notesBox: {
    backgroundColor: '#080c05',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.1)',
    padding: 12,
    gap: 5,
  },
  notesLabel: { color: '#B5852C', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  notesText: { color: '#c4cec0', fontSize: 13, lineHeight: 20 },

  // Weak log
  weakBox: {
    backgroundColor: 'rgba(212,160,26,0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,170,68,0.3)',
    padding: 10,
    gap: 4,
  },
  weakTitle: { color: '#ffaa44', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  weakText: { color: '#ffaa44', fontSize: 12, lineHeight: 18, fontWeight: '800' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  actionBtn: {
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  improveBtn: {
    backgroundColor: 'rgba(255,170,68,0.15)',
    borderWidth: 1,
    borderColor: '#ffaa44',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  improveBtnText: { color: '#ffaa44', fontSize: 12, fontWeight: '900' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: 'rgba(224,80,80,0.3)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 'auto',
  },
  deleteBtnText: { color: '#e05050', fontSize: 12, fontWeight: '900' },
});
