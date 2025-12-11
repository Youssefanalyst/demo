import { SpreadsheetState, ColumnType } from '../types';

export interface AnomalyPoint {
  rowIndex: number;
  column: string;
  value: number;
  zScore: number;
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyPoint[];
  usedColumns: string[];
}

export type AnomalyMethod = 'zscore' | 'iqr';

export interface AnomalyDetectionOptions {
  method?: AnomalyMethod;
  zThreshold?: number;
  iqrMultiplier?: number;
  minStd?: number;
  columns?: string[];
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const computeQuantile = (sorted: number[], q: number): number => {
  if (sorted.length === 0) return NaN;
  if (q <= 0) return sorted[0];
  if (q >= 1) return sorted[sorted.length - 1];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
};

export const detectAnomalies = (
  state: SpreadsheetState,
  options?: AnomalyDetectionOptions,
): AnomalyDetectionResult => {
  const method: AnomalyMethod = options?.method ?? 'zscore';
  const zThreshold = options?.zThreshold ?? 3; // classic 3-sigma rule
  const iqrMultiplier = options?.iqrMultiplier ?? 1.5;
  const minStd = options?.minStd ?? 1e-9;

  const anomalies: AnomalyPoint[] = [];
  const usedColumns: string[] = [];
  const columnsFilter = options?.columns;

  state.columns.forEach((col) => {
    if (columnsFilter && !columnsFilter.includes(col)) return;
    const colType: ColumnType = state.columnTypes[col] || 'text';
    if (colType !== 'number') return;

    const values: number[] = [];
    const rowIndices: number[] = [];

    state.data.forEach((row, rowIndex) => {
      const raw = row[col];
      if (raw === undefined || raw === null || raw === '') return;
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (isFiniteNumber(num)) {
        values.push(num);
        rowIndices.push(rowIndex);
      }
    });

    if (values.length < 5) return; // not enough data to be meaningful

    usedColumns.push(col);

    if (method === 'zscore') {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / Math.max(values.length - 1, 1);
      const std = Math.sqrt(variance);
      if (!isFiniteNumber(std) || std < minStd) return;

      values.forEach((v, i) => {
        const z = (v - mean) / std;
        if (Math.abs(z) >= zThreshold) {
          anomalies.push({
            rowIndex: rowIndices[i],
            column: col,
            value: v,
            zScore: z,
          });
        }
      });
    } else {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = computeQuantile(sorted, 0.25);
      const q3 = computeQuantile(sorted, 0.75);
      const iqr = q3 - q1;
      if (!isFiniteNumber(iqr) || iqr === 0) return;

      const k = iqrMultiplier;
      const low = q1 - k * iqr;
      const high = q3 + k * iqr;

      values.forEach((v, i) => {
        if (v < low || v > high) {
          anomalies.push({
            rowIndex: rowIndices[i],
            column: col,
            value: v,
            zScore: 0,
          });
        }
      });
    }
  });

  return { anomalies, usedColumns };
};
