import type { TrainingLog } from '@/src/screens/TrainingContext';

export type AARTone = 'good' | 'warn' | 'bad' | 'neutral';

export type AARLine = {
  label: string;
  value: string;
  tone: AARTone;
};

export type AARSection = {
  id: string;
  heading: string;
  lines: AARLine[];
};

export type AARDocument = {
  operationRef: string;
  date: string;
  title: string;
  classification: string;
  outcome: 'MISSION MET' | 'PARTIAL' | 'REVIEW REQUIRED' | 'BASELINE';
  outcomeTone: 'good' | 'warn' | 'bad';
  sections: AARSection[];
};

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function fmtPace(secondsPerKm: number): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '--';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function buildAAR(log: TrainingLog): AARDocument {
  const ruck = log.ruck;

  if (!ruck) {
    return {
      operationRef: `OP-${String(log.id).slice(-6)}`,
      date: log.date,
      title: log.type,
      classification: 'UNCLASSIFIED // EXERCISE',
      outcome: 'BASELINE',
      outcomeTone: 'good',
      sections: [{
        id: 'notes',
        heading: '1. FIELD NOTES',
        lines: [{ label: 'NOTES', value: log.notes || 'None recorded.', tone: 'neutral' }],
      }],
    };
  }

  const mission = ruck.mission;
  const readiness = Number(log.readiness) || 0;
  const gpsOk = ruck.routeConfidence !== 'Low';
  const effortHigh = ruck.rpe >= 8 || readiness <= 4;
  const distanceDelta = mission ? ruck.distanceKm - mission.targetDistanceKm : null;
  const timeDelta = mission ? (ruck.durationSeconds / 60) - mission.targetMinutes : null;

  let outcome: AARDocument['outcome'] = 'BASELINE';
  let outcomeTone: AARDocument['outcomeTone'] = 'good';
  if (mission) {
    const distMet = distanceDelta !== null && distanceDelta >= -(mission.targetDistanceKm * 0.02);
    const timeMet = timeDelta !== null && timeDelta <= mission.targetMinutes * 0.05;
    if (distMet && timeMet && gpsOk && !effortHigh) {
      outcome = 'MISSION MET'; outcomeTone = 'good';
    } else if (!gpsOk || effortHigh) {
      outcome = 'REVIEW REQUIRED'; outcomeTone = 'bad';
    } else {
      outcome = 'PARTIAL'; outcomeTone = 'warn';
    }
  }

  // 1. Mission parameters
  const missionLines: AARLine[] = mission
    ? [
        { label: 'TARGET DISTANCE', value: `${mission.targetDistanceKm.toFixed(1)} km`, tone: 'neutral' },
        { label: 'TARGET TIME', value: `${mission.targetMinutes} min`, tone: 'neutral' },
        ...(mission.checkpointIntervalKm > 0
          ? [{ label: 'CHECKPOINT INTERVAL', value: `${mission.checkpointIntervalKm.toFixed(1)} km`, tone: 'neutral' as AARTone }]
          : []),
      ]
    : [{ label: 'PLANNED PARAMETERS', value: 'No mission target set. Baseline session.', tone: 'neutral' }];
  missionLines.push({ label: 'PACK WEIGHT', value: `${ruck.packWeightKg.toFixed(0)} kg`, tone: 'neutral' });

  // 2. Execution
  const execLines: AARLine[] = [
    { label: 'DISTANCE COVERED', value: `${ruck.distanceKm.toFixed(2)} km`, tone: distanceDelta !== null ? (distanceDelta >= 0 ? 'good' : 'warn') : 'neutral' },
    { label: 'ELAPSED TIME', value: fmtDuration(ruck.durationSeconds), tone: timeDelta !== null ? (timeDelta <= 0 ? 'good' : 'warn') : 'neutral' },
    { label: 'AVG PACE', value: fmtPace(ruck.paceSecondsPerKm), tone: 'neutral' },
    { label: 'RPE', value: `${ruck.rpe}/10`, tone: ruck.rpe <= 6 ? 'good' : ruck.rpe <= 8 ? 'warn' : 'bad' },
    { label: 'READINESS POST', value: `${readiness}/10`, tone: readiness >= 7 ? 'good' : readiness >= 5 ? 'warn' : 'bad' },
  ];
  if (distanceDelta !== null) {
    execLines.push({ label: 'DISTANCE DELTA', value: `${distanceDelta >= 0 ? '+' : ''}${distanceDelta.toFixed(2)} km`, tone: distanceDelta >= 0 ? 'good' : 'warn' });
  }
  if (timeDelta !== null) {
    execLines.push({ label: 'TIME DELTA', value: `${timeDelta > 0 ? '+' : ''}${Math.round(timeDelta)} min`, tone: timeDelta <= 0 ? 'good' : 'warn' });
  }

  // 3. Route intelligence
  const intelLines: AARLine[] = [
    { label: 'GPS CONFIDENCE', value: ruck.routeConfidence ?? 'High', tone: gpsOk ? 'good' : 'bad' },
    { label: 'POINTS FILTERED', value: `${ruck.rejectedPointCount ?? 0}`, tone: (ruck.rejectedPointCount ?? 0) > 10 ? 'warn' : 'neutral' },
  ];
  if (ruck.averageAccuracyMeters != null) {
    intelLines.push({ label: 'AVG ACCURACY', value: `${ruck.averageAccuracyMeters.toFixed(1)} m`, tone: ruck.averageAccuracyMeters < 10 ? 'good' : ruck.averageAccuracyMeters < 20 ? 'neutral' : 'warn' });
  }
  if (ruck.splits && ruck.splits.length > 0) {
    intelLines.push({ label: 'SPLITS RECORDED', value: `${ruck.splits.length}`, tone: 'neutral' });
  }

  // 4a. Sustain
  const sustainLines: AARLine[] = [];
  if (distanceDelta !== null && distanceDelta >= 0) sustainLines.push({ label: 'SUSTAIN', value: 'Distance target achieved or exceeded. Set this as new baseline.', tone: 'good' });
  if (timeDelta !== null && timeDelta <= 0) sustainLines.push({ label: 'SUSTAIN', value: 'Completed within time target. Pacing was effective.', tone: 'good' });
  if (readiness >= 7) sustainLines.push({ label: 'SUSTAIN', value: 'Post-session readiness is strong. Recovery capacity is holding.', tone: 'good' });
  if (ruck.rpe <= 6) sustainLines.push({ label: 'SUSTAIN', value: 'Effort was controlled — capacity remains to progress one variable.', tone: 'good' });
  if (gpsOk) sustainLines.push({ label: 'SUSTAIN', value: 'GPS route data is reliable. This session can inform progression decisions.', tone: 'good' });
  if (sustainLines.length === 0) sustainLines.push({ label: 'SUSTAIN', value: 'No clear sustain points identified. Log more sessions for pattern analysis.', tone: 'neutral' });

  // 4b. Improve
  const improveLines: AARLine[] = [];
  if (distanceDelta !== null && distanceDelta < 0) improveLines.push({ label: 'IMPROVE', value: `Fell ${Math.abs(distanceDelta).toFixed(2)} km short of target. Repeat before progressing distance.`, tone: 'warn' });
  if (timeDelta !== null && timeDelta > 0) improveLines.push({ label: 'IMPROVE', value: `Overran target time by ${Math.round(timeDelta)} min. Review pacing strategy — start conservative.`, tone: 'warn' });
  if (readiness < 5) improveLines.push({ label: 'IMPROVE', value: 'Post-session readiness is low. Mandatory recovery before next ruck.', tone: 'bad' });
  if (ruck.rpe >= 8) improveLines.push({ label: 'IMPROVE', value: `High effort recorded (RPE ${ruck.rpe}). Reduce load or distance next session — do not progress both.`, tone: 'warn' });
  if (!gpsOk) improveLines.push({ label: 'IMPROVE', value: 'GPS confidence was low. Check device placement and allow longer satellite lock time.', tone: 'bad' });
  const notesTxt = (log.notes ?? '').toLowerCase();
  if (notesTxt.includes('hot spot') || notesTxt.includes('pack rub')) {
    improveLines.push({ label: 'IMPROVE', value: 'Equipment fit noted in field log. Adjust pack fitment and footwear before next op.', tone: 'warn' });
  }
  if (improveLines.length === 0) improveLines.push({ label: 'IMPROVE', value: 'No immediate improvement points identified. Maintain current approach.', tone: 'neutral' });

  // 5. Next mission
  const progressionOk = readiness >= 6 && ruck.rpe <= 7 && (distanceDelta === null || distanceDelta >= 0);
  const nextDistKm = progressionOk ? (ruck.distanceKm + 1).toFixed(1) : ruck.distanceKm.toFixed(1);
  const nextLoadStr = progressionOk && distanceDelta !== null && distanceDelta >= 0
    ? `${(ruck.packWeightKg + 2).toFixed(0)} kg (progress if distance held)`
    : `${ruck.packWeightKg.toFixed(0)} kg (hold)`;
  const constraint = readiness < 6 ? 'Hold all variables — prioritise recovery'
    : ruck.rpe >= 8 ? 'Reduce intensity — progress one variable only'
    : 'Progress one variable per session maximum';

  const nextLines: AARLine[] = [
    { label: 'RECOMMENDED DISTANCE', value: `${nextDistKm} km`, tone: 'neutral' },
    { label: 'RECOMMENDED LOAD', value: nextLoadStr, tone: 'neutral' },
    { label: 'CONSTRAINT', value: constraint, tone: readiness < 6 || ruck.rpe >= 8 ? 'warn' : 'good' },
  ];

  // 6. Field notes
  const notesLines: AARLine[] = [
    { label: 'FIELD NOTES', value: log.notes || 'None recorded.', tone: 'neutral' },
  ];

  return {
    operationRef: `OP-${String(log.id).slice(-6)}`,
    date: log.date,
    title: log.type,
    classification: 'UNCLASSIFIED // EXERCISE',
    outcome,
    outcomeTone,
    sections: [
      { id: 'mission', heading: '1. MISSION PARAMETERS', lines: missionLines },
      { id: 'execution', heading: '2. EXECUTION', lines: execLines },
      { id: 'intel', heading: '3. ROUTE INTELLIGENCE', lines: intelLines },
      { id: 'sustain', heading: '4a. SUSTAIN', lines: sustainLines },
      { id: 'improve', heading: '4b. IMPROVE', lines: improveLines },
      { id: 'next', heading: '5. NEXT MISSION PARAMETERS', lines: nextLines },
      { id: 'notes', heading: '6. FIELD NOTES', lines: notesLines },
    ],
  };
}
