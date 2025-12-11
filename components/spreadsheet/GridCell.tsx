import React from 'react';
import { ColumnType, RowData, SpreadsheetState } from '../../types';
import { AlertCircle } from 'lucide-react';

interface CellCoord {
  r: number;
  c: string;
}

interface GridCellProps {
  rowIndex: number;
  colIndex: number;
  col: string;
  row: RowData;
  columnType: ColumnType;
  formulas: SpreadsheetState['formulas'] | undefined;
  validateCell: (value: string | number, type: ColumnType) => boolean;
  getConditionalStyle: (value: string | number, column: string) => string;
  searchResults: CellCoord[];
  currentMatchIndex: number;
  selectedCell: CellCoord | null;
  setSelectedCell: (cell: CellCoord | null) => void;
  editingCell: CellCoord | null;
  setEditingCell: (cell: CellCoord | null) => void;
  handleCellChange: (rowIndex: number, column: string, value: string) => void;
  isAnomaly: boolean;
}

const GridCell: React.FC<GridCellProps> = ({
  rowIndex,
  colIndex,
  col,
  row,
  columnType,
  formulas,
  validateCell,
  getConditionalStyle,
  searchResults,
  currentMatchIndex,
  selectedCell,
  setSelectedCell,
  editingCell,
  setEditingCell,
  handleCellChange,
  isAnomaly,
}) => {
  const type = columnType || 'text';
  const formulaKey = `${rowIndex}-${col}`;
  const formulasMap = formulas || {};
  const hasFormula = !!formulasMap[formulaKey];

  const displayValue =
    editingCell?.r === rowIndex && editingCell?.c === col
      ? hasFormula
        ? formulasMap[formulaKey]
        : row[col]
      : row[col];

  const isValid = validateCell(row[col], type);

  const isMatch = searchResults.some((res) => res.r === rowIndex && res.c === col);
  const isCurrentMatch =
    searchResults[currentMatchIndex]?.r === rowIndex &&
    searchResults[currentMatchIndex]?.c === col;
  const isSelected = selectedCell?.r === rowIndex && selectedCell?.c === col;

  let conditionalClass = 'p-0 border-b border-r border-gray-100 relative';

  if (isCurrentMatch) {
    conditionalClass += ' bg-yellow-200 ring-2 ring-yellow-400 z-20';
  } else if (isMatch) {
    conditionalClass += ' bg-yellow-50';
  } else {
    conditionalClass += getConditionalStyle(row[col], col);
  }

  if (isAnomaly) {
    conditionalClass += ' bg-red-50 ring-2 ring-red-300';
  }

  return (
    <td id={`cell-${rowIndex}-${col}`} className={conditionalClass}>
      <input
        type="text"
        className={`w-full h-full px-3 py-2 text-sm outline-none focus:z-10 bg-transparent transition-colors ${
          !isValid
            ? 'text-red-600 bg-red-50 focus:ring-2 focus:ring-inset focus:ring-red-500'
            : 'focus:ring-2 focus:ring-inset focus:ring-brand-500'
        } ${
          hasFormula && editingCell?.r !== rowIndex
            ? 'text-blue-700 font-medium'
            : 'text-gray-800'
        } ${
          isSelected && editingCell?.r !== rowIndex
            ? 'ring-2 ring-brand-500 z-10'
            : ''
        }`}
        value={displayValue ?? ''}
        onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
        onFocus={() => {
          setEditingCell({ r: rowIndex, c: col });
          setSelectedCell({ r: rowIndex, c: col });
        }}
        onBlur={() => setEditingCell(null)}
        placeholder={type === 'date' ? 'YYYY-MM-DD' : ''}
        title={hasFormula ? formulasMap[formulaKey] : undefined}
      />
      {!isValid && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
          <AlertCircle size={14} />
        </div>
      )}
      {isAnomaly && isValid && (
        <div
          className="absolute left-1 top-1 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none"
          title="Anomalous value"
        ></div>
      )}
      {hasFormula && editingCell?.r !== rowIndex && isValid && (
        <div
          className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-blue-400 pointer-events-none"
          title="Contains formula"
        ></div>
      )}
    </td>
  );
};

export default GridCell;
