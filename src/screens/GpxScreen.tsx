import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTraining, TrainingLog } from '@/src/screens/TrainingContext';
import { exportSessionGpx } from '@/src/utils/gpxExport';
import { parseGpx, GpxPoint } from '@/src/utils/gpxParser';
import type { TrainingSession, TrackPoint } from '@/src/types/map';

// ─── helpers ────────────────────────────────────────────────────────────────

function logToSession(log: TrainingLog): TrainingSession {
  return {
    id: String(log.id),
    type: (
      log.category === 'Ruck' ? 'Ruck'
      : log.category === 'Run' ? 'Run'
      : log.category === 'Strength' ? 'Strength'
      : log.category === 'Mobility' ? 'Mobility'
      : 'Workout'
    ) as TrainingSession['type'],
    title: `${log.type} — ${log.distanceLoad}`,
    score: 0,
    durationMinutes: 60,
    rpe: 6,
    routePoints: log.routePoints,
    completedAt: log.date + 'T12:00:00',
  };
}

function gpxPointToTrackPoint(p: GpxPoint): TrackPoint {
  return {
    latitude: p.lat,
    longitude: p.lon,
    altitude: p.ele ?? null,
    accuracy: null,
    timestamp: p.time ?? Date.now(),
  };
}

// ─── types ───────────────────────────────────────────────────────────────────

type ParsedRoute = {
  name?: string;
  pointCount: number;
  waypointCount: number;
  points: TrackPoint[];
};

// ─── screen ──────────────────────────────────────────────────────────────────

