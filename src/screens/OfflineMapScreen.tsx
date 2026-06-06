import { DS } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RuckMapView } from '@/src/components/ruck/RuckMapView';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import {
  clearTileCache,
  downloadRegion,
  enforceCacheLimit,
  getCacheStats,
  MAX_CACHE_BYTES,
} from '../services/tileCache';
import type { TrackPoint } from '../types/map';
import type { MapLayerKey } from '../utils/mapTiles';
import {
  buildBoundsFromCorners,
  buildRadiusBounds,
  estimateTileCountForBounds,
  formatBounds,
  getBoundsCenter,
  getBoundsOutline,
  type RegionPoint,
} from '../utils/offlineRegionUtils';

const LAST_POSITION_KEY = 'sentinel_last_position';
const DUBLIN = { latitude: 53.3498, longitude: -6.2603 };
const ZOOM_LEVELS = [13, 14, 15];
const BYTES_PER_TILE_ESTIMATE = 15 * 1024; // 15 KB
const OFFLINE_DOWNLOADS_AVAILABLE = Platform.OS !== 'web';

type Radius = 5 | 10 | 20;
type LayerOption = { key: MapLayerKey; label: string };

const LAYER_OPTIONS: LayerOption[] = [
  { key: 'street', label: 'Street' },
  { key: 'topo', label: 'Topo' },
  { key: 'satellite', label: 'Satellite' },
  { key: 'dark', label: 'Dark' },
];

interface Position {
  latitude: number;
  longitude: number;
}

function toTrackPoint(point: RegionPoint): TrackPoint {
  return { latitude: point.latitude, longitude: point.longitude, altitude: null, accuracy: null, timestamp: 0 };
}

