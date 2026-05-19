import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PMTILES_PATH } from '../services/pmtilesService';
import {
  buildBounds,
  clearTileCache,
  downloadRegion,
  downloadRoute,
  enforceCacheLimit,
  getCacheStats,
  MAX_CACHE_BYTES,
  tilesForBounds,
  tilesForRoute
} from '../services/tileCache';
import { parseGpxCoordinates } from '../utils/fieldMapping';
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

function estimateTileCount(center: Position, radiusKm: number): number {
  const bounds = buildBounds(center.latitude, center.longitude, radiusKm);
  return ZOOM_LEVELS.reduce((sum, z) => sum + tilesForBounds(bounds, z).length, 0);
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
  const [paused, setPaused] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [eta, setEta] = useState('');
  const mountedRef = useRef(true);
  const isPausedRef = useRef(false);
  const speedStateRef = useRef({ lastTime: 0, lastDownloaded: 0, speedEma: 0 });

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

    try {
      const info = await FileSystem.getInfoAsync(PMTILES_PATH);
      if (info.exists && !info.isDirectory) {
        setStats({ tileCount: statsResult.tileCount, totalBytes: statsResult.totalBytes + (info.size ?? 0) });
      } else {
        setStats(statsResult);
      }
    } catch {
      setStats(statsResult);
    }

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

  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setPaused(isPausedRef.current);
    if (isPausedRef.current) {
      setStatusMsg('Download paused.');
    } else {
      setStatusMsg('');
      // Reset the time tracker so pause duration is not counted as slow speed.
      speedStateRef.current.lastTime = Date.now();
    }
  }, []);

  const handleProgress = useCallback((dl: number, total: number) => {
    if (!mountedRef.current) return;
    setProgress({ downloaded: dl, total });

    if (isPausedRef.current) return;

    const now = Date.now();
    const state = speedStateRef.current;
    const deltaMs = now - state.lastTime;

    // Update our speed estimate roughly every second
    if (deltaMs >= 1000) {
      const deltaTiles = dl - state.lastDownloaded;
      const currentSpeed = deltaTiles / deltaMs; // tiles per millisecond

      // Exponential moving average smooths out network spikes.
      state.speedEma = state.speedEma === 0 ? currentSpeed : (currentSpeed * 0.3) + (state.speedEma * 0.7);
      state.lastTime = now;
      state.lastDownloaded = dl;

      if (state.speedEma > 0) {
        const remainingMs = (total - dl) / state.speedEma;
        if (remainingMs > 60000) setEta(`~${Math.ceil(remainingMs / 60000)} min left`);
        else setEta(`~${Math.ceil(remainingMs / 1000)} sec left`);
      }
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (wifiOnly) {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.type !== Network.NetworkStateType.WIFI) {
        Alert.alert(
          'Wi-Fi Required',
          'You have selected to download only over Wi-Fi, but you are not currently connected to a Wi-Fi network.'
        );
        return;
      }
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
    isPausedRef.current = false;
    setPaused(false);
    speedStateRef.current = { lastTime: Date.now(), lastDownloaded: 0, speedEma: 0 };
    setEta('Calculating time...');
    await activateKeepAwakeAsync();

    try {
      const bounds = buildBounds(center.latitude, center.longitude, radius);
      const dlResult = await downloadRegion(
        bounds,
        ZOOM_LEVELS,
        layer,
        handleProgress,
        ac.signal,
        () => isPausedRef.current
      );

      const wasCleared = await enforceCacheLimit();
      const newStats = await getCacheStats();
      if (!mountedRef.current) return;
      setStats(newStats);

      if (ac.signal.aborted) {
        setStatusMsg('Download cancelled.');
      } else if (wasCleared) {
        setStatusMsg('Download exceeded 500MB limit. Oldest tiles were automatically removed.');
      } else {
        setStatusMsg(`Download complete. ${dlResult.downloaded} tiles saved, ${dlResult.skipped} already cached, ${dlResult.failed} failed.`);
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Offline Region Ready',
            body: `Downloaded ${dlResult.downloaded} new tiles successfully.`,
            sound: true,
          },
          trigger: null,
        });
      }
    } catch {
      if (mountedRef.current) setStatusMsg('Download failed. Check your connection.');
    } finally {
      deactivateKeepAwake();
      if (mountedRef.current) {
        setDownloading(false);
        setAbortController(null);
      }
    }
  }, [center.latitude, center.longitude, estimatedTiles, handleProgress, layer, radius, stats.totalBytes, wifiOnly]);

  const handleDownloadGpx = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      const fileUri = result.assets[0].uri;
      const gpxString = await FileSystem.readAsStringAsync(fileUri);
      const coordinates = parseGpxCoordinates(gpxString);

      if (coordinates.length === 0) {
        Alert.alert('Invalid GPX', 'No coordinates found in the selected file.');
        return;
      }

      if (wifiOnly) {
        const networkState = await Network.getNetworkStateAsync();
        if (networkState.type !== Network.NetworkStateType.WIFI) {
          Alert.alert(
            'Wi-Fi Required',
            'You have selected to download only over Wi-Fi, but you are not currently connected to a Wi-Fi network.'
          );
          return;
        }
      }

      const routeTiles = tilesForRoute(coordinates, 1.0, ZOOM_LEVELS);
      const estimatedBytes = routeTiles.length * BYTES_PER_TILE_ESTIMATE;

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
      setStatusMsg('Starting GPX route download...');
      setProgress({ downloaded: 0, total: routeTiles.length });
      isPausedRef.current = false;
      setPaused(false);
      speedStateRef.current = { lastTime: Date.now(), lastDownloaded: 0, speedEma: 0 };
      setEta('Calculating time...');
      await activateKeepAwakeAsync();

      const dlResult = await downloadRoute(
        coordinates,
        1.0,
        ZOOM_LEVELS,
        layer,
        handleProgress,
        ac.signal,
        () => isPausedRef.current
      );

      const wasCleared = await enforceCacheLimit();
      const newStats = await getCacheStats();
      if (!mountedRef.current) return;
      setStats(newStats);

      if (ac.signal.aborted) {
        setStatusMsg('Download cancelled.');
      } else if (wasCleared) {
        setStatusMsg('Download exceeded 500MB limit. Oldest tiles were automatically removed.');
      } else {
        setStatusMsg(`Download complete. ${dlResult.downloaded} tiles saved, ${dlResult.skipped} already cached, ${dlResult.failed} failed.`);
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'GPX Route Maps Ready',
            body: `Downloaded ${dlResult.downloaded} new tiles successfully.`,
            sound: true,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('GPX Download failed:', error);
      if (mountedRef.current) setStatusMsg('Download failed. Check your connection or file.');
    } finally {
      deactivateKeepAwake();
      if (mountedRef.current) {
        setDownloading(false);
        setAbortController(null);
      }
    }
  }, [handleProgress, layer, stats.totalBytes, wifiOnly]);

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
            try {
              await clearTileCache();
              await FileSystem.deleteAsync(PMTILES_PATH, { idempotent: true });
              const newStats = await getCacheStats();
              if (mountedRef.current) {
                setStats(newStats);
                setStatusMsg('Cache cleared.');
              }
            } catch (err) {
              console.error(err);
            }
          },
        },
      ],
    );
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/ruck');
  }, [router]);

  const statsMB = (stats.totalBytes / (1024 * 1024)).toFixed(1);
  const progressPct = progress.total > 0 ? progress.downloaded / progress.total : 0;

  const maxMB = (MAX_CACHE_BYTES / (1024 * 1024)).toFixed(0);
  const capacityPct = Math.min(stats.totalBytes / MAX_CACHE_BYTES, 1);
  let capacityColor = '#91e6a3'; // safe (green)
  if (capacityPct > 0.9) capacityColor = '#ff6b6b'; // danger (red)
  else if (capacityPct > 0.75) capacityColor = '#ffb86b'; // warning (amber)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
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
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>DOWNLOAD OVER WI-FI ONLY</Text>
          <Switch
            value={wifiOnly}
            onValueChange={setWifiOnly}
            trackColor={{ false: '#203529', true: '#2f6b3c' }}
            thumbColor={wifiOnly ? '#91e6a3' : '#4a7a5a'}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>ZOOM LEVELS</Text>
        <Text style={styles.cardValue}>
          Zoom levels 13-15 - ~{estimatedTiles} tiles - ~{estimatedMB} MB
        </Text>
      </View>

      {downloading && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{paused ? 'PAUSED' : 'DOWNLOADING'}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.progressText}>
              {progress.downloaded} / {progress.total} tiles ({Math.round(progressPct * 100)}%)
            </Text>
            <Text style={styles.etaText}>{paused ? 'Paused' : eta}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` as `${number}%` }]} />
          </View>
          <View style={styles.downloadActionRow}>
            <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
              <Text style={styles.pauseButtonText}>{paused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!downloading && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Text style={styles.downloadButtonText}>Download Region</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadGpxButton} onPress={handleDownloadGpx}>
            <Text style={styles.downloadGpxButtonText}>Download from GPX</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.statsValue}>{statsMB} <Text style={styles.statsValueMax}>/ {maxMB} MB</Text></Text>
            <Text style={styles.statsLabel}>storage used</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.capacityTrack}>
          <View style={[styles.capacityFill, { width: `${capacityPct * 100}%` as `${number}%`, backgroundColor: capacityColor }]} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110c' },
  content: { padding: 20, gap: 16, paddingBottom: 50, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { gap: 8 },
  backButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#35523e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: { color: '#c8f7d0', fontSize: 13, fontWeight: '900' },
  kicker: { color: '#8fbf8f', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  title: { color: '#f2f5ef', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#aeb8aa', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: '#0d1812',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#203529',
    padding: 16,
    gap: 10,
  },
  cardLabel: { color: '#91e6a3', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cardValue: { color: '#f2f5ef', fontSize: 15, fontWeight: '700' },
  cardValueMuted: { color: '#6f7d70', fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: '#2f6b3c',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: '#91e6a3',
    borderWidth: 1,
    borderColor: '#91e6a3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { color: '#91e6a3', fontSize: 13, fontWeight: '800' },
  pillTextActive: { color: '#07110c', fontSize: 13, fontWeight: '900' },
  progressText: { color: '#aeb8aa', fontSize: 13, fontWeight: '700' },
  etaText: { color: '#ffb86b', fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 8,
    backgroundColor: '#07110c',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26382c',
  },
  progressFill: { height: '100%', backgroundColor: '#91e6a3', borderRadius: 999 },
  downloadActionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pauseButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ffb86b',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pauseButtonText: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#7a4a1f',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#ffb86b', fontSize: 13, fontWeight: '900' },
  actionRow: { gap: 12 },
  downloadButton: {
    backgroundColor: '#91e6a3',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadButtonText: { color: '#07110c', fontSize: 15, fontWeight: '900' },
  downloadGpxButton: {
    backgroundColor: '#0d1812',
    borderWidth: 1,
    borderColor: '#91e6a3',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadGpxButtonText: { color: '#91e6a3', fontSize: 15, fontWeight: '900' },
  statusCard: {
    backgroundColor: '#102d1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f6b3c',
    padding: 12,
  },
  statusText: { color: '#91e6a3', fontSize: 13, fontWeight: '700', lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statsValue: { color: '#f2f5ef', fontSize: 22, fontWeight: '900' },
  statsValueMax: { color: '#6f7d70', fontSize: 16, fontWeight: '800' },
  statsLabel: { color: '#8fbf8f', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  clearButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonText: { color: '#ff6b6b', fontSize: 13, fontWeight: '800' },
  capacityTrack: {
    height: 8,
    backgroundColor: '#07110c',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26382c',
    marginTop: 6,
  },
  capacityFill: { height: '100%', borderRadius: 999 },
});

