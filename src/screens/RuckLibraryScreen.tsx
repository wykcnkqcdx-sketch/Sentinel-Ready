import { DS } from '@/constants/theme';
import { tokens as T } from '@/src/theme/tokens';
import { useTraining } from '@/src/screens/TrainingContext';
import { getReadinessNumber } from '@/src/utils/trainingLogUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RuckEntry = {
  id: number;
  date: string;
  type: string;
  distanceKm: number;
  packWeightKg: number;
  paceSecondsPerKm: number;
  durationSeconds: number;
  readiness: number;
  rpe: number | undefined;
};

type RuckGroup = {
  name: string;
  entries: RuckEntry[];
  avgDistanceKm: number;
  avgPackKg: number;
  bestPace: number;
  latestPace: number;
  improving: boolean;
};

function fmtPace(s: number): string {
  if (!s || !Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}/km`;
}

function fmtDate(d: string): string {
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dt = new Date(d + 'T12:00:00');
  return `${String(dt.getDate()).padStart(2, '0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear().toString().slice(2)}`;
}


function SessionRow({ entry }: { entry: RuckEntry }) {
  const paceColor = entry.paceSecondsPerKm > 0 ? '#3fc8e4' : T.textHintDark;
  const rColor = entry.readiness >= 7 ? '#91e6a3' : entry.readiness >= 5 ? DS.warning : DS.danger;
  return (
    <View style={styles.sessionRow}>
      <Text style={styles.sessionDate}>{fmtDate(entry.date)}</Text>
      <Text style={styles.sessionDist}>{entry.distanceKm.toFixed(1)} km</Text>
      <Text style={styles.sessionPack}>{entry.packWeightKg.toFixed(0)} kg</Text>
      <Text style={[styles.sessionPace, { color: paceColor }]}>{fmtPace(entry.paceSecondsPerKm)}</Text>
      {entry.readiness > 0 && <Text style={[styles.sessionReadiness, { color: rColor }]}>R:{entry.readiness}</Text>}
    </View>
  );
}

function GroupCard({ group, expanded, onToggle }: { group: RuckGroup; expanded: boolean; onToggle: () => void }) {
  const trendColor = group.improving ? '#91e6a3' : DS.warning;
  return (
    <View style={styles.groupCard}>
      <TouchableOpacity style={styles.groupHeader} onPress={onToggle} accessibilityRole="button" accessibilityLabel={`${group.name}, ${group.entries.length} sessions`} activeOpacity={0.75}>
        <View style={styles.groupLeft}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMeta}>{group.entries.length} SESSION{group.entries.length !== 1 ? 'S' : ''} · AVG {group.avgDistanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.groupRight}>
          <View style={styles.groupStat}>
            <Text style={styles.groupStatLabel}>BEST PACE</Text>
            <Text style={[styles.groupStatValue, { color: '#91e6a3' }]}>{fmtPace(group.bestPace)}</Text>
          </View>
          {group.entries.length >= 2 && (
            <View style={styles.groupStat}>
              <Text style={styles.groupStatLabel}>TREND</Text>
              <Text style={[styles.groupStatValue, { color: trendColor }]}>{group.improving ? '↑' : '→'}</Text>
            </View>
          )}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.sessionList}>
          <View style={styles.sessionListHeader}>
            <Text style={[styles.sessionHeaderCell, { flex: 1.2 }]}>DATE</Text>
            <Text style={styles.sessionHeaderCell}>DIST</Text>
            <Text style={styles.sessionHeaderCell}>PACK</Text>
            <Text style={styles.sessionHeaderCell}>PACE</Text>
          </View>
          {group.entries.map((e) => <SessionRow key={e.id} entry={e} />)}
        </View>
      )}
    </View>
  );
}

