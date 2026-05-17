import MapboxGL from '@maplibre/maplibre-react-native';
import { PMTiles } from 'pmtiles';
import * as FileSystem from 'expo-file-system';

export const PMTILES_PATH = FileSystem.documentDirectory + 'offline_region.pmtiles';
let pmtilesInstance: PMTiles | null = null;

export function initPMTilesProtocol() {
  // Initialize the local file reader
  pmtilesInstance = new PMTiles('file://' + PMTILES_PATH);

  // Register the protocol with MapLibre's native HTTP client
  MapboxGL.addCustomLoadHttpClient(async (request) => {
    if (request.url.startsWith('pmtiles://')) {
      const match = request.url.match(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
      if (match && pmtilesInstance) {
        const [_, name, z, x, y] = match;
        try {
          const tile = await pmtilesInstance.getZxy(+z, +x, +y);
          if (tile) {
            return { data: tile.data };
          }
        } catch (e) {
          // Tile doesn't exist in the local PMTiles archive
        }
      }
    }
    return { data: undefined }; // Fallback to standard network request
  });
}