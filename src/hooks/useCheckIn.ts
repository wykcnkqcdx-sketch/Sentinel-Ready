import { getLatestReadinessLog, computeCheckInScore } from '@/src/services/readinessService';
import type { ReadinessLog } from '@/src/types/map';
import { useEffect, useRef, useState } from 'react';

export type CheckInState = {
  log: ReadinessLog | null;
  score: number | null;
  checkedInToday: boolean;
  isLoading: boolean;
  reload: () => void;
};

/**
 * Load the latest daily check-in log and derive a 0–100 readiness score from it.
 * Reloads whenever `reload()` is called (e.g. after returning from CheckInScreen).
 */
export function useCheckIn(): CheckInState {
  const [log, setLog] = useState<ReadinessLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);

    getLatestReadinessLog().then((result) => {
      if (!isMounted.current) return;
      setLog(result);
      setIsLoading(false);
    }).catch(() => {
      if (!isMounted.current) return;
      setLog(null);
      setIsLoading(false);
    });

    return () => { isMounted.current = false; };
  }, [tick]);

  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = log?.date === today;
  const score = log ? computeCheckInScore(log) : null;

  return {
    log,
    score,
    checkedInToday: checkedInToday ?? false,
    isLoading,
    reload: () => setTick((t) => t + 1),
  };
}
