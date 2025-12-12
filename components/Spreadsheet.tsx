import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RowData, SpreadsheetState, ColumnType, FormattingRule, ConditionOperator } from '../types';
import { Plus, Trash2, Type, Hash, Calendar, AlertCircle, Palette, X, Check, Undo, Redo, Download, Upload, HelpCircle, Search, ChevronUp, ChevronDown, Sigma, MoreVertical, Edit, FileSpreadsheet, FileText, FileJson, Database, FileCode } from 'lucide-react';
import { evaluateFormula } from '../lib/formulas/engine';
import { detectAnomalies, AnomalyPoint, AnomalyMethod } from '../lib/anomalyDetection';
import { importDataFromFile } from '../lib/importExport/parsers';
import SpreadsheetToolbar from './SpreadsheetToolbar';
import SpreadsheetGrid from './SpreadsheetGrid';
import FormulaBar from './FormulaBar';

interface ExternalAnomalyRequest {
  id: number;
  options?: {
    method?: AnomalyMethod;
    columns?: string[];
    action?: 'highlight' | 'replace_mean' | 'replace_median' | 'replace_mode' | 'delete_rows';
  };
}

interface SpreadsheetProps {
  data: SpreadsheetState;
  onChange: (newData: SpreadsheetState) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  externalAnomalyRequest?: ExternalAnomalyRequest;
}

// Helper to convert index to Excel-like column letter (0->A, 1->B, 26->AA)
const getColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

