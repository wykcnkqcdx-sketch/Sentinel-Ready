import { RuckSplit, TrackPoint } from '@/src/types/map';
import { MapLayerKey } from '@/src/utils/mapTiles';
import { decimateRouteForMap, evaluateRoutePoint, WEAK_ACCURACY_METERS } from '@/src/utils/routeQuality';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

type TrackingState = 'idle' | 'recording' | 'paused' | 'finished';
type LocationSubscription = { remove: () => void };

interface SessionResult {
  distanceKm: number;
  elapsedSeconds: number;
  routePoints: TrackPoint[];
  splits: RuckSplit[];
  rejectedPointCount: number;
  averageAccuracyMeters: number | null;
  routeConfidence: 'High' | 'Medium' | 'Low';
}

export interface RuckTrackingState {
  trackingState: TrackingState;
  routePoints: TrackPoint[];
  distanceKm: number;
  elapsedSeconds: number;
  currentPosition: TrackPoint | null;
  currentHeading: number | null;
  gpsQualityWarning: string | null;
  activeLayer: MapLayerKey;
  sessionResult: SessionResult | null;
  splits: RuckSplit[];
  rejectedPointCount: number;
  averageAccuracyMeters: number | null;
  routeConfidence: 'High' | 'Medium' | 'Low';
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
  splits: [] as RuckSplit[],
  rejectedPointCount: 0,
  averageAccuracyMeters: null as number | null,
  routeConfidence: 'High' as 'High' | 'Medium' | 'Low',
};

function getRouteConfidence(
  rejectedPointCount: number,
  acceptedPointCount: number,
  averageAccuracyMeters: number | null,
): 'High' | 'Medium' | 'Low' {
  if (acceptedPointCount < 2) return 'Low';
  if (rejectedPointCount >= 8 || (averageAccuracyMeters != null && averageAccuracyMeters > WEAK_ACCURACY_METERS)) {
    return 'Low';
  }
  if (rejectedPointCount >= 3 || (averageAccuracyMeters != null && averageAccuracyMeters > 12)) {
    return 'Medium';
  }
  return 'High';
}