export default function OfflineMapScreen() {
  const router = useRouter();
  const [radius, setRadius] = useState<Radius>(10);
  const [layer, setLayer] = useState<MapLayerKey>('street');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [stats, setStats] = useState({ tileCount: 0, totalBytes: 0 });
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [selectionCorners, setSelectionCorners] = useState<RegionPoint[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadInitialData();
    return () => { mountedRef.current = false; };
  }, []);

  async function loadInitialData() {
    const [statsResult, positionResult] = await Promise.all([
      getCacheStats(),
      AsyncStorage.getItem(LAST_POSITION_KEY),
    ]);
    if (!mountedRef.current) return;
    setStats(statsResult);
    if (positionResult) {
      try {
        const parsed = JSON.parse(positionResult);
        const { latitude, longitude } = parsed ?? {};
        if (
          typeof latitude === 'number' && isFinite(latitude) &&
          typeof longitude === 'number' && isFinite(longitude) &&
          latitude >= -90 && latitude <= 90 &&
          longitude >= -180 && longitude <= 180
        ) {
          setPosition(parsed);
        } else {
          setPosition(DUBLIN);
        }
      } catch {
        setPosition(DUBLIN);
      }
    } else {
      setPosition(DUBLIN);
    }
  }

  const center = useMemo(() => position ?? DUBLIN, [position]);
  const selectedBounds = useMemo(() => (
    selectionCorners.length >= 2
      ? buildBoundsFromCorners(selectionCorners[0], selectionCorners[1])
      : null
  ), [selectionCorners]);
  const downloadBounds = useMemo(() => selectedBounds ?? buildRadiusBounds(center, radius), [center, radius, selectedBounds]);
  const previewCenter = useMemo(() => getBoundsCenter(downloadBounds), [downloadBounds]);
  const previewOutline = useMemo(() => getBoundsOutline(downloadBounds), [downloadBounds]);
  const estimatedTiles = useMemo(() => estimateTileCountForBounds(downloadBounds, ZOOM_LEVELS), [downloadBounds]);
  const estimatedMB = ((estimatedTiles * BYTES_PER_TILE_ESTIMATE) / (1024 * 1024)).toFixed(1);
  const regionMode = selectedBounds ? 'Selected box' : `${radius} km radius`;

  const handleDownload = useCallback(async () => {
    if (!OFFLINE_DOWNLOADS_AVAILABLE) {
      setStatusMsg('Offline tile downloads are available in the native app. Web preview can plan and estimate regions only.');
      return;
    }

    const estimatedBytes = estimatedTiles * BYTES_PER_TILE_ESTIMATE;
    if (stats.totalBytes + estimatedBytes > MAX_CACHE_BYTES) {
      Alert.alert(
        'Storage Limit',
        'This download would exceed the 500MB offline maps limit. Please clear your cache or select a smaller region.'
      );
      return;
    }

    const ac = new AbortController();
    setAbortController(ac);
    setDownloading(true);
    setStatusMsg('');
    setProgress({ downloaded: 0, total: 0 });

    try {
      const result = await downloadRegion(
        downloadBounds,
        ZOOM_LEVELS,
        layer,
        (dl, total) => {
          if (mountedRef.current) setProgress({ downloaded: dl, total });
        },
        ac.signal,
      );
    
    const wasCleared = await enforceCacheLimit(); // Failsafe if tile byte sizes were unusually large
      const newStats = await getCacheStats();
      if (!mountedRef.current) return;
      setStats(newStats);
      if (ac.signal.aborted) {
        setStatusMsg('Download cancelled.');
    } else if (wasCleared) {
      setStatusMsg('Download exceeded 500MB limit. Oldest tiles were automatically removed.');
      } else {
        setStatusMsg(`Download complete. ${result.downloaded} tiles saved, ${result.skipped} already cached, ${result.failed} failed.`);
      }
    } catch {
      if (mountedRef.current) setStatusMsg('Download failed. Check your connection.');
    } finally {
      if (mountedRef.current) {
        setDownloading(false);
        setAbortController(null);
      }
    }
  }, [downloadBounds, layer, stats.totalBytes, estimatedTiles]);

  const handleRegionTap = useCallback((latitude: number, longitude: number) => {
    setSelectionCorners((prev) => {
      if (prev.length >= 2) return [{ latitude, longitude }];
      return [...prev, { latitude, longitude }];
    });
  }, []);

  const handleCancel = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'Delete all cached map tiles? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearTileCache();
            const newStats = await getCacheStats();
            if (mountedRef.current) {
              setStats(newStats);
              setStatusMsg('Cache cleared.');
            }
          },
        },
      ],
    );
  }, []);

  const statsMB = (stats.totalBytes / (1024 * 1024)).toFixed(1);
  const progressPct = progress.total > 0 ? progress.downloaded / progress.total : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={om2.headerRow}>
          <View>
            <Text style={om2.kicker}>[ TACTICAL ROUTE EXPLORER ]</Text>
            <Text style={styles.title}>Offline Maps</Text>
          </View>
          <View style={om2.mapBadge}>
            <Text style={om2.mapBadgeText}>[ MAP READY ]</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Download map tiles for use without signal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{selectedBounds ? 'SELECTED BOUNDS' : 'LOCATION'}</Text>
        {position ? (
          <Text style={styles.cardValue}>
            {selectedBounds ? formatBounds(selectedBounds) : `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`}
          </Text>
        ) : (
          <Text style={styles.cardValueMuted}>Location unavailable</Text>
        )}
      </View>

      {/* Map preview */}
      <View style={om2.previewCard}>
        <Text style={om2.previewKicker}>[ REGION PREVIEW ]</Text>
        <View style={om2.mapWrap}>
          <RuckMapView
            routePoints={previewOutline}
            currentPosition={selectedBounds ? toTrackPoint(previewCenter) : position ? toTrackPoint(position) : null}
            layer={layer}
            zoom={12}
            interactive={!downloading}
            showGpsStatus={false}
            fullHeight
            onDropWaypoint={downloading ? undefined : handleRegionTap}
          />
        </View>
        <Text style={om2.previewSub}>
          {regionMode} - {selectionCorners.length < 2 ? 'Tap two map corners to draw a box' : 'Box locked for download'} - {layer.toUpperCase()} tiles
        </Text>
      </View>

      <View style={styles.card}>
        <View style={om2.selectionHeader}>
          <View style={styles.selectionCopy}>
            <Text style={styles.cardLabel}>REGION SELECTION</Text>
            <Text style={styles.cardValue}>
              {selectionCorners.length === 0
                ? 'Tap map for corner A'
                : selectionCorners.length === 1
                  ? 'Tap map for corner B'
                  : 'Bounding box ready'}
            </Text>
          </View>
          <TouchableOpacity
            style={[om2.clearSelectionButton, selectionCorners.length === 0 && styles.disabledButton]}
            onPress={() => setSelectionCorners([])}
            disabled={selectionCorners.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Clear selected offline map region"
          >
            <Text style={om2.clearSelectionText}>CLEAR BOX</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>REGION SIZE</Text>
        <Text style={styles.helperText}>Used when no bounding box is selected.</Text>
        <View style={styles.pillRow}>
          {([5, 10, 20] as Radius[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={radius === r ? styles.pillActive : styles.pill}
              onPress={() => setRadius(r)}
            >
              <Text style={radius === r ? styles.pillTextActive : styles.pillText}>{r} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>MAP LAYER</Text>
        <View style={styles.pillRow}>
          {LAYER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={layer === opt.key ? styles.pillActive : styles.pill}
              onPress={() => setLayer(opt.key)}
            >
              <Text style={layer === opt.key ? styles.pillTextActive : styles.pillText}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>ZOOM LEVELS</Text>
        <Text style={styles.cardValue}>
          Zoom levels 13-15 · ~{estimatedTiles} tiles · ~{estimatedMB} MB
        </Text>
      </View>

      {!OFFLINE_DOWNLOADS_AVAILABLE ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Web preview supports region planning. Tile files are cached only in the native app.
          </Text>
        </View>
      ) : null}

      {downloading && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DOWNLOADING</Text>
          <Text style={styles.progressText}>
            {progress.downloaded} / {progress.total} tiles
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` as `${number}%` }]} />
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {!downloading && (
        <TouchableOpacity
          style={[styles.downloadButton, !OFFLINE_DOWNLOADS_AVAILABLE && styles.downloadButtonDisabled]}
          onPress={handleDownload}
        >
          <Text style={styles.downloadButtonText}>
            {OFFLINE_DOWNLOADS_AVAILABLE ? '[ DOWNLOAD REGION ]' : '[ NATIVE DOWNLOAD ONLY ]'}
          </Text>
        </TouchableOpacity>
      )}

      {statusMsg !== '' && (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>CACHED TILES</Text>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statsValue}>{stats.tileCount}</Text>
            <Text style={styles.statsLabel}>tiles</Text>
          </View>
          <View>
            <Text style={styles.statsValue}>{statsMB} MB</Text>
            <Text style={styles.statsLabel}>on disk</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
            <Text style={styles.clearButtonText}>[ CLEAR ]</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={om2.routeDataCard}>
        <Text style={om2.routeDataKicker}>[ ROUTE DATA ]</Text>
        <View style={om2.routeDataRow}>
          <View style={om2.routeDataStat}>
            <Text style={om2.routeDataValue}>{selectedBounds ? 'BOX' : `${radius} km`}</Text>
            <Text style={om2.routeDataLabel}>Region</Text>
          </View>
          <View style={om2.routeDataDivider} />
          <View style={om2.routeDataStat}>
            <Text style={om2.routeDataValue}>{layer.toUpperCase()}</Text>
            <Text style={om2.routeDataLabel}>Layer</Text>
          </View>
          <View style={om2.routeDataDivider} />
          <View style={om2.routeDataStat}>
            <Text style={om2.routeDataValue}>{stats.tileCount > 0 ? '✓' : '—'}</Text>
            <Text style={om2.routeDataLabel}>Cached</Text>
          </View>
        </View>
        <TouchableOpacity style={om2.startRuckBtn} onPress={() => router.push('/ruck')}>
          <Text style={om2.startRuckBtnText}>[ START RUCK ]</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080c05' },
  content: { padding: 20, gap: 16, paddingBottom: 50, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { gap: 8 },
  kicker: { color: DS.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: DS.textPrimary, fontSize: 30, fontWeight: '900' },
  subtitle: { color: DS.textSecondary, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: DS.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 16,
    gap: 10,
  },
  cardLabel: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cardValue: { color: DS.textPrimary, fontSize: 15, fontWeight: '700' },
  cardValueMuted: { color: '#6f7d70', fontSize: 15, fontWeight: '700' },
  helperText: { color: DS.textSecondary, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  selectionCopy: { flex: 1, gap: 4 },
  disabledButton: { opacity: 0.45 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: DS.gold,
    borderWidth: 1,
    borderColor: DS.gold,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { color: DS.gold, fontSize: 13, fontWeight: '800' },
  pillTextActive: { color: '#080c05', fontSize: 13, fontWeight: '900' },
  progressText: { color: DS.textSecondary, fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: '#080c05',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DS.border,
  },
  progressFill: { height: '100%', backgroundColor: DS.gold, borderRadius: 999 },
  cancelButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: DS.borderWarn,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: { color: DS.warning, fontSize: 13, fontWeight: '800' },
  downloadButton: {
    backgroundColor: DS.gold,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadButtonDisabled: { opacity: 0.58 },
  downloadButtonText: { color: '#080c05', fontSize: 15, fontWeight: '900' },
  statusCard: {
    backgroundColor: DS.bgCardAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DS.borderHighlight,
    padding: 12,
  },
  statusText: { color: DS.gold, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statsValue: { color: DS.textPrimary, fontSize: 22, fontWeight: '900' },
  statsLabel: { color: DS.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  clearButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: DS.danger,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonText: { color: DS.danger, fontSize: 13, fontWeight: '800' },
});

const om2 = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  mapBadge: { borderWidth: 1, borderColor: 'rgba(94,122,47,0.5)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  mapBadgeText: { color: '#5E7A2F', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  previewCard: { backgroundColor: DS.bgCard, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(181,133,44,0.2)', overflow: 'hidden', gap: 0 },
  previewKicker: { color: DS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  mapWrap: { height: 240, width: '100%' },
  previewSub: { color: DS.textSecondary, fontSize: 11, fontWeight: '700', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  clearSelectionButton: { borderWidth: 1, borderColor: DS.borderHighlight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  clearSelectionText: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  routeDataCard: { backgroundColor: DS.bgCard, borderRadius: 6, padding: 16, borderWidth: 1, borderColor: 'rgba(181,133,44,0.22)', gap: 14 },
  routeDataKicker: { color: DS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  routeDataRow: { flexDirection: 'row', alignItems: 'center' },
  routeDataStat: { flex: 1, alignItems: 'center', gap: 4 },
  routeDataValue: { color: DS.textPrimary, fontSize: 18, fontWeight: '900' },
  routeDataLabel: { color: DS.textSecondary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  routeDataDivider: { width: 1, height: 36, backgroundColor: DS.border },
  startRuckBtn: { backgroundColor: DS.gold, borderRadius: 4, paddingVertical: 14, alignItems: 'center' },
  startRuckBtnText: { color: '#080c05', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
