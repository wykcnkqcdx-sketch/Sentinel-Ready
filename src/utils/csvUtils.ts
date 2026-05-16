import type { TrainingCategory, TrainingLog } from '@/src/screens/TrainingContext';

const LOG_CSV_HEADERS = ['Date', 'Category', 'Type', 'Duration', 'DistanceLoad', 'Readiness', 'Notes'];

function escapeCsvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function parseCsvRecords(csv: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  record.push(field);
  if (record.some((value) => value.trim().length > 0)) {
    records.push(record);
  }

  return records;
}

export function buildTrainingLogsCsv(logs: TrainingLog[]) {
  const header = LOG_CSV_HEADERS.join(',');
  const rows = logs.map((log) =>
    [
      log.date,
      log.category,
      escapeCsvField(log.type),
      escapeCsvField(log.duration),
      escapeCsvField(log.distanceLoad),
      log.readiness,
      escapeCsvField(log.notes),
    ].join(','),
  );

  return [header, ...rows].join('\n');
}

export function parseTrainingLogsCsv(csv: string, createId: (rowIndex: number) => number): TrainingLog[] {
  const records = parseCsvRecords(csv).filter((record) => record.some((field) => field.trim().length > 0));
  if (records.length < 2) return [];

  return records.slice(1).flatMap((record, index) => {
    if (record.length < LOG_CSV_HEADERS.length) return [];

    return [{
      id: createId(index),
      date: record[0],
      category: record[1] as TrainingCategory,
      type: record[2],
      duration: record[3],
      distanceLoad: record[4],
      readiness: record[5],
      notes: record.slice(6).join(','),
    }];
  });
}