const GpsLogCard = memo(function GpsLogCard({
  log,
  isExporting,
  isAnyExporting,
  onExport,
}: {
  log: TrainingLog;
  isExporting: boolean;
  isAnyExporting: boolean;
  onExport: (log: TrainingLog) => void;
}) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logInfo}>
        <Text style={styles.logDate}>{log.date}</Text>
        <Text style={styles.logType}>
          {log.type}
          {log.distanceLoad ? ` — ${log.distanceLoad}` : ''}
        </Text>
        <Text style={styles.logPoints}>
          {'📍 '}
          {log.routePoints?.length ?? 0} GPS points
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.exportBtn,
          isExporting && styles.exportBtnDisabled,
        ]}
        onPress={() => onExport(log)}
        disabled={isAnyExporting}
        accessibilityRole="button"
        accessibilityLabel={`Export ${log.date} as GPX`}
      >
        <Text style={styles.exportBtnText}>
          {isExporting ? 'Exporting...' : 'EXPORT GPX'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default function GpxScreen() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exporting, setExporting] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedRoute | null>(null);
  const [fileName, setFileName] = useState('');

  const { logs, addLog } = useTraining();

  const gpsLogs = useMemo(
    () =>
      logs
        .filter((l) => l.routePoints && l.routePoints.length >= 2)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [logs],
  );

  const handleExport = useCallback(async (log: TrainingLog) => {
    setExporting(log.id);
    try {
      await exportSessionGpx(logToSession(log));
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(null);
    }
  }, []);

  const handlePickGpx = useCallback(async () => {
    setImporting(true);
    setParsed(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setImporting(false);
        return;
      }
      const asset = result.assets[0];
      setFileName(asset.name ?? 'route.gpx');
      const xml = await FileSystem.readAsStringAsync(asset.uri);
      const gpx = parseGpx(xml);
      if (gpx.trackPoints.length === 0) {
        Alert.alert(
          'No track found',
          'The GPX file contains no track points. Check the file and try again.',
        );
        setImporting(false);
        return;
      }
      setParsed({
        name: gpx.name,
        pointCount: gpx.trackPoints.length,
        waypointCount: gpx.waypoints.length,
        points: gpx.trackPoints.map(gpxPointToTrackPoint),
      });
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not read file');
    } finally {
      setImporting(false);
    }
  }, []);

  const handleImportLog = useCallback(() => {
    if (!parsed) return;
    const today = new Date().toISOString().slice(0, 10);
    const estKm = (parsed.pointCount * 0.005).toFixed(1);
    addLog({
      date: today,
      category: 'Ruck',
      type: 'GPX Import',
      duration: '',
      distanceLoad: `~${estKm} km`,
      readiness: '',
      notes: parsed.name
        ? `Imported from GPX: ${parsed.name}`
        : 'Imported from GPX file',
      routePoints: parsed.points,
    });
    Alert.alert(
      'Imported',
      `Route added to your training log with ${parsed.pointCount} track points.`,
    );
    setParsed(null);
    setFileName('');
  }, [parsed, addLog]);

  const clearParsed = useCallback(() => {
    setParsed(null);
    setFileName('');
  }, []);

  const handleTabExport = useCallback(() => setActiveTab('export'), []);
  const handleTabImport = useCallback(() => setActiveTab('import'), []);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>GPX FILES</Text>
        <Text style={styles.title}>Import / Export</Text>
        <Text style={styles.subtitle}>
          Share routes with Garmin, Strava, Komoot and ATAK devices.
        </Text>
      </View>

      {/* ── Tab pills ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'export' && styles.tabPillActive]}
          onPress={handleTabExport}
        >
          <Text
            style={[styles.tabPillText, activeTab === 'export' && styles.tabPillTextActive]}
          >
            Export
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'import' && styles.tabPillActive]}
          onPress={handleTabImport}
        >
          <Text
            style={[styles.tabPillText, activeTab === 'import' && styles.tabPillTextActive]}
          >
            Import
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Export tab ── */}
      {activeTab === 'export' && (
        <ScrollView contentContainerStyle={styles.content}>
          {gpsLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No GPS sessions yet</Text>
              <Text style={styles.emptyText}>
                Track a ruck session on the Ruck → Track tab, then export it as a GPX
                file to share with other apps and devices.
              </Text>
            </View>
          ) : (
            gpsLogs.map((log) => (
              <GpsLogCard
                key={log.id}
                log={log}
                isExporting={exporting === log.id}
                isAnyExporting={exporting !== null}
                onExport={handleExport}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Import tab ── */}
      {activeTab === 'import' && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Step 1 */}
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Select GPX File</Text>
            <Text style={styles.emptyText}>
              Pick a .gpx file from Files, Garmin Connect, Komoot or any other source.
            </Text>
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={handlePickGpx}
              disabled={importing}
            >
              <Text style={styles.pickBtnText}>
                {importing ? 'Picking...' : 'PICK GPX FILE'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Step 2 — preview */}
          {parsed !== null && (
            <View style={styles.previewCard}>
              <Text style={styles.previewKicker}>ROUTE PREVIEW</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>File</Text>
                <Text style={styles.previewValue}>{fileName}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Name</Text>
                <Text style={styles.previewValue}>
                  {parsed.name ?? 'Unnamed route'}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Track points</Text>
                <Text style={styles.previewValue}>{parsed.pointCount}</Text>
              </View>
              {parsed.waypointCount > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Waypoints</Text>
                  <Text style={styles.previewValue}>{parsed.waypointCount}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.importBtn} onPress={handleImportLog}>
                <Text style={styles.importBtnText}>ADD TO TRAINING LOG</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearParsed}
              >
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>SUPPORTED FORMATS</Text>
            <Text style={styles.infoText}>
              {'• GPX 1.1 (track points + waypoints)\n'}
              {'• Exports work with: Garmin Connect, Strava, Komoot, ATAK, AllTrails, ViewRanger\n'}
              {'• Import from: Garmin devices, running watches, other GPS apps'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000D1A' },
  headerBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 4 },
  kicker: { color: '#8FAEC8', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#8FAEC8', fontSize: 15, lineHeight: 22 },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 4 },
  tabPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  tabPillActive: { backgroundColor: 'rgba(181,133,44,0.3)', borderColor: 'rgba(181,133,44,0.3)' },
  tabPillText: { color: '#8FAEC8', fontSize: 13, fontWeight: '800' },
  tabPillTextActive: { color: '#FFFFFF', fontWeight: '900' },

  // Scroll content
  content: { padding: 20, paddingBottom: 100, gap: 14 },

  // Log card (export tab)
  logCard: {
    backgroundColor: '#00253D',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logInfo: { flex: 1, gap: 3 },
  logDate: { color: '#8FAEC8', fontSize: 12, fontWeight: '800' },
  logType: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  logPoints: { color: '#8FAEC8', fontSize: 12 },
  exportBtn: {
    backgroundColor: 'rgba(181,133,44,0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  exportBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  exportBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },

  // Pick button (import tab)
  pickBtn: {
    backgroundColor: 'rgba(181,133,44,0.3)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  pickBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Preview card
  previewCard: {
    backgroundColor: '#003050',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    gap: 10,
  },
  previewKicker: {
    color: '#B5852C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: { color: '#8FAEC8', fontSize: 13 },
  previewValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  importBtn: {
    backgroundColor: 'rgba(181,133,44,0.3)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  clearLink: { color: '#8FAEC8', fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Info card
  infoCard: {
    backgroundColor: '#00253D',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  infoTitle: {
    color: '#B5852C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoText: { color: '#8FAEC8', fontSize: 13, lineHeight: 20 },

  // Empty card
  emptyCard: {
    backgroundColor: '#00253D',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  emptyTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#8FAEC8', fontSize: 13, lineHeight: 20 },
});
