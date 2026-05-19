import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import {
  buildLeaderboard,
  getSquadSummary,
  METRIC_OPTIONS,
  type LeaderboardMetric,
  type RankedMember,
} from '@/src/utils/leaderboardUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MEDAL_COLORS = ['#ffaa44', '#9ab0c4', '#c97c3a'];
const MEDAL_LABELS = ['1ST', '2ND', '3RD'];

function MemberRow({ member, index }: { member: RankedMember; index: number }) {
  const isTop3 = member.position <= 3;
  const medalColor = isTop3 ? MEDAL_COLORS[member.position - 1] : null;
  return (
    <View style={[styles.row, member.isYou && styles.rowYou]}>
      {member.isYou && <View style={styles.youAccent} />}
      <View style={styles.rowInner}>
        <View style={[styles.posBlock, medalColor ? { backgroundColor: medalColor + '18', borderColor: medalColor + '44' } : {}]}>
          {isTop3
            ? <Text style={[styles.medal, { color: medalColor! }]}>{MEDAL_LABELS[member.position - 1]}</Text>
            : <Text style={styles.posNum}>{member.position}</Text>
          }
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.rankText}>{member.rank}</Text>
            <Text style={[styles.callsign, member.isYou && styles.callsignYou]}>{member.callsign}</Text>
            {member.isYou && <View style={styles.youChip}><Text style={styles.youChipText}>YOU</Text></View>}
          </View>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricVal, medalColor ? { color: medalColor } : member.isYou ? { color: '#91e6a3' } : {}]}>
            {member.metricLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PodiumCard({ members }: { members: RankedMember[] }) {
  const top3 = members.slice(0, 3);
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);
  const topHeights = [80, 100, 60];

  return (
    <View style={styles.podium}>
      {ordered.map((m, i) => {
        if (!m) return null;
        const barH = topHeights[i];
        const color = MEDAL_COLORS[m.position - 1];
        return (
          <View key={m.id} style={styles.podiumCol}>
            <Text style={[styles.podiumCallsign, { color }]}>{m.callsign}</Text>
            <Text style={styles.podiumRank}>{m.rank}</Text>
            <Text style={[styles.podiumMetric, { color }]}>{m.metricLabel}</Text>
            <View style={[styles.podiumBar, { height: barH, backgroundColor: color + '22', borderColor: color + '55' }]}>
              <Text style={[styles.podiumPos, { color }]}>{MEDAL_LABELS[m.position - 1]}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function LeaderboardScreen() {
  const { logs } = useTraining();
  const profile = useUser();
  const router = useRouter();
  const [metric, setMetric] = useState<LeaderboardMetric>('ruck_km');

  const callsign = (profile as any)?.callsign ?? 'OPERATOR';
  const rank = (profile as any)?.rank ?? 'PTE';

  const ranked = useMemo(() => buildLeaderboard(logs, callsign, rank, metric), [logs, callsign, rank, metric]);
  const summary = useMemo(() => getSquadSummary(ranked), [ranked]);
  const currentMetric = METRIC_OPTIONS.find((m) => m.value === metric)!;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.screenKicker}>{'// UNIT LEADERBOARD //'}</Text>
      </View>

      {/* Position summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryAccent} />
        <View style={styles.summaryInner}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryKicker}>YOUR POSITION</Text>
            <Text style={[styles.summaryPos, summary.yourPosition !== null && summary.yourPosition <= 3 ? { color: MEDAL_COLORS[summary.yourPosition - 1] } : {}]}>
              #{summary.yourPosition ?? '--'}
            </Text>
            <Text style={styles.summaryOf}>of {summary.total} operators</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryKicker}>CURRENT METRIC</Text>
            <Text style={styles.summaryMetric}>{currentMetric.label}</Text>
            <Text style={styles.summaryDesc}>{currentMetric.description}</Text>
            {summary.topThird && (
              <View style={styles.topThirdBadge}>
                <Text style={styles.topThirdText}>TOP THIRD</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll} contentContainerStyle={styles.metricRow}>
        {METRIC_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.metricChip, metric === opt.value && styles.metricChipActive]}
            onPress={() => setMetric(opt.value)}
          >
            <Text style={[styles.metricChipText, metric === opt.value && styles.metricChipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Podium */}
      <View style={styles.podiumCard}>
        <View style={styles.cardAccentBar} />
        <View style={styles.podiumCardInner}>
          <Text style={styles.sectionKicker}>{'// TOP PERFORMERS'}</Text>
          <PodiumCard members={ranked} />
        </View>
      </View>

      {/* Full list */}
      <View style={styles.listCard}>
        <View style={[styles.cardAccentBar, { backgroundColor: '#3fc8e4' }]} />
        <View style={styles.listCardInner}>
          <Text style={styles.sectionKicker}>{'// FULL SQUAD RANKING'}</Text>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderPos}>POS</Text>
            <Text style={styles.listHeaderName}>OPERATOR</Text>
            <Text style={styles.listHeaderMetric}>{currentMetric.label}</Text>
          </View>
          {ranked.map((member, i) => (
            <MemberRow key={member.id} member={member} index={i} />
          ))}
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Squad data is seeded for demonstration. Live sync requires unit backend connection.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050e09' },
  content: { padding: 16, paddingBottom: 80, gap: 12 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 4 },
  backBtn: { paddingVertical: 6, paddingRight: 16 },
  backText: { color: '#3a6b46', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  screenKicker: { color: '#3a6b46', fontSize: 10, fontWeight: '900', letterSpacing: 3 },

  summaryCard: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  summaryAccent: { width: 3, flexShrink: 0, backgroundColor: '#ffaa44' },
  summaryInner: { flex: 1, padding: 16, flexDirection: 'row', gap: 20 },
  summaryLeft: { flex: 1, gap: 2 },
  summaryRight: { flex: 2, gap: 2 },
  summaryKicker: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  summaryPos: { color: '#ffaa44', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  summaryOf: { color: '#5a7a62', fontSize: 10, fontWeight: '700' },
  summaryMetric: { color: '#edf5ea', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  summaryDesc: { color: '#5a7a62', fontSize: 10, fontWeight: '600' },
  topThirdBadge: { marginTop: 4, backgroundColor: 'rgba(145,230,163,0.1)', borderWidth: 1, borderColor: '#235c32', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  topThirdText: { color: '#91e6a3', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

  metricScroll: { flexGrow: 0 },
  metricRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  metricChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  metricChipActive: { backgroundColor: 'rgba(63,200,228,0.1)', borderColor: '#1e6a7a' },
  metricChipText: { color: '#3a6b46', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  metricChipTextActive: { color: '#3fc8e4' },

  podiumCard: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  cardAccentBar: { width: 3, flexShrink: 0, backgroundColor: '#ffaa44' },
  podiumCardInner: { flex: 1, padding: 16, gap: 12 },
  listCard: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  listCardInner: { flex: 1, padding: 16, gap: 8 },
  sectionKicker: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5, marginBottom: 4 },

  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8, paddingBottom: 4 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 4 },
  podiumCallsign: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  podiumRank: { color: '#5a7a62', fontSize: 9, fontWeight: '700' },
  podiumMetric: { fontSize: 10, fontWeight: '900' },
  podiumBar: { width: '100%', borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  podiumPos: { fontSize: 12, fontWeight: '900' },

  listHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#172c20' },
  listHeaderPos: { width: 44, color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  listHeaderName: { flex: 1, color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  listHeaderMetric: { width: 90, color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, textAlign: 'right' },

  row: { borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#172c20' },
  rowYou: { borderColor: '#235c32', backgroundColor: 'rgba(145,230,163,0.04)' },
  youAccent: { height: 2, backgroundColor: '#91e6a3' },
  rowInner: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  posBlock: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a1610' },
  medal: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  posNum: { color: '#5a7a62', fontSize: 13, fontWeight: '900' },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankText: { color: '#3a6b46', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  callsign: { color: '#edf5ea', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  callsignYou: { color: '#91e6a3' },
  youChip: { backgroundColor: 'rgba(145,230,163,0.1)', borderWidth: 1, borderColor: '#235c32', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  youChipText: { color: '#91e6a3', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  metricBlock: { width: 90, alignItems: 'flex-end' },
  metricVal: { color: '#7a9480', fontSize: 12, fontWeight: '900' },

  disclaimer: { padding: 12, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  disclaimerText: { color: '#3a5040', fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 15 },
});
