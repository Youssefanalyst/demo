
// Data types
export type ColumnType = 'text' | 'number' | 'date';

export interface RowData {
  [key: string]: string | number;
}

// Chart Configuration types
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'scatter3d';

export interface ChartConfig {
  id: string;
  title: string;
  description?: string;
  type: ChartType;
  xAxisKey: string;
  dataKeys: string[];
  zAxisKey?: string;
  colors?: string[];
}

export interface DashboardData {
  insights: string[];
  charts: ChartConfig[];
  summary: string;
}

export type ConditionOperator = 'gt' | 'lt' | 'eq' | 'neq' | 'contains';

export interface FormattingRule {
  id: string;
  column: string;
  operator: ConditionOperator;
  value: string;
  stylePreset: 'success' | 'danger' | 'warning' | 'info' | 'bold' | 'highlight';
}

export interface SpreadsheetState {
  columns: string[];
  columnTypes: Record<string, ColumnType>;
  data: RowData[];
  formulas: Record<string, string>; // Key format: "rowIndex-columnName"
  formattingRules: FormattingRule[];
}

// Chat types
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export type SheetEditOperation =
  | {
      type: 'update_cell';
      target: {
        rowIndex: number;
        columnKey: string;
      };
      value: string | number;
    }
  | {
      type: 'run_anomaly_detection';
      options?: {
        method?: 'zscore' | 'iqr';
        columns?: string[];
        action?: 'highlight' | 'replace_mean' | 'replace_median' | 'replace_mode' | 'delete_rows';
      };
    }
  | {
      type: 'add_rows';
      count: number;
    };

export interface SheetAssistantResult {
  explanation: string;
  operations: SheetEditOperation[];
}