export function useRuckTracking(): RuckTrackingState {
  const [trackingState, setTrackingState] = useState<TrackingState>(INITIAL_STATE.trackingState);
  const [routePoints, setRoutePoints] = useState<TrackPoint[]>(INITIAL_STATE.routePoints);
  const [distanceKm, setDistanceKm] = useState(INITIAL_STATE.distanceKm);
  const [elapsedSeconds, setElapsedSeconds] = useState(INITIAL_STATE.elapsedSeconds);
  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(INITIAL_STATE.currentPosition);
  const [gpsQualityWarning, setGpsQualityWarning] = useState<string | null>(INITIAL_STATE.gpsQualityWarning);
  const [activeLayer, setActiveLayer] = useState<MapLayerKey>(INITIAL_STATE.activeLayer);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(INITIAL_STATE.sessionResult);
  const [splits, setSplits] = useState<RuckSplit[]>(INITIAL_STATE.splits);
  const [rejectedPointCount, setRejectedPointCount] = useState(INITIAL_STATE.rejectedPointCount);
  const [averageAccuracyMeters, setAverageAccuracyMeters] = useState<number | null>(INITIAL_STATE.averageAccuracyMeters);
  const [routeConfidence, setRouteConfidence] = useState<'High' | 'Medium' | 'Low'>(INITIAL_STATE.routeConfidence);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);

  const locationSubRef = useRef<LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAcceptedRef = useRef<TrackPoint | undefined>(undefined);
  const routePointsRef = useRef<TrackPoint[]>([]);
  const distanceRef = useRef(0);
  const elapsedRef = useRef(0);
  const splitsRef = useRef<RuckSplit[]>([]);
  const nextSplitKmRef = useRef(1);
  const lastSplitElapsedRef = useRef(0);
  const rejectedPointCountRef = useRef(0);
  const acceptedPointCountRef = useRef(0);
  const accuracyTotalRef = useRef(0);
  const accuracyCountRef = useRef(0);
  const trackingStateRef = useRef<TrackingState>('idle');
  const activeSegmentStartRef = useRef(0);
  const accumulatedTimeRef = useRef(0);

  const resetLiveSession = useCallback(() => {
    lastAcceptedRef.current = undefined;
    routePointsRef.current = [];
    distanceRef.current = 0;
    elapsedRef.current = 0;
    accumulatedTimeRef.current = 0;
    activeSegmentStartRef.current = 0;
    splitsRef.current = [];
    nextSplitKmRef.current = 1;
    lastSplitElapsedRef.current = 0;
    rejectedPointCountRef.current = 0;
    acceptedPointCountRef.current = 0;
    accuracyTotalRef.current = 0;
    accuracyCountRef.current = 0;
    setRoutePoints([]);
    setDistanceKm(0);
    setElapsedSeconds(0);
    setCurrentPosition(null);
    setSessionResult(null);
    setSplits([]);
    setRejectedPointCount(0);
    setAverageAccuracyMeters(null);
    setRouteConfidence('High');
  }, []);

  const removeLocationSubscription = useCallback(() => {
    if (!locationSubRef.current) return;

    const subscription = locationSubRef.current;
    locationSubRef.current = null;

    try {
      subscription.remove();
    } catch (error) {
      console.warn('Ruck tracking: failed to remove location subscription', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      removeLocationSubscription();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [removeLocationSubscription]);

  const handleLocationUpdate = useCallback((location: Location.LocationObject) => {
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
      acceptedPointCountRef.current += 1;

      if (point.accuracy != null) {
        accuracyTotalRef.current += point.accuracy;
        accuracyCountRef.current += 1;
        setAverageAccuracyMeters(accuracyTotalRef.current / accuracyCountRef.current);
      }

      while (distanceRef.current >= nextSplitKmRef.current) {
        const elapsedSecondsForSplit = elapsedRef.current;
        const split: RuckSplit = {
          km: nextSplitKmRef.current,
          elapsedSeconds: elapsedSecondsForSplit,
          splitSeconds: elapsedSecondsForSplit - lastSplitElapsedRef.current,
        };
        splitsRef.current = [...splitsRef.current, split];
        lastSplitElapsedRef.current = elapsedSecondsForSplit;
        nextSplitKmRef.current += 1;
        setSplits(splitsRef.current);
      }

      setRoutePoints(routePointsRef.current);
      setDistanceKm(distanceRef.current);
      setGpsQualityWarning(null);
    } else {
      rejectedPointCountRef.current += 1;
      setRejectedPointCount(rejectedPointCountRef.current);
      setGpsQualityWarning(result.reason);
    }
  }, []);

  const watchPosition = useCallback(async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position.coords.heading != null && Number.isFinite(position.coords.heading)) {
            setCurrentHeading(position.coords.heading);
          }
          handleLocationUpdate({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          });
        },
        () => setGpsQualityWarning('Location updates unavailable'),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        },
      );

      return {
        remove: () => navigator.geolocation.clearWatch(watchId),
      };
    }

    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 2,
      },
      (location) => {
        if (location.coords.heading != null && Number.isFinite(location.coords.heading)) {
          setCurrentHeading(location.coords.heading);
        }
        handleLocationUpdate(location);
      },
    );
  }, [handleLocationUpdate]);


  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    activeSegmentStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const segmentElapsed = Math.floor((now - activeSegmentStartRef.current) / 1000);
      const next = accumulatedTimeRef.current + segmentElapsed;
      elapsedRef.current = next;
      setElapsedSeconds(next);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      const now = Date.now();
      const segmentElapsed = Math.floor((now - activeSegmentStartRef.current) / 1000);
      accumulatedTimeRef.current += segmentElapsed;
      elapsedRef.current = accumulatedTimeRef.current;
      setElapsedSeconds(accumulatedTimeRef.current);
    }
  }, []);

  const startRecording = useCallback(async () => {
    // On native, request permission upfront and bail if denied.
    // On web the browser handles permission through watchPosition itself.
    if (Platform.OS !== 'web') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsQualityWarning('Location permission denied');
          Alert.alert('Location Required', 'Allow location access to start GPS ruck tracking.');
          return;
        }
      } catch (error) {
        console.warn('Ruck tracking: failed to request location permission', error);
      }
    }

    removeLocationSubscription();
    resetLiveSession();

    trackingStateRef.current = 'recording';
    setTrackingState('recording');
    startTimer();

    try {
      const sub = await watchPosition();
      locationSubRef.current = sub;
      setGpsQualityWarning(null);
    } catch (error) {
      console.warn('Ruck tracking: failed to start location updates', error);
      setGpsQualityWarning('Location updates unavailable');
    }
  }, [removeLocationSubscription, resetLiveSession, startTimer, watchPosition]);

  const stopRecording = useCallback(() => {
    removeLocationSubscription();
    stopTimer();

    const decimated = decimateRouteForMap(routePointsRef.current);
    const averageAccuracy =
      accuracyCountRef.current > 0 ? accuracyTotalRef.current / accuracyCountRef.current : null;
    const confidence = getRouteConfidence(
      rejectedPointCountRef.current,
      acceptedPointCountRef.current,
      averageAccuracy,
    );
    setSessionResult({
      distanceKm: distanceRef.current,
      elapsedSeconds: elapsedRef.current,
      routePoints: decimated,
      splits: splitsRef.current,
      rejectedPointCount: rejectedPointCountRef.current,
      averageAccuracyMeters: averageAccuracy,
      routeConfidence: confidence,
    });
    setRoutePoints(decimated);
    setAverageAccuracyMeters(averageAccuracy);
    setRouteConfidence(confidence);
    trackingStateRef.current = 'finished';
    setTrackingState('finished');
  }, [removeLocationSubscription, stopTimer]);

  const pauseRecording = useCallback(() => {
    stopTimer();
    lastAcceptedRef.current = undefined;
    trackingStateRef.current = 'paused';
    setTrackingState('paused');
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    lastAcceptedRef.current = undefined;
    trackingStateRef.current = 'recording';
    setTrackingState('recording');
    startTimer();
  }, [startTimer]);

  const setLayer = useCallback((key: MapLayerKey) => {
    setActiveLayer(key);
  }, []);

  const resetSession = useCallback(() => {
    removeLocationSubscription();
    stopTimer();
    lastAcceptedRef.current = undefined;
    routePointsRef.current = [];
    distanceRef.current = 0;
    elapsedRef.current = 0;
    accumulatedTimeRef.current = 0;
    activeSegmentStartRef.current = 0;
    splitsRef.current = [];
    nextSplitKmRef.current = 1;
    lastSplitElapsedRef.current = 0;
    rejectedPointCountRef.current = 0;
    acceptedPointCountRef.current = 0;
    accuracyTotalRef.current = 0;
    accuracyCountRef.current = 0;
    trackingStateRef.current = 'idle';
    setTrackingState(INITIAL_STATE.trackingState);
    setRoutePoints(INITIAL_STATE.routePoints);
    setDistanceKm(INITIAL_STATE.distanceKm);
    setElapsedSeconds(INITIAL_STATE.elapsedSeconds);
    setCurrentPosition(INITIAL_STATE.currentPosition);
    setGpsQualityWarning(INITIAL_STATE.gpsQualityWarning);
    setSessionResult(INITIAL_STATE.sessionResult);
    setSplits(INITIAL_STATE.splits);
    setRejectedPointCount(INITIAL_STATE.rejectedPointCount);
    setAverageAccuracyMeters(INITIAL_STATE.averageAccuracyMeters);
    setRouteConfidence(INITIAL_STATE.routeConfidence);
    setCurrentHeading(null);
  }, [removeLocationSubscription, stopTimer]);

  return {
    trackingState,
    routePoints,
    distanceKm,
    elapsedSeconds,
    currentPosition,
    currentHeading,
    gpsQualityWarning,
    activeLayer,
    sessionResult,
    splits,
    rejectedPointCount,
    averageAccuracyMeters,
    routeConfidence,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    setLayer,
    resetSession,
  };
}
