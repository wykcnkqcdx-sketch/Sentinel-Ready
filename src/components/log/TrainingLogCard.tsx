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

const TrainingLogCard = memo(function TrainingLogCard({ log, weakReasons: propWeakReasons, onEdit, onDuplicate, onDelete }: Props) {
  const fatigueWatch = isFatigueWatch(log.readiness);
  const weakReasons = propWeakReasons ?? getWeakLogReasons(log);
  const weakLog = weakReasons.length > 0;
  const colorScheme = useColorScheme() ?? 'dark';
  const catPalette = getCategoryPalette(log.category);

  return (
    <View style={[fatigueWatch ? styles.logCardWarning : styles.logCard, { borderLeftColor: catPalette.color, borderLeftWidth: 4 }]}>
      <View style={styles.logHeader}>
        <View style={styles.logHeaderText}>
          <Text style={[styles.logCategory, { color: catPalette.color }]}>{log.category}</Text>
          <Text style={styles.logTitle}>{log.type}</Text>
        </View>

        <View style={fatigueWatch ? styles.readinessBadgeWarning : styles.readinessBadge}>
          <Text style={fatigueWatch ? styles.readinessTextWarning : styles.readinessText}>
            {log.readiness}/10
          </Text>
        </View>
      </View>

      <View style={styles.logMetaRow}>
        <Text style={styles.logMeta}>{log.date}</Text>
        <Text style={styles.logMeta}>{log.duration}</Text>
      </View>

      <View style={styles.detailBox}>
        <Text style={styles.detailLabel}>Distance / Load</Text>
        <Text style={styles.detailText}>{log.distanceLoad}</Text>
      </View>

      {log.category === 'Ruck' && log.route ? (
        <View style={styles.mapContainer}>
          <RuckMap route={log.route} routePoints={log.routePoints} colorScheme={colorScheme} />
        </View>
      ) : null}

      <Text style={styles.logNotes}>{log.notes}</Text>

      {weakLog ? (
        <View style={styles.weakLogBox}>
          <Text style={styles.weakLogTitle}>Weak Log</Text>
          <Text style={styles.weakLogText}>Improve: {weakReasons.join(', ')}</Text>
        </View>
      ) : null}

      <View style={styles.statusRow}>
        <Text style={fatigueWatch ? styles.statusWarning : styles.status}>
          {getReadinessLabel(log.readiness)}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(log.id)}
            accessibilityRole="button"
            accessibilityLabel="Edit log"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={() => onDuplicate(log.id)}>
            <Text style={styles.editButtonText}>Duplicate</Text>
          </TouchableOpacity>

          {weakLog ? (
            <TouchableOpacity
              style={styles.improveButton}
              onPress={() => onEdit(log.id)}
              accessibilityRole="button"
              accessibilityLabel="Improve log"
            >
              <Text style={styles.improveButtonText}>Improve</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(log)}
            accessibilityRole="button"
            accessibilityLabel="Delete log"
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default TrainingLogCard;

const styles = StyleSheet.create({
  logCard: { backgroundColor: '#00253D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 },
  logCardWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', gap: 10 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  logHeaderText: { flex: 1 },
  logCategory: { color: '#B5852C', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  logTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  readinessBadge: { backgroundColor: '#003050', borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  readinessBadgeWarning: { backgroundColor: 'rgba(212,160,26,0.1)', borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  readinessText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  readinessTextWarning: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },
  logMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  logMeta: { color: '#8FAEC8', fontSize: 12, fontWeight: '800' },
  detailBox: { backgroundColor: '#000D1A', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detailLabel: { color: '#8FAEC8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 4 },
  logNotes: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  weakLogBox: { backgroundColor: 'rgba(212,160,26,0.1)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)' },
  weakLogTitle: { color: '#D4A01A', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  weakLogText: { color: '#D4A01A', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  status: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  statusWarning: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  editButton: { borderWidth: 1, borderColor: 'rgba(181,133,44,0.3)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  editButtonText: { color: '#B5852C', fontSize: 12, fontWeight: '900' },
  improveButton: { backgroundColor: '#D4A01A', borderWidth: 1, borderColor: '#D4A01A', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  improveButtonText: { color: '#000D1A', fontSize: 12, fontWeight: '900' },
  deleteButton: { borderWidth: 1, borderColor: 'rgba(212,160,26,0.3)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  deleteButtonText: { color: '#D4A01A', fontSize: 12, fontWeight: '900' },
  mapContainer: { marginTop: 8, marginBottom: 4, borderRadius: 12, overflow: 'hidden' },
});
