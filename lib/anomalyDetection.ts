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

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const detectAnomalies = (
  state: SpreadsheetState,
  options?: { zThreshold?: number; minStd?: number },
): AnomalyDetectionResult => {
  const zThreshold = options?.zThreshold ?? 3; // classic 3-sigma rule
  const minStd = options?.minStd ?? 1e-9;

  const anomalies: AnomalyPoint[] = [];
  const usedColumns: string[] = [];

  state.columns.forEach((col) => {
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

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / Math.max(values.length - 1, 1);
    const std = Math.sqrt(variance);
    if (!isFiniteNumber(std) || std < minStd) return;

    usedColumns.push(col);

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
  });

  return { anomalies, usedColumns };
};