export default function RuckLibraryScreen() {
  const router = useRouter();
  const { logs, isLoading } = useTraining();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const groups = useMemo((): RuckGroup[] => {
    const ruckLogs = logs.filter((l) => l.category === 'Ruck' && l.ruck);
    const map = new Map<string, RuckEntry[]>();

    for (const log of ruckLogs) {
      const r = log.ruck!;
      const entry: RuckEntry = {
        id: log.id,
        date: log.date,
        type: log.type || 'Ruck',
        distanceKm: r.distanceKm,
        packWeightKg: r.packWeightKg,
        paceSecondsPerKm: r.paceSecondsPerKm,
        durationSeconds: r.durationSeconds,
        readiness: getReadinessNumber(log.readiness),
        rpe: r.rpe,
      };
      const bucket = map.get(log.type);
      if (bucket) {
        bucket.push(entry);
      } else {
        map.set(log.type, [entry]);
      }
    }

    return Array.from(map.entries())
      .map(([name, entries]) => {
        const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
        const withPace = sorted.filter((e) => e.paceSecondsPerKm > 0);
        const bestPace = withPace.length > 0 ? Math.min(...withPace.map((e) => e.paceSecondsPerKm)) : 0;
        const latestPace = withPace.length > 0 ? withPace[withPace.length - 1].paceSecondsPerKm : 0;
        const firstPace = withPace.length > 0 ? withPace[0].paceSecondsPerKm : 0;
        const improving = withPace.length >= 2 && latestPace < firstPace;
        const avgDistanceKm = entries.reduce((s, e) => s + e.distanceKm, 0) / entries.length;
        const avgPackKg = entries.reduce((s, e) => s + e.packWeightKg, 0) / entries.length;
        return { name, entries: sorted.reverse(), avgDistanceKm, avgPackKg, bestPace, latestPace, improving };
      })
      .sort((a, b) => b.entries.length - a.entries.length);
  }, [logs]);

  const totals = useMemo(() => {
    const ruckLogs = logs.filter((l) => l.category === 'Ruck' && l.ruck);
    const dist = ruckLogs.reduce((s, l) => s + (l.ruck?.distanceKm ?? 0), 0);
    return { count: ruckLogs.length, dist };
  }, [logs]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.kicker}>{'// OPERATIONS CENTRE //'}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>RUCK LIBRARY</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totals.count}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        {totals.count > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>TOTAL SESSIONS</Text>
              <Text style={styles.summaryValue}>{totals.count}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>TOTAL DISTANCE</Text>
              <Text style={[styles.summaryValue, { color: '#91e6a3' }]}>{totals.dist.toFixed(1)} km</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>ROUTE TYPES</Text>
              <Text style={styles.summaryValue}>{groups.length}</Text>
            </View>
          </View>
        )}

        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO RUCK DATA</Text>
            <Text style={styles.emptySub}>Log a ruck session to build your library.</Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((g) => (
              <GroupCard
                key={g.name}
                group={g}
                expanded={expandedGroup === g.name}
                onToggle={() => setExpandedGroup(expandedGroup === g.name ? null : g.name)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4, marginBottom: 8 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: T.textAccent, fontSize: 12, fontWeight: '900' },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  summaryRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden' },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4, borderRightWidth: 1, borderRightColor: T.borderDim },
  summaryLabel: { color: T.textHintDark, fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  summaryValue: { color: T.textSubtle, fontSize: 16, fontWeight: '900' },

  groupList: { paddingHorizontal: 16, gap: 8 },
  groupCard: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  groupLeft: { flex: 1, gap: 3 },
  groupName: { color: T.textPrimaryDark, fontSize: 13, fontWeight: '900' },
  groupMeta: { color: T.textHintDark, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupStat: { alignItems: 'flex-end', gap: 2 },
  groupStatLabel: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  groupStatValue: { fontSize: 13, fontWeight: '900' },
  chevron: { color: T.textHintDark, fontSize: 9 },

  sessionList: { borderTopWidth: 1, borderTopColor: T.borderDim },
  sessionListHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#080f0b', gap: 8 },
  sessionHeaderCell: { flex: 1, color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.borderDim, gap: 8 },
  sessionDate: { flex: 1.2, color: T.textHintDark, fontSize: 10, fontWeight: '700' },
  sessionDist: { flex: 1, color: T.textSubtle, fontSize: 11, fontWeight: '900' },
  sessionPack: { flex: 1, color: T.textSubtle, fontSize: 11, fontWeight: '700' },
  sessionPace: { flex: 1, fontSize: 11, fontWeight: '900' },
  sessionReadiness: { fontSize: 10, fontWeight: '900' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: T.textHintDark, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  emptySub: { color: '#2e5038', fontSize: 13, fontWeight: '700' },
});
