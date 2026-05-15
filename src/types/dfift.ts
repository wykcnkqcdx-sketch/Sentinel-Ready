export interface DfiftRepEvent {
  male: number;
  female: number;
  unit: string;
  timeLimitSeconds: number;
}

export interface DfiftRunEvent {
  distanceKm: number;
  maleMaxSeconds: number;   // seconds
  femaleMaxSeconds: number; // seconds
}

export interface DfiftSkinfoldEvent {
  maleMaxMm: number;   // mm
  femaleMaxMm: number; // mm
}

export interface DfiftStandards {
  name: string;
  shortName: string;
  status: string;
  note: string;
  events: {
    pushUps: DfiftRepEvent;
    sitUps: DfiftRepEvent;
    run: DfiftRunEvent;
    skinfold: DfiftSkinfoldEvent;
  };
}
