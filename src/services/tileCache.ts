import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { MapLayerKey } from '../utils/mapTiles';
import { getTileUrl } from '../utils/mapTiles';

const TILE_DIR = (FileSystem.cacheDirectory ?? '') + 'maptiles/';
export const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500 MB
const HAS_NATIVE_FILE_CACHE = Platform.OS !== 'web' && Boolean(FileSystem.cacheDirectory);

export function latLonToTileXY(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const tileCount = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * tileCount);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tileCount,
  );
  return { x, y };
}

export function tilesForBounds(
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  zoom: number,
): { x: number; y: number }[] {
  const topLeft = latLonToTileXY(bounds.maxLat, bounds.minLon, zoom);
  const bottomRight = latLonToTileXY(bounds.minLat, bounds.maxLon, zoom);
  const tileCount = Math.pow(2, zoom);
  const minX = Math.max(0, topLeft.x);
  const maxX = Math.min(tileCount - 1, bottomRight.x);
  const minY = Math.max(0, topLeft.y);
  const maxY = Math.min(tileCount - 1, bottomRight.y);
  const tiles: { x: number; y: number }[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

export function buildBounds(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

export function tilesForRoute(
  routePoints: { latitude: number; longitude: number }[],
  bufferRadiusKm: number,
  zoomLevels: number[]
): { zoom: number; x: number; y: number }[] {
  const uniqueTiles = new Map<string, { zoom: number; x: number; y: number }>();
  
  // Optimization: Downsample the route to only calculate bounds for points 
  // that are spaced out by roughly half the buffer radius.
  const stepDistanceKm = Math.max(0.1, bufferRadiusKm / 2);
  let lastPt: { latitude: number; longitude: number } | null = null;
  
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;

  for (let i = 0; i < routePoints.length; i++) {
    const pt = routePoints[i];
    
    if (lastPt && i !== routePoints.length - 1) {
      const a = 0.5 - c((pt.latitude - lastPt.latitude) * p) / 2 +
                c(lastPt.latitude * p) * c(pt.latitude * p) * (1 - c((pt.longitude - lastPt.longitude) * p)) / 2;
      const distKm = 12742 * Math.asin(Math.sqrt(a));
      if (distKm < stepDistanceKm) continue;
    }

    lastPt = pt;
    const bounds = buildBounds(pt.latitude, pt.longitude, bufferRadiusKm);
    for (const zoom of zoomLevels) {
      for (const tile of tilesForBounds(bounds, zoom)) {
        const key = `${zoom}-${tile.x}-${tile.y}`;
        if (!uniqueTiles.has(key)) {
          uniqueTiles.set(key, { zoom, x: tile.x, y: tile.y });
        }
      }
    }
  }
  return Array.from(uniqueTiles.values());
}

function localPath(layer: MapLayerKey, zoom: number, x: number, y: number): string {
  return `${TILE_DIR}${layer}/${zoom}/${x}/${y}.png`;
}

async function ensureDir(path: string): Promise<void> {
  if (!HAS_NATIVE_FILE_CACHE) return;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export async function getResolvedTileUri(
  layer: MapLayerKey,
  zoom: number,
  x: number,
  y: number,
): Promise<string> {
  if (!HAS_NATIVE_FILE_CACHE) {
    return getTileUrl(layer, zoom, x, y);
  }

  const path = localPath(layer, zoom, x, y);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    return path;
  }
  return getTileUrl(layer, zoom, x, y);
}

export async function downloadTileList(
  allTiles: { zoom: number; x: number; y: number }[],
  layer: MapLayerKey,
  onProgress: (downloaded: number, total: number) => void,
  signal?: AbortSignal,
  isPaused?: () => boolean,
): Promise<{ downloaded: number; skipped: number; failed: number }> {
  if (!HAS_NATIVE_FILE_CACHE) {
    onProgress(allTiles.length, allTiles.length);
    return { downloaded: 0, skipped: 0, failed: allTiles.length };
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const total = allTiles.length;

  for (const { zoom, x, y } of allTiles) {
    if (signal?.aborted) break;

    while (isPaused && isPaused()) {
      if (signal?.aborted) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (signal?.aborted) break;

    const path = localPath(layer, zoom, x, y);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      skipped++;
      onProgress(downloaded + skipped, total);
      continue;
    }
    try {
      await ensureDir(`${TILE_DIR}${layer}/${zoom}/${x}`);
      const url = getTileUrl(layer, zoom, x, y);
      await FileSystem.downloadAsync(url, path);
      downloaded++;
    } catch {
      failed++;
    }
    onProgress(downloaded + skipped, total);
  }

  return { downloaded, skipped, failed };
}

export async function downloadRegion(
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  zoomLevels: number[],
  layer: MapLayerKey,
  onProgress: (downloaded: number, total: number) => void,
  signal?: AbortSignal,
  isPaused?: () => boolean,
): Promise<{ downloaded: number; skipped: number; failed: number }> {
  const allTiles: { zoom: number; x: number; y: number }[] = [];
  for (const zoom of zoomLevels) {
    for (const { x, y } of tilesForBounds(bounds, zoom)) {
      allTiles.push({ zoom, x, y });
    }
  }
  return downloadTileList(allTiles, layer, onProgress, signal, isPaused);
}

export async function downloadRoute(
  routePoints: { latitude: number; longitude: number }[],
  bufferRadiusKm: number,
  zoomLevels: number[],
  layer: MapLayerKey,
  onProgress: (downloaded: number, total: number) => void,
  signal?: AbortSignal,
  isPaused?: () => boolean,
): Promise<{ downloaded: number; skipped: number; failed: number }> {
  const allTiles = tilesForRoute(routePoints, bufferRadiusKm, zoomLevels);
  return downloadTileList(allTiles, layer, onProgress, signal, isPaused);
}

export async function getCacheStats(): Promise<{ tileCount: number; totalBytes: number }> {
  if (!HAS_NATIVE_FILE_CACHE) return { tileCount: 0, totalBytes: 0 };

  const rootInfo = await FileSystem.getInfoAsync(TILE_DIR);
  if (!rootInfo.exists) return { tileCount: 0, totalBytes: 0 };

  let tileCount = 0;
  let totalBytes = 0;
  const queue: string[] = [TILE_DIR];

  while (queue.length > 0) {
    const dir = queue.pop()!;
    let entries: string[];
    try {
      entries = await FileSystem.readDirectoryAsync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = dir.endsWith('/') ? dir + entry : dir + '/' + entry;
      if (entry.endsWith('.png')) {
        tileCount++;
        try {
          const info = await FileSystem.getInfoAsync(fullPath);
          const size = (info as { size?: unknown }).size;
          if (info.exists && typeof size === 'number') {
            totalBytes += size;
          }
        } catch {
          // skip unreadable file info
        }
      } else {
        queue.push(fullPath);
      }
    }
  }

  return { tileCount, totalBytes };
}

export async function clearTileCache(): Promise<void> {
  if (!HAS_NATIVE_FILE_CACHE) return;
  await FileSystem.deleteAsync(TILE_DIR, { idempotent: true });
}

export async function pruneCacheToSize(targetBytes: number): Promise<void> {
  if (!HAS_NATIVE_FILE_CACHE) return;

  const rootInfo = await FileSystem.getInfoAsync(TILE_DIR);
  if (!rootInfo.exists) return;

  const files: { path: string; size: number; modificationTime: number }[] = [];
  let totalBytes = 0;
  const queue: string[] = [TILE_DIR];
  const directories: string[] = [];

  while (queue.length > 0) {
    const dir = queue.pop()!;
    let entries: string[];
    try {
      entries = await FileSystem.readDirectoryAsync(dir);
    } catch {
      continue;
    }

    if (dir !== TILE_DIR) directories.push(dir);

    for (const entry of entries) {
      const fullPath = dir.endsWith('/') ? dir + entry : dir + '/' + entry;
      if (entry.endsWith('.png')) {
        try {
          const info = await FileSystem.getInfoAsync(fullPath);
          const size = (info as { size?: unknown }).size;
          const modificationTime = (info as { modificationTime?: unknown }).modificationTime;
          if (info.exists && typeof size === 'number' && typeof modificationTime === 'number') {
            totalBytes += size;
            files.push({ path: fullPath, size, modificationTime });
          }
        } catch {
          // skip unreadable file info
        }
      } else {
        queue.push(fullPath);
      }
    }
  }

  if (totalBytes <= targetBytes) return;

  // Sort files by modification time ascending (oldest first)
  files.sort((a, b) => a.modificationTime - b.modificationTime);

  let currentBytes = totalBytes;
  for (const file of files) {
    if (currentBytes <= targetBytes) break;
    try {
      await FileSystem.deleteAsync(file.path, { idempotent: true });
      currentBytes -= file.size;
    } catch {
      // skip failed deletions
    }
  }

  // Cleanup empty directories (bottom-up traversal)
  directories.sort((a, b) => b.length - a.length);
  for (const dir of directories) {
    try {
      const dirEntries = await FileSystem.readDirectoryAsync(dir);
      if (dirEntries.length === 0) {
        await FileSystem.deleteAsync(dir, { idempotent: true });
      }
    } catch {
      // skip if directory was already deleted or inaccessible
    }
  }
}

export async function enforceCacheLimit(): Promise<boolean> {
  const stats = await getCacheStats();
  if (stats.totalBytes > MAX_CACHE_BYTES) {
    // Prune down to 80% of max capacity (400MB) to give the cache breathing room
    await pruneCacheToSize(MAX_CACHE_BYTES * 0.8);
    return true;
  }
  return false;
}
