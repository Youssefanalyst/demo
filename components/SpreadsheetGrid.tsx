import React, { RefObject, useState } from 'react';
import { SpreadsheetState, ColumnType } from '../types';
import { Plus, Type, Hash, Calendar } from 'lucide-react';
import ColumnHeader from './spreadsheet/ColumnHeader';
import RowHeader from './spreadsheet/RowHeader';
import GridCell from './spreadsheet/GridCell';

interface CellCoord {
  r: number;
  c: string;
}

interface SpreadsheetGridProps {
  data: SpreadsheetState;
  renamingCol: string | null;
  setRenamingCol: (col: string | null) => void;
  openMenuCol: string | null;
  setOpenMenuCol: (col: string | null) => void;
  menuRef: RefObject<HTMLDivElement>;
  handleTypeChange: (col: string, newType: ColumnType) => void;
  deleteColumn: (colName: string) => void;
  deleteRow: (index: number) => void;
  updateHeader: (oldName: string, newName: string) => void;
  validateCell: (value: string | number, type: ColumnType) => boolean;
  getConditionalStyle: (value: string | number, column: string) => string;
  searchResults: CellCoord[];
  currentMatchIndex: number;
  selectedCell: CellCoord | null;
  setSelectedCell: (cell: CellCoord | null) => void;
  editingCell: CellCoord | null;
  setEditingCell: (cell: CellCoord | null) => void;
  addRows: (count: number) => void;
  addColumn: () => void;
  handleCellChange: (rowIndex: number, column: string, value: string) => void;
  isAnomalyCell: (rowIndex: number, column: string) => boolean;
}

const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  data,
  renamingCol,
  setRenamingCol,
  openMenuCol,
  setOpenMenuCol,
  menuRef,
  handleTypeChange,
  deleteColumn,
  deleteRow,
  updateHeader,
  validateCell,
  getConditionalStyle,
  searchResults,
  currentMatchIndex,
  selectedCell,
  setSelectedCell,
  editingCell,
  setEditingCell,
  addRows,
  addColumn,
  handleCellChange,
  isAnomalyCell,
}) => {
  const [rowsToAdd, setRowsToAdd] = useState<number>(1);

  const handleRowsToAddChange = (value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      setRowsToAdd(1);
      return;
    }
    const clamped = Math.max(1, Math.min(10000, parsed));
    setRowsToAdd(clamped);
  };

  return (
    <>
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="w-12 p-2 border-b border-r border-gray-200 text-center text-xs font-semibold text-gray-500 bg-gray-50 sticky left-0 z-20">
                #
              </th>
              {data.columns.map((col, idx) => (
                <th key={idx} className="min-w-[150px] p-0 border-b border-r border-gray-200 group relative">
                  <ColumnHeader
                    col={col}
                    index={idx}
                    columnType={data.columnTypes[col]}
                    renamingCol={renamingCol}
                    setRenamingCol={setRenamingCol}
                    openMenuCol={openMenuCol}
                    setOpenMenuCol={setOpenMenuCol}
                    menuRef={menuRef}
                    handleTypeChange={handleTypeChange}
                    deleteColumn={deleteColumn}
                    updateHeader={updateHeader}
                  />
                </th>
              ))}
              <th className="w-12 border-b border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={addColumn}
                  className="w-full h-full flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded"
                  title="Add Column"
                >
                  <Plus size={16} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {data.data.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-gray-50">
                <RowHeader rowIndex={rowIndex} deleteRow={deleteRow} />
                {data.columns.map((col, colIndex) => (
                  <GridCell
                    key={`${rowIndex}-${colIndex}`}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    col={col}
                    row={row}
                    columnType={data.columnTypes[col] || 'text'}
                    formulas={data.formulas}
                    validateCell={validateCell}
                    getConditionalStyle={getConditionalStyle}
                    searchResults={searchResults}
                    currentMatchIndex={currentMatchIndex}
                    selectedCell={selectedCell}
                    setSelectedCell={setSelectedCell}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    handleCellChange={handleCellChange}
                    isAnomaly={isAnomalyCell(rowIndex, col)}
                  />
                ))}
                <td className="border-b border-gray-100 bg-gray-50"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={10000}
            value={rowsToAdd}
            onChange={(e) => handleRowsToAddChange(e.target.value)}
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500"
            title="Number of rows to add (1 - 10000)"
          />
          <button
            onClick={() => addRows(rowsToAdd)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
          >
            <Plus size={16} /> Add Rows
          </button>
        </div>
        <div className="flex gap-4 text-xs text-gray-400 px-2">
          <span className="flex items-center gap-1 text-blue-600">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div> Formula
          </span>
          <span className="flex items-center gap-1">
            <Type size={12} /> Text
          </span>
          <span className="flex items-center gap-1">
            <Hash size={12} /> Number
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} /> Date
          </span>
        </div>
      </div>
    </>
  );
};

export default SpreadsheetGrid;
