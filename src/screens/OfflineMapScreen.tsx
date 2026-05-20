import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  clearTileCache,
  downloadRegion,
  enforceCacheLimit,
  getCacheStats,
  MAX_CACHE_BYTES,
  tilesForBounds,
} from '../services/tileCache';
import type { MapLayerKey } from '../utils/mapTiles';

const LAST_POSITION_KEY = 'sentinel_last_position';
const DUBLIN = { latitude: 53.3498, longitude: -6.2603 };
const ZOOM_LEVELS = [13, 14, 15];
const BYTES_PER_TILE_ESTIMATE = 15 * 1024; // 15 KB

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

function buildBounds(center: Position, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLon: center.longitude - lonDelta,
    maxLon: center.longitude + lonDelta,
  };
}

function estimateTileCount(center: Position, radiusKm: number): number {
  const bounds = buildBounds(center, radiusKm);
  return ZOOM_LEVELS.reduce((sum, z) => sum + tilesForBounds(bounds, z).length, 0);
}

export default function OfflineMapScreen() {
  const [radius, setRadius] = useState<Radius>(10);
  const [layer, setLayer] = useState<MapLayerKey>('street');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [stats, setStats] = useState({ tileCount: 0, totalBytes: 0 });
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
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
        setPosition(JSON.parse(positionResult));
      } catch {
        setPosition(DUBLIN);
      }
    } else {
      setPosition(DUBLIN);
    }
  }

  const center = position ?? DUBLIN;
  const estimatedTiles = useMemo(() => estimateTileCount(center, radius), [center, radius]);
  const estimatedMB = ((estimatedTiles * BYTES_PER_TILE_ESTIMATE) / (1024 * 1024)).toFixed(1);

  const handleDownload = useCallback(async () => {
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

    const bounds = buildBounds(center, radius);

    try {
      const result = await downloadRegion(
        bounds,
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
  }, [center, radius, layer, stats.totalBytes, estimatedTiles]);

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
        <Text style={styles.kicker}>OFFLINE MAPS</Text>
        <Text style={styles.title}>Cache Tiles</Text>
        <Text style={styles.subtitle}>Download map tiles for use without signal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>LOCATION</Text>
        {position ? (
          <Text style={styles.cardValue}>
            {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.cardValueMuted}>Location unavailable</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>REGION SIZE</Text>
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
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Text style={styles.downloadButtonText}>Download Region</Text>
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
            <Text style={styles.clearButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000D1A' },
  content: { padding: 20, gap: 16, paddingBottom: 50, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { gap: 8 },
  kicker: { color: '#8FAEC8', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#8FAEC8', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: '#00253D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 10,
  },
  cardLabel: { color: '#B5852C', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cardValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cardValueMuted: { color: '#6f7d70', fontSize: 15, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: '#B5852C',
    borderWidth: 1,
    borderColor: '#B5852C',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { color: '#B5852C', fontSize: 13, fontWeight: '800' },
  pillTextActive: { color: '#000D1A', fontSize: 13, fontWeight: '900' },
  progressText: { color: '#8FAEC8', fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: '#000D1A',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: { height: '100%', backgroundColor: '#B5852C', borderRadius: 999 },
  cancelButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(212,160,26,0.3)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: { color: '#D4A01A', fontSize: 13, fontWeight: '800' },
  downloadButton: {
    backgroundColor: '#B5852C',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadButtonText: { color: '#000D1A', fontSize: 15, fontWeight: '900' },
  statusCard: {
    backgroundColor: '#003050',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(181,133,44,0.3)',
    padding: 12,
  },
  statusText: { color: '#B5852C', fontSize: 13, fontWeight: '700', lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statsValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  statsLabel: { color: '#8FAEC8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  clearButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: '#CC2A2A',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonText: { color: '#CC2A2A', fontSize: 13, fontWeight: '800' },
});