const Spreadsheet: React.FC<SpreadsheetProps> = ({ 
  data, 
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  externalAnomalyRequest,
}) => {
  const [editingCell, setEditingCell] = useState<{r: number, c: string} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{r: number, c: string} | null>(null);
  const [isFormattingModalOpen, setIsFormattingModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  
  // Column Menu State
  const [openMenuCol, setOpenMenuCol] = useState<string | null>(null);
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{r: number, c: string}[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // New Rule State
  const [newRule, setNewRule] = useState<Partial<FormattingRule>>({
    operator: 'gt',
    stylePreset: 'success'
  });

  const [anomalies, setAnomalies] = useState<AnomalyPoint[]>([]);

  // Initialize selection
  useEffect(() => {
    if (!selectedCell && data.data.length > 0 && data.columns.length > 0) {
        setSelectedCell({ r: 0, c: data.columns[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuCol(null);
      }
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo();
        } else {
          if (canUndo) onUndo();
        }
      }
      // Check for Ctrl+Y or Cmd+Y
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  // Recalculate all formulas when data or formulas change
  useEffect(() => {
    let hasChanges = false;
    const newData = [...data.data];
    const newFormulas = { ...data.formulas };
    
    // We iterate through all known formulas and update their cell values
    const formulaEntries = Object.entries(data.formulas || {}) as [string, string][];
    formulaEntries.forEach(([key, formula]) => {
      const [rowIndexStr, colKey] = key.split('-');
      const rowIndex = parseInt(rowIndexStr);
      
      if (newData[rowIndex]) {
        const result = evaluateFormula(formula, newData, data.columns);
        
        if (newData[rowIndex][colKey] !== result) {
           newData[rowIndex] = { ...newData[rowIndex], [colKey]: result };
           hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      onChange({ ...data, data: newData });
    }
  }, [data.formulas, data.data, data.columns, onChange]);

  // Recompute anomalies when data changes
  useEffect(() => {
    setAnomalies([]);
  }, [data]);

  // Allow external triggers (e.g. from Copilot) to run anomaly detection
  useEffect(() => {
	 if (!externalAnomalyRequest) return;
	 const { options } = externalAnomalyRequest;
	 handleRunAnomalyDetection({
		 method: options?.method ?? 'zscore',
		 columns: options?.columns,
	 });
  }, [externalAnomalyRequest]);

  // Search Logic
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      setCurrentMatchIndex(0);
      return;
    }

    const results: {r: number, c: string}[] = [];
    const lowerTerm = searchTerm.toLowerCase();

    data.data.forEach((row, rIndex) => {
      data.columns.forEach(col => {
        const val = String(row[col] ?? '').toLowerCase();
        if (val.includes(lowerTerm)) {
          results.push({ r: rIndex, c: col });
        }
      });
    });

    setSearchResults(results);
    setCurrentMatchIndex(0);
  }, [searchTerm, data.data, data.columns]);

  // Scroll to active match
  useEffect(() => {
    if (searchResults.length > 0) {
      const { r, c } = searchResults[currentMatchIndex];
      const el = document.getElementById(`cell-${r}-${c}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [currentMatchIndex, searchResults]);

  const nextMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % searchResults.length);
  };

  const prevMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
  };

  const getNextType = (current: ColumnType): ColumnType => {
    switch (current) {
      case 'text': return 'number';
      case 'number': return 'date';
      case 'date': return 'text';
      default: return 'text';
    }
  };

  const getTypeIcon = (type: ColumnType) => {
    switch (type) {
      case 'number': return <Hash size={14} className="text-blue-500" />;
      case 'date': return <Calendar size={14} className="text-purple-500" />;
      default: return <Type size={14} className="text-gray-400" />;
    }
  };

  const validateCell = (value: string | number, type: ColumnType): boolean => {
    if (String(value).startsWith('#ERROR')) return false;
    if (value === '' || value === null || value === undefined) return true;
    
    const strVal = String(value);

    switch (type) {
      case 'number':
        return !isNaN(Number(strVal));
      case 'date':
        return !isNaN(Date.parse(strVal));
      default:
        return true;
    }
  };

  const getConditionalStyle = (value: string | number, column: string): string => {
    if (!data.formattingRules) return '';
    
    let classes = '';
    const rules = data.formattingRules.filter(r => r.column === column);
    
    for (const rule of rules) {
      let match = false;
      const numValue = Number(value);
      const ruleValue = Number(rule.value);
      const strValue = String(value).toLowerCase();
      const ruleStrValue = String(rule.value).toLowerCase();
      
      const isNum = !isNaN(numValue) && !isNaN(ruleValue);

      switch (rule.operator) {
        case 'gt':
          match = isNum && numValue > ruleValue;
          break;
        case 'lt':
          match = isNum && numValue < ruleValue;
          break;
        case 'eq':
          // eslint-disable-next-line eqeqeq
          match = value == rule.value;
          break;
        case 'neq':
          // eslint-disable-next-line eqeqeq
          match = value != rule.value;
          break;
        case 'contains':
          match = strValue.includes(ruleStrValue);
          break;
      }

      if (match) {
        switch (rule.stylePreset) {
          case 'success': classes += ' bg-green-100 text-green-800 font-medium'; break;
          case 'danger': classes += ' bg-red-100 text-red-800 font-medium'; break;
          case 'warning': classes += ' bg-yellow-100 text-yellow-800 font-medium'; break;
          case 'info': classes += ' bg-blue-100 text-blue-800 font-medium'; break;
          case 'bold': classes += ' font-bold text-gray-900'; break;
          case 'highlight': classes += ' bg-purple-100 text-purple-900'; break;
        }
      }
    }
    return classes;
  };

  const isAnomalyCell = (rowIndex: number, column: string): boolean => {
    if (!anomalies || anomalies.length === 0) return false;
    return anomalies.some((a) => a.rowIndex === rowIndex && a.column === column);
  };

  const handleRunAnomalyDetection = (options: {
    method: 'zscore' | 'iqr';
    columns?: string[];
    action?: 'highlight' | 'replace_mean' | 'replace_median' | 'replace_mode' | 'delete_rows';
  }) => {
    const result = detectAnomalies(data, {
      method: options.method,
      columns: options.columns,
    });
    setAnomalies(result.anomalies);

    const action = options.action || 'highlight';
    if (!result.anomalies.length || action === 'highlight') {
      return;
    }

    if (action === 'delete_rows') {
      const rowsToDelete = new Set(result.anomalies.map((a) => a.rowIndex));
      if (rowsToDelete.size === 0) return;

      const removedSorted = Array.from(rowsToDelete).sort((a, b) => a - b);

      const newData: RowData[] = [];
      data.data.forEach((row, idx) => {
        if (!rowsToDelete.has(idx)) {
          newData.push({ ...row });
        }
      });

      const newFormulas: Record<string, string> = {};
      (Object.entries(data.formulas) as [string, string][]).forEach(([key, val]) => {
        const [rStr, c] = key.split('-');
        const r = parseInt(rStr, 10);
        if (rowsToDelete.has(r)) return;
        const removedBefore = removedSorted.filter((idx) => idx < r).length;
        const newIndex = r - removedBefore;
        newFormulas[`${newIndex}-${c}`] = val;
      });

      const nextState: SpreadsheetState = {
        ...data,
        data: newData,
        formulas: newFormulas,
      };

      onChange(nextState);

      const post = detectAnomalies(nextState, {
        method: options.method,
        columns: options.columns,
      });
      setAnomalies(post.anomalies);
      return;
    }

    // Replacement-based treatments: compute central tendency per column from non-anomalous values
    const anomalyKeys = new Set<string>();
    result.anomalies.forEach((a) => {
      anomalyKeys.add(`${a.rowIndex}-${a.column}`);
    });

    const centralByColumn: Record<string, number> = {};

    result.usedColumns.forEach((col) => {
      const values: number[] = [];
      data.data.forEach((row, rowIndex) => {
        const key = `${rowIndex}-${col}`;
        if (anomalyKeys.has(key)) return;
        const raw = row[col];
        if (raw === undefined || raw === null || raw === '') return;
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (Number.isFinite(num)) {
          values.push(num);
        }
      });

      if (!values.length) {
        return;
      }

      let central = values[0];
      if (action === 'replace_mean') {
        const sum = values.reduce((s, v) => s + v, 0);
        central = sum / values.length;
      } else if (action === 'replace_median') {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        central = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      } else if (action === 'replace_mode') {
        const counts = new Map<number, number>();
        let bestVal = values[0];
        let bestCount = 0;
        values.forEach((v) => {
          const next = (counts.get(v) || 0) + 1;
          counts.set(v, next);
          if (next > bestCount) {
            bestCount = next;
            bestVal = v;
          }
        });
        central = bestVal;
      }

      centralByColumn[col] = central;
    });

    if (Object.keys(centralByColumn).length === 0) {
      return;
    }

    let nextState: SpreadsheetState = data;
    result.anomalies.forEach((a) => {
      const replacement = centralByColumn[a.column];
      if (replacement === undefined) return;
      nextState = applyCellChange(nextState, a.rowIndex, a.column, replacement);
    });

    if (nextState !== data) {
      onChange(nextState);
      const post = detectAnomalies(nextState, {
        method: options.method,
        columns: options.columns,
      });
      setAnomalies(post.anomalies);
    }
  };

  const handleTypeChange = (col: string, newType: ColumnType) => {
    onChange({
      ...data,
      columnTypes: { ...data.columnTypes, [col]: newType }
    });
    setOpenMenuCol(null);
  };

  const applyCellChange = (
    state: SpreadsheetState,
    rowIndex: number,
    column: string,
    value: string | number,
  ): SpreadsheetState => {
    const newData = [...state.data];
    const newFormulas = { ...state.formulas };
    const formulaKey = `${rowIndex}-${column}`;

    let newValue: string | number = value;
    const type = state.columnTypes[column] || 'text';

    if (typeof value === 'string' && value.startsWith('=')) {
      newFormulas[formulaKey] = value;
      newValue = evaluateFormula(value, state.data, state.columns);
    } else {
      if (newFormulas[formulaKey]) {
        delete newFormulas[formulaKey];
      }

      if (type === 'number') {
        if (value === '') {
          newValue = '';
        } else {
          const valueStr = String(value);
          const num = typeof value === 'number' ? value : parseFloat(valueStr);
          if (!isNaN(num) && !(typeof value === 'string' && valueStr.endsWith('.'))) {
            newValue = num;
          } else {
            newValue = value;
          }
        }
      }
    }

    newData[rowIndex] = {
      ...newData[rowIndex],
      [column]: newValue,
    };

    return {
      ...state,
      data: newData,
      formulas: newFormulas,
    };
  };

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    const nextState = applyCellChange(data, rowIndex, column, value);
    onChange(nextState);
  };

  const addRows = (count: number) => {
    const safeCount = Math.max(1, Math.min(10000, Math.floor(count || 0)));
    const template: RowData = {};
    data.columns.forEach((col) => {
      template[col] = '';
    });

    const newRows: RowData[] = [];
    for (let i = 0; i < safeCount; i++) {
      newRows.push({ ...template });
    }

    onChange({
      ...data,
      data: [...data.data, ...newRows],
    });
  };

  const addColumn = () => {
    const newColName = `Col ${data.columns.length + 1}`;
    const newColumns = [...data.columns, newColName];
    const newColumnTypes = { ...data.columnTypes, [newColName]: 'text' as ColumnType };
    const newData = data.data.map(row => ({ ...row, [newColName]: '' }));
    onChange({ ...data, columns: newColumns, columnTypes: newColumnTypes, data: newData });
  };

  const deleteRow = (index: number) => {
    const newData = data.data.filter((_, i) => i !== index);
    const newFormulas = { ...data.formulas };
    const shiftedFormulas: Record<string, string> = {};
    (Object.entries(newFormulas) as [string, string][]).forEach(([key, val]) => {
      const [rStr, c] = key.split('-');
      const r = parseInt(rStr);
      if (r < index) shiftedFormulas[key] = val;
      if (r > index) shiftedFormulas[`${r - 1}-${c}`] = val;
    });

    onChange({ ...data, data: newData, formulas: shiftedFormulas });
  };

  const deleteColumn = (colName: string) => {
    // 1. Remove from columns list
    const newColumns = data.columns.filter(c => c !== colName);
    
    // 2. Remove type definition
    const newColumnTypes = { ...data.columnTypes };
    delete newColumnTypes[colName];

    // 3. Remove data from every row
    const newData = data.data.map(row => {
        const { [colName]: _, ...rest } = row;
        return rest;
    });

    // 4. Cleanup formulas (basic: remove formulas IN this column)
    const newFormulas: Record<string, string> = {};
    (Object.entries(data.formulas) as [string, string][]).forEach(([key, val]) => {
        const [_, c] = key.split('-');
        if (c !== colName) {
            newFormulas[key] = val;
        }
    });

    // 5. Cleanup rules
    const newFormattingRules = (data.formattingRules || []).filter(r => r.column !== colName);

    onChange({
        columns: newColumns,
        columnTypes: newColumnTypes,
        data: newData,
        formulas: newFormulas,
        formattingRules: newFormattingRules
    });
    setOpenMenuCol(null);
  };

  const updateHeader = (oldName: string, newName: string) => {
    if (oldName === newName || newName.trim() === '') {
        setRenamingCol(null);
        return;
    }
    const newColumns = data.columns.map(c => c === oldName ? newName : c);
    
    const newColumnTypes = { ...data.columnTypes };
    if (newColumnTypes[oldName]) {
      newColumnTypes[newName] = newColumnTypes[oldName];
      delete newColumnTypes[oldName];
    }
    
    const newFormulas: Record<string, string> = {};
    (Object.entries(data.formulas) as [string, string][]).forEach(([key, val]) => {
      const [r, c] = key.split('-');
      const newKey = c === oldName ? `${r}-${newName}` : key;
      newFormulas[newKey] = val;
    });

    const newFormattingRules = (data.formattingRules || []).map(r => 
      r.column === oldName ? { ...r, column: newName } : r
    );

    const newData = data.data.map(row => {
      const newRow: RowData = {};
      Object.keys(row).forEach(key => {
        newRow[key === oldName ? newName : key] = row[key];
      });
      return newRow;
    });
    onChange({ 
      ...data, 
      columns: newColumns, 
      columnTypes: newColumnTypes, 
      data: newData, 
      formulas: newFormulas,
      formattingRules: newFormattingRules
    });
    setRenamingCol(null);
  };

  const addRule = () => {
    if (!newRule.column || !newRule.value) return;
    
    const rule: FormattingRule = {
      id: Date.now().toString(),
      column: newRule.column,
      operator: newRule.operator || 'eq',
      value: newRule.value,
      stylePreset: newRule.stylePreset || 'highlight'
    };
    
    onChange({
      ...data,
      formattingRules: [...(data.formattingRules || []), rule]
    });
    setNewRule({ operator: 'gt', stylePreset: 'success' }); // Reset minimal
  };

  const removeRule = (id: string) => {
    onChange({
      ...data,
      formattingRules: data.formattingRules.filter(r => r.id !== id)
    });
  };

  // --- Export / Import Logic ---

  const handleExportCSV = () => {
    // 1. Create Headers
    const headers = data.columns.map(col => `"${col.replace(/"/g, '""')}"`).join(',');
    
    // 2. Create Rows
    const rows = data.data.map(row => {
      return data.columns.map(col => {
        const val = row[col] === undefined || row[col] === null ? '' : String(row[col]);
        // Escape quotes and wrap in quotes
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });

    // 3. Combine and download
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spreadsheet_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFileMenuOpen(false);
  };

  const handleExportHTML = () => {
    try {
      const headers = data.columns;
      const rows = data.data;

      const escapeHtml = (value: string): string =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      const style = `
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 24px; }
  h1 { font-size: 18px; margin-bottom: 16px; color: #111827; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; background: white; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  th { background-color: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) td { background-color: #f9fafb; }
`; 

      const thead = `
    <thead>
      <tr>
        ${headers
          .map((h) => `<th>${escapeHtml(String(h))}</th>`)
          .join('')}
      </tr>
    </thead>`;

      const tbodyRows = rows
        .map((row) => {
          const cells = headers
            .map((col) => {
              const raw = row[col] === undefined || row[col] === null ? '' : String(row[col]);
              return `<td>${escapeHtml(raw)}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('\n');

      const tbody = `
    <tbody>
${tbodyRows}
    </tbody>`;

      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Spreadsheet Export</title>
    <style>${style}</style>
  </head>
  <body>
    <h1>Spreadsheet Export</h1>
    <table>
${thead}
${tbody}
    </table>
  </body>
</html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet_export.html');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsFileMenuOpen(false);
    } catch (error) {
      console.error('HTML export failed', error);
      alert('Failed to export HTML file.');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape', 'pt', 'a4');

      const headers = data.columns;
      const body = data.data.map((row) =>
        headers.map((col) => {
          const val = row[col];
          return val === undefined || val === null ? '' : String(val);
        }),
      );

      const maxRowsPerPage = 15;

      for (let i = 0; i < body.length; i += maxRowsPerPage) {
        if (i > 0) {
          doc.addPage();
        }

        const chunk = body.slice(i, i + maxRowsPerPage);

        autoTable(doc, {
          head: [headers],
          body: chunk,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 4,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: 20,
            fontStyle: 'bold',
          },
          margin: { top: 40, bottom: 40, left: 30, right: 30 },
        });
      }

      doc.save('spreadsheet_export.pdf');
      setIsFileMenuOpen(false);
    } catch (error) {
      console.error('PDF export failed', error);
      alert('Failed to export PDF file.');
    }
  };

  const handleExportORC = async () => {
    try {
      const response = await fetch('http://localhost:8000/orc/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ columns: data.columns, rows: data.data }),
      });

      if (!response.ok) {
        throw new Error('ORC export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet_export.orc');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsFileMenuOpen(false);
    } catch (error) {
      console.error('ORC export failed', error);
      alert('Failed to export ORC file via backend. Is the ORC server running?');
    }
  };

  const handleExportFeather = async () => {
    try {
      const arrow: any = await import(
        'https://cdn.jsdelivr.net/npm/apache-arrow@14.0.2/+esm'
      );

      const columns = data.columns;
      const arrays: Record<string, any[]> = {};
      columns.forEach((col) => {
        arrays[col] = data.data.map((row) =>
          row[col] === undefined ? null : row[col],
        );
      });

      const arrowTable = arrow.tableFromArrays(arrays);
      const featherBytes: Uint8Array = arrow.tableToIPC(arrowTable, 'file');

      const blob = new Blob([featherBytes as any], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet_export.feather');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsFileMenuOpen(false);
    } catch (error) {
      console.error('Feather export failed', error);
      alert('Failed to export Feather/Arrow IPC file.');
    }
  };

  const handleExportTSV = () => {
    const headers = data.columns.join('\t');
    const rows = data.data.map((row) =>
      data.columns
        .map((col) => {
          const val = row[col] === undefined || row[col] === null ? '' : String(row[col]);
          return val.replace(/\r?\n/g, ' ');
        })
        .join('\t'),
    );

    const tsvContent = [headers, ...rows].join('\n');
    const blob = new Blob([tsvContent], {
      type: 'text/tab-separated-values;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spreadsheet_export.tsv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFileMenuOpen(false);
  };

  const handleExportParquet = async () => {
    try {
      const parquet: any = await import(
        'https://cdn.jsdelivr.net/npm/parquet-wasm@0.6.1/esm/+esm'
      );
      await parquet.default();
      const arrow: any = await import(
        'https://cdn.jsdelivr.net/npm/apache-arrow@14.0.2/+esm'
      );

      const columns = data.columns;
      const arrays: Record<string, any[]> = {};
      columns.forEach((col) => {
        arrays[col] = data.data.map((row) =>
          row[col] === undefined ? null : row[col],
        );
      });

      const arrowTable = arrow.tableFromArrays(arrays);
      const wasmTable = parquet.Table.fromIPCStream(
        arrow.tableToIPC(arrowTable, 'stream'),
      );
      const writerProps = new parquet.WriterPropertiesBuilder()
        .setCompression(parquet.Compression.ZSTD)
        .build();
      const parquetBytes: Uint8Array = parquet.writeParquet(
        wasmTable,
        writerProps,
      );

      const blob = new Blob([parquetBytes as any], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet_export.parquet');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsFileMenuOpen(false);
    } catch (error) {
      console.error('Parquet export failed', error);
      alert('Failed to export Parquet file.');
    }
  };

  const buildAvroPayload = () => {
    const schema = {
      type: 'record',
      name: 'Row',
      fields: data.columns.map((col) => {
        const colType = data.columnTypes[col];
        let avroType: any = ['null', 'string'];
        if (colType === 'number') {
          avroType = ['null', 'double'];
        }
        return { name: col, type: avroType };
      }),
    };

    return {
      schema,
      rows: data.data,
    };
  };

  const handleExportAvro = async () => {
    try {
      const avroModule: any = await import('https://esm.sh/avro-js@1.11.0');
      const avro = avroModule.default || avroModule;

      const schema = {
        type: 'record',
        name: 'SpreadsheetExport',
        fields: [
          { name: 'columns', type: { type: 'array', items: 'string' } },
          {
            name: 'rows',
            type: {
              type: 'array',
              items: {
                type: 'map',
                values: 'string',
              },
            },
          },
        ],
      };

      const type = avro.parse(schema);

      const rowsForAvro = data.data.map((row) => {
        const m: Record<string, any> = {};
        data.columns.forEach((col) => {
          const value = row[col];
          if (value === undefined || value === null || value === '') {
            // Omit empty values; maps don't need all keys present.
            return;
          }
          m[col] = String(value);
        });
        return m;
      });

      const value = {
        columns: data.columns,
        rows: rowsForAvro,
      };

      const buf: Uint8Array = type.toBuffer(value);
      const blob = new Blob([buf as any], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet_export.avro');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsFileMenuOpen(false);
    } catch (error) {
      console.error('Avro export failed', error);
      alert('Failed to export Avro file.');
    }
  };

  const handleExportAvroJson = () => {
    const avroPayload = buildAvroPayload();
    const jsonContent = JSON.stringify(avroPayload, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spreadsheet_export.avro.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFileMenuOpen(false);
  };

  const handleExportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(data.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "spreadsheet_export.xlsx");
    setIsFileMenuOpen(false);
  };

  const handleExportXLS = () => {
    const ws = XLSX.utils.json_to_sheet(data.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'spreadsheet_export.xls', { bookType: 'biff8' as any });
    setIsFileMenuOpen(false);
  };

  const handleExportODS = () => {
    const ws = XLSX.utils.json_to_sheet(data.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'spreadsheet_export.ods', { bookType: 'ods' as any });
    setIsFileMenuOpen(false);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(data.data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spreadsheet_export.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFileMenuOpen(false);
  };

  const handleExportJSONL = () => {
    const lines = data.data.map((row) => JSON.stringify(row ?? {}));
    const content = lines.join('\n');
    const blob = new Blob([content], {
      type: 'application/jsonl',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spreadsheet_export.jsonl');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFileMenuOpen(false);
  };

  const handleExportSQLite = async () => {
    if (!(window as any).initSqlJs) {
        alert("SQL Engine not loaded yet. Please refresh and try again.");
        return;
    }
    try {
        const SQL = await (window as any).initSqlJs({
            locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });
        const db = new SQL.Database();
        
        // Define Columns with types
        const colsDef = data.columns.map(c => {
            const type = data.columnTypes[c];
            // Simple mapping: number -> REAL, others -> TEXT
            return `"${c}" ${type === 'number' ? 'REAL' : 'TEXT'}`;
        }).join(', ');
        
        db.run(`CREATE TABLE ExportedData (${colsDef})`);
        
        // Insert Data
        const placeholders = data.columns.map(() => '?').join(',');
        const stmt = db.prepare(`INSERT INTO ExportedData VALUES (${placeholders})`);
        
        data.data.forEach(row => {
            const values = data.columns.map(c => row[c]);
            stmt.run(values);
        });
        stmt.free();
        
        const binaryArray = db.export();
        const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'spreadsheet_export.db');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsFileMenuOpen(false);
    } catch (e) {
        console.error("SQLite Export Failed", e);
        alert("Failed to export SQLite database.");
    }
  };

  const handleExportSQL = () => {
    const tableName = "ExportedData";
    let sql = `-- Generated by Tahlel\n\n`;
    
    // Create Table Statement
    const colDefs = data.columns.map(c => {
        const type = data.columnTypes[c] === 'number' ? 'REAL' : 'TEXT';
        return `"${c}" ${type}`;
    }).join(', ');
    sql += `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs});\n\n`;

    // Insert Statements
    if (data.data.length > 0) {
      sql += `INSERT INTO "${tableName}" ("${data.columns.join('", "')}") VALUES\n`;
      const rows = data.data.map(row => {
          const values = data.columns.map(col => {
              const val = row[col];
              if (val === null || val === undefined || val === '') return 'NULL';
              if (typeof val === 'number') return val;
              // Escape single quotes
              return `'${String(val).replace(/'/g, "''")}'`;
          });
          return `(${values.join(', ')})`;
      });
      sql += rows.join(',\n') + ';';
    }

    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'spreadsheet_export.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFileMenuOpen(false);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic protection: avoid freezing the UI by rejecting very large files
    const MAX_FILE_SIZE_MB = 10;
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Helper to finish import logic (Type Inference and State Update)
    const finalizeImport = (headers: string[], rows: RowData[]) => {
        const newColumnTypes: Record<string, ColumnType> = {};

        // Infer Types based on first 5 rows
        headers.forEach(header => {
            let isNumber = true;
            let isDate = true;
            let hasData = false;

            for (let i = 0; i < Math.min(rows.length, 5); i++) {
                const val = rows[i][header];
                if (val === undefined || val === '') continue;
                hasData = true;
                if (isNaN(Number(val))) isNumber = false;
                if (isNaN(Date.parse(String(val)))) isDate = false;
            }

            if (hasData && isNumber) newColumnTypes[header] = 'number';
            else if (hasData && isDate) newColumnTypes[header] = 'date';
            else newColumnTypes[header] = 'text';
        });

        onChange({
            columns: headers,
            data: rows,
            columnTypes: newColumnTypes,
            formulas: {}, // Reset formulas on import
            formattingRules: [] // Reset formatting on import
        });
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsFileMenuOpen(false);
    };
    importDataFromFile(file, finalizeImport);
  };

  const getSelectedCellValue = () => {
      if (!selectedCell) return '';
      const formulaKey = `${selectedCell.r}-${selectedCell.c}`;
      if (data.formulas[formulaKey]) return data.formulas[formulaKey];
      return String(data.data[selectedCell.r]?.[selectedCell.c] ?? '');
  };

  const hasSelectedCell = !!selectedCell && data.columns.includes(selectedCell.c);
  const selectedCellLabel = hasSelectedCell
    ? `${getColumnLetter(data.columns.indexOf(selectedCell.c))}${selectedCell.r + 1}`
    : '';

  const handleFormulaBarChange = (value: string) => {
    if (selectedCell) {
      handleCellChange(selectedCell.r, selectedCell.c, value);
    }
  };

  const handleInsertFormulaPrefix = () => {
    if (selectedCell) {
      handleCellChange(selectedCell.r, selectedCell.c, '=');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".csv,.tsv,.xlsx,.xls,.ods,.json,.jsonl,.ndjson,.html,.htm,.orc,.feather,.arrow,.db,.sqlite,.sqlite3,.sql,.parquet,.avro,.avro.json"
        className="hidden"
      />
      <SpreadsheetToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        fileInputRef={fileInputRef}
        fileMenuRef={fileMenuRef}
        isFileMenuOpen={isFileMenuOpen}
        setIsFileMenuOpen={setIsFileMenuOpen}
        handleExportCSV={handleExportCSV}
        handleExportTSV={handleExportTSV}
        handleExportHTML={handleExportHTML}
        handleExportPDF={handleExportPDF}
        handleExportORC={handleExportORC}
        handleExportFeather={handleExportFeather}
        handleExportXLS={handleExportXLS}
        handleExportXLSX={handleExportXLSX}
        handleExportODS={handleExportODS}
        handleExportJSON={handleExportJSON}
        handleExportJSONL={handleExportJSONL}
        handleExportAvroJson={handleExportAvroJson}
        handleExportAvro={handleExportAvro}
        handleExportSQLite={handleExportSQLite}
        handleExportSQL={handleExportSQL}
        handleExportParquet={handleExportParquet}
        isFormattingModalOpen={isFormattingModalOpen}
        setIsFormattingModalOpen={setIsFormattingModalOpen}
        dataColumns={data.columns}
        formattingRules={data.formattingRules || []}
        newRule={newRule}
        setNewRule={setNewRule}
        addRule={addRule}
        removeRule={removeRule}
        isHelpOpen={isHelpOpen}
        setIsHelpOpen={setIsHelpOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResultsCount={searchResults.length}
        currentMatchIndex={currentMatchIndex}
        prevMatch={prevMatch}
        nextMatch={nextMatch}
        onRunAnomalyDetection={handleRunAnomalyDetection}
      />
      <FormulaBar
        selectedCellLabel={selectedCellLabel}
        hasSelectedCell={hasSelectedCell}
        value={getSelectedCellValue()}
        onChange={handleFormulaBarChange}
        onInsertFormulaPrefix={handleInsertFormulaPrefix}
      />

      <SpreadsheetGrid
        data={data}
        renamingCol={renamingCol}
        setRenamingCol={setRenamingCol}
        openMenuCol={openMenuCol}
        setOpenMenuCol={setOpenMenuCol}
        menuRef={menuRef}
        handleTypeChange={handleTypeChange}
        deleteColumn={deleteColumn}
        deleteRow={deleteRow}
        updateHeader={updateHeader}
        validateCell={validateCell}
        getConditionalStyle={getConditionalStyle}
        searchResults={searchResults}
        currentMatchIndex={currentMatchIndex}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        editingCell={editingCell}
        setEditingCell={setEditingCell}
        addRows={addRows}
        addColumn={addColumn}
        handleCellChange={handleCellChange}
        isAnomalyCell={isAnomalyCell}
      />

      {anomalies.length > 0 && (
        <div className="px-3 py-1 text-[11px] text-red-700 bg-red-50 border-t border-red-100 flex items-center gap-1">
          <AlertCircle size={12} className="text-red-500" />
          <span>Detected {anomalies.length} anomalous values in numeric columns.</span>
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;