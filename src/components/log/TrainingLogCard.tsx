import RuckMap from '@/src/components/log/RuckMap';
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

  return (
    <View style={fatigueWatch ? styles.logCardWarning : styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logHeaderText}>
          <Text style={styles.logCategory}>{log.category}</Text>
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
          <RuckMap route={log.route} colorScheme={colorScheme} />
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
  logCard: { backgroundColor: '#0d1812', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#203529', gap: 10 },
  logCardWarning: { backgroundColor: '#21140b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7a4a1f', gap: 10 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  logHeaderText: { flex: 1 },
  logCategory: { color: '#91e6a3', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  logTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  readinessBadge: { backgroundColor: '#102d1a', borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  readinessBadgeWarning: { backgroundColor: '#2a1a0d', borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  readinessText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  readinessTextWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  logMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  logMeta: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  detailBox: { backgroundColor: '#07110c', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#26382c' },
  detailLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailText: { color: '#dfe8da', fontSize: 13, fontWeight: '800', marginTop: 4 },
  logNotes: { color: '#c4cec0', fontSize: 14, lineHeight: 21 },
  weakLogBox: { backgroundColor: '#2a1a0d', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#7a4a1f' },
  weakLogTitle: { color: '#ffb86b', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  weakLogText: { color: '#ffb86b', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  status: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  statusWarning: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  editButton: { borderWidth: 1, borderColor: '#2f6b3c', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  editButtonText: { color: '#91e6a3', fontSize: 12, fontWeight: '900' },
  improveButton: { backgroundColor: '#ffb86b', borderWidth: 1, borderColor: '#ffb86b', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  improveButtonText: { color: '#07110c', fontSize: 12, fontWeight: '900' },
  deleteButton: { borderWidth: 1, borderColor: '#7a4a1f', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  deleteButtonText: { color: '#ffb86b', fontSize: 12, fontWeight: '900' },
  mapContainer: { marginTop: 8, marginBottom: 4, borderRadius: 12, overflow: 'hidden' },
});
