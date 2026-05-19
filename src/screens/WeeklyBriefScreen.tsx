import { tokens as T } from '@/src/theme/tokens';
import { useTraining } from '@/src/screens/TrainingContext';
import { buildWeeklyBrief, type BriefLine, type BriefTone } from '@/src/utils/weeklyBriefUtils';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TONE_COLORS: Record<BriefTone, string> = {
  good:    '#91e6a3',
  warn:    '#ffaa44',
  bad:     '#e05050',
  neutral: '#7a9480',
};

function BriefLineRow({ line }: { line: BriefLine }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.lineLabel}>{line.label}</Text>
      <Text style={[styles.lineValue, { color: TONE_COLORS[line.tone] }]}>{line.value}</Text>
    </View>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionRule} />
      </View>
      {children}
    </View>
  );
}

export default function WeeklyBriefScreen() {
  const router = useRouter();
  const { logs, isLoading } = useTraining();

  const brief = useMemo(() => buildWeeklyBrief(logs), [logs]);

  const handleShare = useCallback(async () => {
    const lines = [
      '// SENTINEL READY — WEEKLY BRIEF //',
      `${brief.weekRef}  ·  ${brief.weekRange}`,
      `MISSION STATUS: ${brief.missionStatus}`,
      '',
      '--- OPERATIONAL SUMMARY ---',
      ...brief.summary.map((l) => `${l.label}: ${l.value}`),
      ...(brief.loadAnalysis.length > 0 ? ['', '--- LOAD ANALYSIS ---', ...brief.loadAnalysis.map((l) => `${l.label}: ${l.value}`)] : []),
      ...(brief.readinessTrend.length > 0 ? ['', '--- READINESS TREND ---', ...brief.readinessTrend.map((l) => `${l.label}: ${l.value}`)] : []),
      '',
      '--- SUSTAIN ---',
      ...brief.sustain.map((s) => `✓ ${s}`),
      '',
      '--- IMPROVE ---',
      ...brief.improve.map((s) => `⚑ ${s}`),
      '',
      '--- DIRECTIVE ---',
      brief.directive,
    ];
    try { await Share.share({ message: lines.join('\n') }); } catch {}
  }, [brief]);

  const statusColor = TONE_COLORS[brief.statusTone];

  if (isLoading) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share weekly brief">
              <Text style={styles.shareBtnText}>SHARE</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.kicker}>// OPERATIONS CENTRE //</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>WEEKLY BRIEF</Text>
            <View style={styles.weekRefBadge}>
              <Text style={styles.weekRefText}>{brief.weekRef}</Text>
            </View>
          </View>
          <Text style={styles.weekRange}>{brief.weekRange}</Text>
          <View style={styles.divider} />
        </View>

        {/* Classification bar */}
        <View style={styles.classBar}>
          <Text style={styles.classText}>// UNCLASSIFIED — OPERATOR USE ONLY //</Text>
        </View>

        {/* Mission status banner */}
        <View style={[styles.statusBanner, { borderColor: statusColor + '55', backgroundColor: statusColor + '0c' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>MISSION STATUS</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>{brief.missionStatus}</Text>
        </View>

        {/* Operational Summary */}
        <SectionBlock title="OPERATIONAL SUMMARY">
          <View style={styles.card}>
            {brief.summary.map((line) => <BriefLineRow key={line.label} line={line} />)}
          </View>
        </SectionBlock>

        {/* Load Analysis */}
        {brief.loadAnalysis.length > 0 && (
          <SectionBlock title="LOAD ANALYSIS">
            <View style={styles.card}>
              {brief.loadAnalysis.map((line) => <BriefLineRow key={line.label} line={line} />)}
            </View>
          </SectionBlock>
        )}

        {/* Readiness Trend */}
        {brief.readinessTrend.length > 0 && (
          <SectionBlock title="READINESS TREND">
            <View style={styles.card}>
              {brief.readinessTrend.map((line) => <BriefLineRow key={line.label} line={line} />)}
            </View>
          </SectionBlock>
        )}

        {/* SUSTAIN */}
        <SectionBlock title="SUSTAIN">
          <View style={[styles.card, styles.cardGood]}>
            {brief.sustain.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletGood}>✓</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </SectionBlock>

        {/* IMPROVE */}
        <SectionBlock title="IMPROVE">
          <View style={[styles.card, styles.cardWarn]}>
            {brief.improve.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletWarn}>⚑</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </SectionBlock>

        {/* Next week directive */}
        <SectionBlock title="NEXT WEEK DIRECTIVE">
          <View style={styles.directiveBox}>
            <Text style={styles.directiveLabel}>COMMANDING OFFICER'S INTENT</Text>
            <Text style={styles.directiveText}>{brief.directive}</Text>
          </View>
        </SectionBlock>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bgDark },
  content: { paddingBottom: 60 },

  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4, marginBottom: 8 },
  headerBtns: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
  shareBtn: { borderWidth: 1, borderColor: '#1e3826', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
  shareBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  backBtnText: { color: T.textAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  kicker: { color: T.textHintDark, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  title: { color: T.textPrimaryDark, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  weekRefBadge: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, paddingHorizontal: 10, paddingVertical: 4 },
  weekRefText: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  weekRange: { color: T.textSubtle, fontSize: 12, fontWeight: '700', marginTop: 2 },
  divider: { height: 1, backgroundColor: T.borderDim, marginTop: 12 },

  classBar: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0a0a0a', borderRadius: 3, paddingVertical: 5, alignItems: 'center' },
  classText: { color: '#2e5038', fontSize: 8, fontWeight: '900', letterSpacing: 3 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  statusValue: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginLeft: 'auto' },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionTitle: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 3, flexShrink: 0 },
  sectionRule: { flex: 1, height: 1, backgroundColor: '#1e3826' },

  card: { backgroundColor: T.bgPanelAlt, borderRadius: 4, borderWidth: 1, borderColor: T.borderDim, overflow: 'hidden' },
  cardGood: { borderColor: '#1e4a28', backgroundColor: '#071209' },
  cardWarn: { borderColor: '#4a3010', backgroundColor: '#0e0a06' },

  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.borderDim },
  lineLabel: { color: T.textHintDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  lineValue: { fontSize: 12, fontWeight: '900' },

  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#172c20' },
  bulletGood: { color: '#91e6a3', fontSize: 11, fontWeight: '900', marginTop: 1 },
  bulletWarn: { color: '#ffaa44', fontSize: 11, fontWeight: '900', marginTop: 1 },
  bulletText: { flex: 1, color: T.textSubtle, fontSize: 13, lineHeight: 19, fontWeight: '600' },

  directiveBox: { backgroundColor: '#08100c', borderRadius: 4, borderWidth: 1, borderColor: '#1e3826', borderLeftWidth: 3, borderLeftColor: T.textAccent, padding: 14, gap: 6 },
  directiveLabel: { color: T.textHintDark, fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  directiveText: { color: T.textSubtle, fontSize: 13, lineHeight: 20, fontWeight: '600' },
});
