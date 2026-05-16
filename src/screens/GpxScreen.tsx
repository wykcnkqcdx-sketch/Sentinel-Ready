import React, { useMemo, useState } from 'react';
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

  async function handleExport(log: TrainingLog) {
    setExporting(log.id);
    try {
      await exportSessionGpx(logToSession(log));
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(null);
    }
  }

  async function handlePickGpx() {
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
  }

  function handleImportLog() {
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
  }

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
          onPress={() => setActiveTab('export')}
        >
          <Text
            style={[styles.tabPillText, activeTab === 'export' && styles.tabPillTextActive]}
          >
            Export
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'import' && styles.tabPillActive]}
          onPress={() => setActiveTab('import')}
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
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logInfo}>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <Text style={styles.logType}>
                    {log.type}
                    {log.distanceLoad ? ` — ${log.distanceLoad}` : ''}
                  </Text>
                  <Text style={styles.logPoints}>
                    {'📍 '}
                    {log.routePoints!.length} GPS points
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.exportBtn,
                    exporting === log.id && styles.exportBtnDisabled,
                  ]}
                  onPress={() => handleExport(log)}
                  disabled={exporting !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Export ${log.date} as GPX`}
                >
                  <Text style={styles.exportBtnText}>
                    {exporting === log.id ? 'Exporting...' : 'EXPORT GPX'}
                  </Text>
                </TouchableOpacity>
              </View>
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
                onPress={() => {
                  setParsed(null);
                  setFileName('');
                }}
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
  screen: { flex: 1, backgroundColor: '#07110c' },
  headerBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 4 },
  kicker: { color: '#8fbf8f', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#f2f5ef', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 15, lineHeight: 22 },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 4 },
  tabPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#203529',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  tabPillActive: { backgroundColor: '#2f6b3c', borderColor: '#2f6b3c' },
  tabPillText: { color: '#8fbf8f', fontSize: 13, fontWeight: '800' },
  tabPillTextActive: { color: '#f2f5ef', fontWeight: '900' },

  // Scroll content
  content: { padding: 20, paddingBottom: 100, gap: 14 },

  // Log card (export tab)
  logCard: {
    backgroundColor: '#0d1812',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#203529',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logInfo: { flex: 1, gap: 3 },
  logDate: { color: '#8fbf8f', fontSize: 12, fontWeight: '800' },
  logType: { color: '#f2f5ef', fontSize: 14, fontWeight: '900' },
  logPoints: { color: '#aeb8aa', fontSize: 12 },
  exportBtn: {
    backgroundColor: '#2f6b3c',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  exportBtnText: { color: '#f2f5ef', fontSize: 12, fontWeight: '900' },
  exportBtnDisabled: { backgroundColor: '#1a2e22' },

  // Pick button (import tab)
  pickBtn: {
    backgroundColor: '#2f6b3c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  pickBtnText: {
    color: '#f2f5ef',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Preview card
  previewCard: {
    backgroundColor: '#102d1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    gap: 10,
  },
  previewKicker: {
    color: '#91e6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: { color: '#aeb8aa', fontSize: 13 },
  previewValue: { color: '#f2f5ef', fontSize: 13, fontWeight: '800' },
  importBtn: {
    backgroundColor: '#2f6b3c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  importBtnText: {
    color: '#f2f5ef',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  clearLink: { color: '#4a7a5a', fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Info card
  infoCard: {
    backgroundColor: '#0d1812',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#203529',
    gap: 6,
  },
  infoTitle: {
    color: '#91e6a3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoText: { color: '#aeb8aa', fontSize: 13, lineHeight: 20 },

  // Empty card
  emptyCard: {
    backgroundColor: '#0d1812',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#203529',
    gap: 8,
  },
  emptyTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#aeb8aa', fontSize: 13, lineHeight: 20 },
});
