import { DS } from '@/constants/theme';
import {
  addSaluteReport,
  deleteSaluteReport,
  EMPTY_SALUTE_DRAFT,
  formatSaluteReport,
  isSaluteDraftFileable,
  loadSaluteReports,
  type SaluteReport,
  type SaluteReportDraft,
} from '@/src/services/saluteReports';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type FieldKey = keyof SaluteReportDraft;

const FIELD_CONFIG: { key: FieldKey; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'size', label: 'S - Size', placeholder: 'Personnel, vehicles, count' },
  { key: 'activity', label: 'A - Activity', placeholder: 'What they are doing' },
  { key: 'location', label: 'L - Location', placeholder: 'Grid, landmark, route, coordinates' },
  { key: 'unit', label: 'U - Unit', placeholder: 'Unit, markings, affiliation' },
  { key: 'time', label: 'T - Time', placeholder: 'Observed time or leave blank for now' },
  { key: 'equipment', label: 'E - Equipment', placeholder: 'Weapons, tools, radios, vehicles' },
  { key: 'notes', label: 'Notes', placeholder: 'Context, confidence, follow-up', multiline: true },
];

function shortDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SaluteLogScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<SaluteReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SaluteReportDraft>(EMPTY_SALUTE_DRAFT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    loadSaluteReports().then((loaded) => {
      if (!isMounted) return;
      setReports(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );
  const formattedReport = useMemo(
    () => selectedReport ? formatSaluteReport(selectedReport) : '',
    [selectedReport],
  );

  const handleDraftChange = useCallback((key: FieldKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFileReport = useCallback(async () => {
    if (!isSaluteDraftFileable(draft)) {
      Alert.alert('Incomplete SALUTE', 'Add at least one core observation before filing the report.');
      return;
    }
    const updated = await addSaluteReport(draft);
    setReports(updated);
    setSelectedId(updated[0]?.id ?? null);
    setDraft(EMPTY_SALUTE_DRAFT);
  }, [draft]);

  const handleShare = useCallback(async () => {
    if (!selectedReport) return;
    try {
      await Share.share({
        title: 'SALUTE Report',
        message: formattedReport,
      });
    } catch {
      Alert.alert('Share failed', 'The report could not be shared. The text remains selectable below.');
    }
  }, [formattedReport, selectedReport]);

  const handleDelete = useCallback(() => {
    if (!selectedReport) return;
    Alert.alert(
      'Delete SALUTE report?',
      'This removes the filed report from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteSaluteReport(selectedReport.id);
            setReports(updated);
            setSelectedId(updated[0]?.id ?? null);
          },
        },
      ],
    );
  }, [selectedReport]);

  if (isLoading) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>{'<'} BACK</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>FIELD INTELLIGENCE</Text>
        <Text style={styles.title}>SALUTE Log</Text>
        <Text style={styles.subtitle}>File and review tactical observation reports from this device.</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{reports.length}</Text>
          <Text style={styles.summaryLabel}>REPORTS</Text>
        </View>
        <View style={styles.summaryCardWide}>
          <Text style={styles.summaryMeta}>LATEST</Text>
          <Text style={styles.summaryValue}>{reports[0] ? shortDate(reports[0].createdAt) : 'No reports filed'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardKicker}>FILE REPORT</Text>
          <Text style={styles.cardMeta}>SALUTE</Text>
        </View>
        {FIELD_CONFIG.map((field) => (
          <View key={field.key} style={styles.fieldBlock}>
            <Text style={styles.inputLabel}>{field.label}</Text>
            <TextInput
              style={[styles.input, field.multiline && styles.textArea]}
              value={draft[field.key]}
              onChangeText={(value) => handleDraftChange(field.key, value)}
              placeholder={field.placeholder}
              placeholderTextColor={DS.textMuted}
              multiline={field.multiline}
              textAlignVertical={field.multiline ? 'top' : 'center'}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.fileButton, !isSaluteDraftFileable(draft) && styles.buttonDisabled]}
          onPress={handleFileReport}
          disabled={!isSaluteDraftFileable(draft)}
          accessibilityRole="button"
          accessibilityLabel="File SALUTE report"
        >
          <Text style={styles.fileButtonText}>FILE SALUTE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardKicker}>REPORT HISTORY</Text>
          <Text style={styles.cardMeta}>{reports.length} TOTAL</Text>
        </View>
        {reports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No SALUTE reports filed</Text>
            <Text style={styles.emptyText}>Filed reports will appear here with share-ready formatted text.</Text>
          </View>
        ) : (
          reports.map((report) => {
            const active = selectedReport?.id === report.id;
            return (
              <TouchableOpacity
                key={report.id}
                style={[styles.reportRow, active && styles.reportRowActive]}
                onPress={() => setSelectedId(report.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Open SALUTE report from ${shortDate(report.createdAt)}`}
              >
                <View style={styles.reportMain}>
                  <Text style={active ? styles.reportTitleActive : styles.reportTitle} numberOfLines={1}>
                    {report.activity || report.location || report.size || 'Untitled observation'}
                  </Text>
                  <Text style={styles.reportSub} numberOfLines={1}>
                    {report.location || 'Location unknown'} - {shortDate(report.createdAt)}
                  </Text>
                </View>
                <Text style={active ? styles.reportBadgeActive : styles.reportBadge}>VIEW</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {selectedReport ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardKicker}>REPORT DETAIL</Text>
              <Text style={styles.detailTitle}>{selectedReport.activity || selectedReport.location || 'SALUTE report'}</Text>
            </View>
            <Text style={styles.cardMeta}>{shortDate(selectedReport.createdAt)}</Text>
          </View>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>SIZE</Text>
              <Text style={styles.detailValue}>{selectedReport.size || '--'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>UNIT</Text>
              <Text style={styles.detailValue}>{selectedReport.unit || '--'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>EQUIPMENT</Text>
              <Text style={styles.detailValue}>{selectedReport.equipment || '--'}</Text>
            </View>
          </View>
          <Text selectable style={styles.formattedText}>{formattedReport}</Text>
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share selected SALUTE report"
            >
              <Text style={styles.shareButtonText}>SHARE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete selected SALUTE report"
            >
              <Text style={styles.deleteButtonText}>DELETE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.bgPrimary },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 16, paddingBottom: 72, gap: 14 },
  header: { gap: 5 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  backButtonText: { color: DS.gold, fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  kicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: DS.textPrimary, fontSize: 32, fontWeight: '900' },
  subtitle: { color: DS.textSecondary, fontSize: 14, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    width: 112,
    backgroundColor: DS.bgCard,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 14,
    gap: 3,
  },
  summaryCardWide: {
    flex: 1,
    backgroundColor: DS.bgCard,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 14,
    gap: 3,
  },
  summaryNumber: { color: DS.gold, fontSize: 28, fontWeight: '900' },
  summaryLabel: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  summaryMeta: { color: DS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  summaryValue: { color: DS.textPrimary, fontSize: 15, fontWeight: '900' },
  card: {
    backgroundColor: DS.bgCard,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 14,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardKicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  cardMeta: { color: DS.textSecondary, fontSize: 11, fontWeight: '900' },
  fieldBlock: { gap: 5 },
  inputLabel: { color: DS.textPrimary, fontSize: 12, fontWeight: '900' },
  input: {
    minHeight: 44,
    backgroundColor: DS.bgPrimary,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    color: DS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: { minHeight: 92, lineHeight: 20 },
  fileButton: {
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: DS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileButtonText: { color: DS.bgPrimary, fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  buttonDisabled: { opacity: 0.45 },
  emptyBox: {
    backgroundColor: DS.bgPrimary,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 14,
    gap: 4,
  },
  emptyTitle: { color: DS.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyText: { color: DS.textSecondary, fontSize: 13, lineHeight: 19 },
  reportRow: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.bgPrimary,
  },
  reportRowActive: { borderColor: DS.gold },
  reportMain: { flex: 1, gap: 3 },
  reportTitle: { color: DS.textPrimary, fontSize: 14, fontWeight: '900' },
  reportTitleActive: { color: DS.gold, fontSize: 14, fontWeight: '900' },
  reportSub: { color: DS.textSecondary, fontSize: 12, fontWeight: '800' },
  reportBadge: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  reportBadgeActive: { color: DS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  detailTitle: { color: DS.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 3 },
  detailGrid: { flexDirection: 'row', gap: 8 },
  detailCell: {
    flex: 1,
    backgroundColor: DS.bgPrimary,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  detailLabel: { color: DS.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  detailValue: { color: DS.textPrimary, fontSize: 12, fontWeight: '900' },
  formattedText: {
    color: DS.textSecondary,
    backgroundColor: DS.bgPrimary,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  detailActions: { flexDirection: 'row', gap: 10 },
  shareButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.gold,
  },
  shareButtonText: { color: DS.bgPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  deleteButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25100f',
    borderWidth: 1,
    borderColor: DS.danger,
  },
  deleteButtonText: { color: DS.danger, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
});
