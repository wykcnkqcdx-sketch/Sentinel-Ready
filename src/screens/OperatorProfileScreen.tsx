import { tokens as T } from '@/src/theme/tokens';
import { useTraining } from '@/src/screens/TrainingContext';
import { useUser } from '@/src/screens/UserContext';
import { CATEGORY_COLORS } from '@/src/utils/adaptivePlanUtils';
import { buildOperatorProfile } from '@/src/utils/operatorProfileUtils';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function OperatorProfileScreen() {
  const router = useRouter();
  const { logs, goals, isLoading } = useTraining();
  const { role, trainingLevel, testDate } = useUser();

  const profile = useMemo(
    () => buildOperatorProfile(logs, goals, role, trainingLevel, testDate),
    [logs, goals, role, trainingLevel, testDate],
  );

  if (isLoading) return <View style={styles.screen} />;

  const streakColor = profile.currentStreak >= 4 ? '#91e6a3' : profile.currentStreak >= 2 ? '#ffaa44' : T.textSubtle;
  const readinessColor = profile.avgReadiness >= 7 ? '#91e6a3' : profile.avgReadiness >= 5 ? '#ffaa44' : '#e05050';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.kicker}>// OPERATIONS CENTRE //</Text>
          <Text style={styles.title}>PERSONNEL FILE</Text>
          <View style={styles.divider} />
        </View>

        {/* Classification bar */}
        <View style={styles.classBar}>
          <Text style={styles.classText}>// UNCLASSIFIED — OPERATOR RECORD //</Text>
        </View>

        {/* Identity block */}
        <View style={styles.identityCard}>
          <View style={styles.identityLeft}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarGlyph}>◈</Text>
            </View>
          </View>
          <View style={styles.identityRight}>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>SERVICE NO.</Text>
              <Text style={styles.identityVal}>{profile.serviceNumber}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>STATUS</Text>
              <Text style={[styles.identityVal, { color: '#91e6a3' }]}>ACTIVE DUTY</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>LEVEL</Text>
              <Text style={styles.identityVal}>{profile.trainingLevel.toUpperCase()}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityKey}>ROLE</Text>
              <Text style={[styles.identityVal, styles.identityValWrap]} numberOfLines={2}>{profile.role}</Text>
            </View>
            {profile.testDate && (
              <View style={styles.identityRow}>
                <Text style={styles.identityKey}>TEST DATE</Text>
                <Text style={styles.identityVal}>{profile.testDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Career record */}
        <SectionHead title="CAREER RECORD" />
        <View style={styles.card}>
          <StatRow label="TOTAL SESSIONS" value={String(profile.totalSessions)} />
          <StatRow label="ACTIVE DAYS" value={String(profile.activeDays)} />
          <StatRow label="CURRENT STREAK" value={profile.currentStreak > 0 ? `${profile.currentStreak} WEEK${profile.currentStreak !== 1 ? 'S' : ''}` : 'NIL'} valueColor={streakColor} />
          <StatRow label="LONGEST STREAK" value={profile.longestStreak > 0 ? `${profile.longestStreak} WEEK${profile.longestStreak !== 1 ? 'S' : ''}` : 'NIL'} />
          <StatRow label="FIRST MISSION" value={profile.firstMission} />
          <StatRow label="LAST MISSION" value={profile.lastMission} />
        </View>

        {/* Load carriage */}
        {profile.totalRuckSessions > 0 && (
          <>
            <SectionHead title="LOAD CARRIAGE" />
            <View style={styles.card}>
              <StatRow label="RUCK SESSIONS" value={String(profile.totalRuckSessions)} />
              <StatRow label="TOTAL DISTANCE" value={`${profile.totalRuckDistanceKm.toFixed(1)} km`} valueColor="#91e6a3" />
              <StatRow label="TOTAL LOAD" value={`${Math.round(profile.totalLoadKgKm).toLocaleString()} kg·km`} />
              <StatRow label="BEST PACE" value={profile.fastestPace} valueColor="#3fc8e4" />
            </View>
          </>
        )}

        {/* Category breakdown */}
        {profile.categoryBreakdown.length > 0 && (
          <>
            <SectionHead title="CATEGORY RECORD" />
            <View style={styles.card}>
              {profile.categoryBreakdown.map((cat) => {
                const color = (CATEGORY_COLORS as Record<string, string>)[cat.category] ?? T.textAccent;
                return (
                  <View key={cat.category} style={styles.catRow}>
                    <Text style={[styles.catLabel, { color }]}>{cat.category.toUpperCase()}</Text>
                    <View style={styles.catBarTrack}>
                      <View style={[styles.catBarFill, { width: `${cat.pct}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.catPct}>{cat.pct}%</Text>
                    <Text style={styles.catCount}>{cat.count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Personal bests */}
        {profile.personalBests.length > 0 && (
          <>
            <SectionHead title="PERSONAL BESTS" />
            <View style={styles.card}>
              {profile.personalBests.map((pb) => (
                <View key={pb.label} style={styles.pbRow}>
                  <View style={styles.pbLeft}>
                    <Text style={styles.pbLabel}>{pb.label}</Text>
                    <Text style={styles.pbDate}>{pb.date}</Text>
                  </View>
                  <Text style={styles.pbValue}>{pb.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Readiness summary */}
        <SectionHead title="READINESS SUMMARY" />
        <View style={styles.card}>
          <StatRow
            label="ALL-TIME AVG READINESS"
            value={profile.avgReadiness > 0 ? `${profile.avgReadiness.toFixed(1)} / 10` : 'NO DATA'}
            valueColor={profile.avgReadiness > 0 ? readinessColor : T.textHintDark}
          />
          <StatRow label="GOALS ACTIVE" value={String(profile.goalsActive)} />
          <StatRow label="GOALS COMPLETE" value={String(profile.goalsComplete)} valueColor={profile.goalsComplete > 0 ? '#91e6a3' : undefined} />
        </View>
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
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  classBar: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0a0a0a', borderRadius: 3, paddingVertical: 5, alignItems: 'center' },
  classText: { color: '#2e5038', fontSize: 8, fontWeight: '900', letterSpacing: 3 },

  identityCard: { flexDirection: 'row', gap: 14, marginHorizontal: 16, marginBottom: 8, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, padding: 14 },
  identityLeft: { justifyContent: 'center' },
  avatarBox: { width: 56, height: 56, borderRadius: 4, borderWidth: 1.5, borderColor: T.textAccent + '55', backgroundColor: T.textAccent + '0c', alignItems: 'center', justifyContent: 'center' },
  avatarGlyph: { color: T.textAccent, fontSize: 22, fontWeight: '900' },
  identityRight: { flex: 1, gap: 5 },
  identityRow: { flexDirection: 'row', gap: 8 },
  identityKey: { color: T.textHintDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, width: 72 },
  identityVal: { color: T.textSubtle, fontSize: 11, fontWeight: '900', flex: 1 },
  identityValWrap: { flexShrink: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#1e3826' },
  sectionTitle: { color: '#2e5a3a', fontSize: 9, fontWeight: '900', letterSpacing: 3 },

  card: { marginHorizontal: 16, backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden' },

  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.borderDim },
  statLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  statValue: { color: T.textSubtle, fontSize: 13, fontWeight: '900' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.borderDim },
  catLabel: { width: 72, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  catBarTrack: { flex: 1, height: 4, backgroundColor: '#172c20', borderRadius: 2, overflow: 'hidden' },
  catBarFill: { height: 4, borderRadius: 2 },
  catPct: { width: 30, color: T.textHintDark, fontSize: 9, fontWeight: '900', textAlign: 'right' },
  catCount: { width: 22, color: T.textSubtle, fontSize: 11, fontWeight: '900', textAlign: 'right' },

  pbRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.borderDim },
  pbLeft: { gap: 2 },
  pbLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  pbDate: { color: '#2e5038', fontSize: 8, fontWeight: '700' },
  pbValue: { color: '#3fc8e4', fontSize: 16, fontWeight: '900' },
});
