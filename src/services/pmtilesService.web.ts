import * as FileSystem from 'expo-file-system/legacy';

export const PMTILES_PATH = FileSystem.documentDirectory + 'offline_region.pmtiles';

export function initPMTilesProtocol() {
  // PMTiles protocol registration is native-only. Web map rendering uses Leaflet.
}
