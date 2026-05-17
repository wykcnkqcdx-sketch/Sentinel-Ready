import { useTraining } from '@/src/screens/TrainingContext';
import {
  buildAchievements,
  getTotalXP,
  getXPLevel,
  TIER_COLORS,
  type Achievement,
  type AchievementTier,
} from '@/src/utils/achievementUtils';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const FILTERS = ['ALL', 'EARNED', 'RUCK', 'CONSISTENCY', 'RECOVERY', 'MILESTONES'] as const;
type Filter = (typeof FILTERS)[number];

function XPRing({ progress, color }: { progress: number; color: string }) {
  const R = 28;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - progress / 100);
  return (
    <Svg width={72} height={72}>
      <Circle cx={36} cy={36} r={R} fill="none" stroke="#172c20" strokeWidth={6} />
      <Circle cx={36} cy={36} r={R} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 36 36)" />
    </Svg>
  );
}

function TierBadge({ tier }: { tier: AchievementTier }) {
  const color = TIER_COLORS[tier];
  return (
    <View style={[styles.tierBadge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <Text style={[styles.tierText, { color }]}>{tier.toUpperCase()}</Text>
    </View>
  );
}

function AchievementCard({ item }: { item: Achievement }) {
  const tierColor = TIER_COLORS[item.tier];
  const dim = !item.earned;
  return (
    <View style={[styles.card, dim && styles.cardDim]}>
      <View style={[styles.cardAccent, { backgroundColor: dim ? '#172c20' : tierColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: dim ? '#0a1610' : tierColor + '18', borderColor: dim ? '#172c20' : tierColor + '44' }]}>
            <Text style={[styles.iconText, { color: dim ? '#3a5040' : tierColor }]}>{item.icon}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardTitle, dim && styles.cardTitleDim]} numberOfLines={1}>{item.title}</Text>
            <TierBadge tier={item.tier} />
          </View>
          <Text style={[styles.xpText, dim && styles.xpDim]}>+{item.xp} XP</Text>
        </View>
        <Text style={[styles.cardDesc, dim && styles.cardDescDim]} numberOfLines={2}>{item.description}</Text>
        {!item.earned && item.progress > 0 && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progress}%` as any, backgroundColor: tierColor + '88' }]} />
            </View>
            <Text style={styles.progressLabel}>{item.progress}%</Text>
          </View>
        )}
        {item.earned && (
          <Text style={[styles.earnedTag, { color: tierColor }]}>✓ EARNED</Text>
        )}
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const { logs, goals } = useTraining();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');

  const achievements = useMemo(() => buildAchievements(logs, goals), [logs, goals]);
  const totalXP = useMemo(() => getTotalXP(achievements), [achievements]);
  const levelData = useMemo(() => getXPLevel(totalXP), [totalXP]);

  const filtered = useMemo(() => {
    let list = achievements;
    if (filter === 'EARNED') return list.filter((a) => a.earned);
    if (filter === 'ALL') return list;
    return list.filter((a) => a.category.toUpperCase() === filter);
  }, [achievements, filter]);

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.screenKicker}>// ACHIEVEMENTS //</Text>
      </View>

      {/* XP Level card */}
      <View style={styles.levelCard}>
        <View style={styles.levelAccent} />
        <View style={styles.levelInner}>
          <View style={styles.levelLeft}>
            <View style={styles.ringWrap}>
              <XPRing progress={levelData.progressToNext} color={levelData.color} />
              <View style={styles.ringCenter}>
                <Text style={[styles.ringLevel, { color: levelData.color }]}>{levelData.level}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.levelLabel}>LEVEL {levelData.level}</Text>
              <Text style={[styles.levelTitle, { color: levelData.color }]}>{levelData.title}</Text>
              <Text style={styles.levelNext}>{levelData.progressToNext}% to next</Text>
            </View>
          </View>
          <View style={styles.xpBlock}>
            <Text style={styles.xpBig}>{totalXP}</Text>
            <Text style={styles.xpUnit}>TOTAL XP</Text>
            <Text style={styles.earnedCount}>{earnedCount}/{achievements.length} earned</Text>
          </View>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Achievement grid */}
      <View style={styles.grid}>
        {filtered.sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0)).map((item) => (
          <AchievementCard key={item.id} item={item} />
        ))}
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

  levelCard: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  levelAccent: { width: 3, flexShrink: 0, backgroundColor: '#91e6a3' },
  levelInner: { flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringWrap: { position: 'relative', width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringLevel: { fontSize: 22, fontWeight: '900' },
  levelLabel: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  levelTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  levelNext: { color: '#5a7a62', fontSize: 10, fontWeight: '700', marginTop: 2 },
  xpBlock: { alignItems: 'flex-end', gap: 2 },
  xpBig: { color: '#edf5ea', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  xpUnit: { color: '#3a6b46', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  earnedCount: { color: '#5a7a62', fontSize: 10, fontWeight: '700' },

  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  filterChipActive: { backgroundColor: 'rgba(145,230,163,0.1)', borderColor: '#3a6b46' },
  filterText: { color: '#3a6b46', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  filterTextActive: { color: '#91e6a3' },

  grid: { gap: 8 },
  card: { flexDirection: 'row', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: '#172c20', backgroundColor: '#0a1610' },
  cardDim: { opacity: 0.6 },
  cardAccent: { width: 3, flexShrink: 0 },
  cardInner: { flex: 1, padding: 12, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 16, fontWeight: '900' },
  cardMeta: { flex: 1, gap: 3 },
  cardTitle: { color: '#edf5ea', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  cardTitleDim: { color: '#5a7a62' },
  xpText: { color: '#91e6a3', fontSize: 11, fontWeight: '900' },
  xpDim: { color: '#3a5040' },
  cardDesc: { color: '#7a9480', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  cardDescDim: { color: '#3a5040' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#172c20', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { color: '#5a7a62', fontSize: 9, fontWeight: '900', width: 32, textAlign: 'right' },
  earnedTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  tierBadge: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  tierText: { fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
});
