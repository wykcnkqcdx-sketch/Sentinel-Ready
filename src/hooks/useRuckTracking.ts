import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TrackPoint } from '@/src/types/map';
import { MapLayerKey } from '@/src/utils/mapTiles';
import { distanceBetween } from '@/src/utils/mapUtils';
import { evaluateRoutePoint, decimateRouteForMap } from '@/src/utils/routeQuality';

type TrackingState = 'idle' | 'recording' | 'paused' | 'finished';

interface SessionResult {
  distanceKm: number;
  elapsedSeconds: number;
  routePoints: TrackPoint[];
}

export interface RuckTrackingState {
  trackingState: TrackingState;
  routePoints: TrackPoint[];
  distanceKm: number;
  elapsedSeconds: number;
  currentPosition: TrackPoint | null;
  gpsQualityWarning: string | null;
  activeLayer: MapLayerKey;
  sessionResult: SessionResult | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  setLayer: (key: MapLayerKey) => void;
  resetSession: () => void;
}

const INITIAL_STATE = {
  trackingState: 'idle' as TrackingState,
  routePoints: [] as TrackPoint[],
  distanceKm: 0,
  elapsedSeconds: 0,
  currentPosition: null as TrackPoint | null,
  gpsQualityWarning: null as string | null,
  activeLayer: 'topo' as MapLayerKey,
  sessionResult: null as SessionResult | null,
};

export function useRuckTracking(): RuckTrackingState {
  const [trackingState, setTrackingState] = useState<TrackingState>(INITIAL_STATE.trackingState);
  const [routePoints, setRoutePoints] = useState<TrackPoint[]>(INITIAL_STATE.routePoints);
  const [distanceKm, setDistanceKm] = useState(INITIAL_STATE.distanceKm);
  const [elapsedSeconds, setElapsedSeconds] = useState(INITIAL_STATE.elapsedSeconds);
  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(INITIAL_STATE.currentPosition);
  const [gpsQualityWarning, setGpsQualityWarning] = useState<string | null>(INITIAL_STATE.gpsQualityWarning);
  const [activeLayer, setActiveLayer] = useState<MapLayerKey>(INITIAL_STATE.activeLayer);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(INITIAL_STATE.sessionResult);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAcceptedRef = useRef<TrackPoint | undefined>(undefined);
  const routePointsRef = useRef<TrackPoint[]>([]);
  const distanceRef = useRef(0);
  const trackingStateRef = useRef<TrackingState>('idle');

  useEffect(() => {
    return () => {
      locationSubRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setGpsQualityWarning('Location permission denied');
      return;
    }

    lastAcceptedRef.current = undefined;
    routePointsRef.current = [];
    distanceRef.current = 0;

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 2,
      },
      (location) => {
        if (trackingStateRef.current !== 'recording') return;

        const point: TrackPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        };

        setCurrentPosition(point);

        const result = evaluateRoutePoint(lastAcceptedRef.current, point);
        if (result.accepted) {
          distanceRef.current += result.distanceKm;
          lastAcceptedRef.current = point;
          routePointsRef.current = [...routePointsRef.current, point];
          setRoutePoints(routePointsRef.current);
          setDistanceKm(distanceRef.current);
          setGpsQualityWarning(null);
        } else {
          setGpsQualityWarning(result.reason);
        }
      },
    );

    locationSubRef.current = sub;
    trackingStateRef.current = 'recording';
    setTrackingState('recording');
    startTimer();
  }, [startTimer]);

  const stopRecording = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    stopTimer();

    const decimated = decimateRouteForMap(routePointsRef.current);
    setSessionResult({
      distanceKm: distanceRef.current,
      elapsedSeconds: 0,
      routePoints: decimated,
    });
    setRoutePoints(decimated);
    trackingStateRef.current = 'finished';
    setTrackingState('finished');
  }, [stopTimer]);

  const pauseRecording = useCallback(() => {
    stopTimer();
    trackingStateRef.current = 'paused';
    setTrackingState('paused');
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    trackingStateRef.current = 'recording';
    setTrackingState('recording');
    startTimer();
  }, [startTimer]);

  const setLayer = useCallback((key: MapLayerKey) => {
    setActiveLayer(key);
  }, []);

  const resetSession = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    stopTimer();
    lastAcceptedRef.current = undefined;
    routePointsRef.current = [];
    distanceRef.current = 0;
    trackingStateRef.current = 'idle';
    setTrackingState(INITIAL_STATE.trackingState);
    setRoutePoints(INITIAL_STATE.routePoints);
    setDistanceKm(INITIAL_STATE.distanceKm);
    setElapsedSeconds(INITIAL_STATE.elapsedSeconds);
    setCurrentPosition(INITIAL_STATE.currentPosition);
    setGpsQualityWarning(INITIAL_STATE.gpsQualityWarning);
    setSessionResult(INITIAL_STATE.sessionResult);
  }, [stopTimer]);

  return {
    trackingState,
    routePoints,
    distanceKm,
    elapsedSeconds,
    currentPosition,
    gpsQualityWarning,
    activeLayer,
    sessionResult,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    setLayer,
    resetSession,
  };
}
