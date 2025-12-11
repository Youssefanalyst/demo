import React, { RefObject } from 'react';
import { ColumnType } from '../../types';
import { Type, Hash, Calendar, MoreVertical, Trash2, Edit, Check } from 'lucide-react';

interface ColumnHeaderProps {
  col: string;
  index: number;
  columnType: ColumnType | undefined;
  renamingCol: string | null;
  setRenamingCol: (col: string | null) => void;
  openMenuCol: string | null;
  setOpenMenuCol: (col: string | null) => void;
  menuRef: RefObject<HTMLDivElement>;
  handleTypeChange: (col: string, newType: ColumnType) => void;
  deleteColumn: (colName: string) => void;
  updateHeader: (oldName: string, newName: string) => void;
}

const getColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

const getTypeIcon = (type: ColumnType) => {
  switch (type) {
    case 'number':
      return <Hash size={14} className="text-blue-500" />;
    case 'date':
      return <Calendar size={14} className="text-purple-500" />;
    default:
      return <Type size={14} className="text-gray-400" />;
  }
};

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  col,
  index,
  columnType,
  renamingCol,
  setRenamingCol,
  openMenuCol,
  setOpenMenuCol,
  menuRef,
  handleTypeChange,
  deleteColumn,
  updateHeader,
}) => {
  return (
    <div className="flex flex-col h-full relative">
      <div className="bg-gray-100 text-[10px] text-center text-gray-500 font-mono py-0.5 border-b border-gray-200">
        {getColumnLetter(index)}
      </div>

      <div className="flex items-center justify-between p-2 h-9">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getTypeIcon(columnType || 'text')}
          {renamingCol === col ? (
            <input
              autoFocus
              className="w-full text-sm font-semibold text-gray-900 bg-white border border-brand-500 rounded px-1 outline-none"
              defaultValue={col}
              onBlur={(e) => updateHeader(col, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateHeader(col, e.currentTarget.value);
              }}
            />
          ) : (
            <span className="text-sm font-semibold text-gray-700 truncate" title={col}>
              {col}
            </span>
          )}
        </div>

        <button
          onClick={() => setOpenMenuCol(openMenuCol === col ? null : col)}
          className={`p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors ${
            openMenuCol === col ? 'bg-gray-200 text-gray-600' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {openMenuCol === col && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col text-sm text-gray-700 animate-in fade-in zoom-in duration-100"
        >
          <button
            onClick={() => {
              setRenamingCol(col);
              setOpenMenuCol(null);
            }}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <Edit size={14} className="text-gray-400" /> Rename
          </button>

          <div className="h-px bg-gray-100 my-1"></div>
          <div className="px-4 py-1 text-xs font-semibold text-gray-400">Data Type</div>

          <button
            onClick={() => handleTypeChange(col, 'text')}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-left"
          >
            <span className="flex items-center gap-2">
              <Type size={14} className="text-gray-400" /> Text
            </span>
            {(!columnType || columnType === 'text') && (
              <Check size={14} className="text-brand-600" />
            )}
          </button>
          <button
            onClick={() => handleTypeChange(col, 'number')}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-left"
          >
            <span className="flex items-center gap-2">
              <Hash size={14} className="text-blue-500" /> Number
            </span>
            {columnType === 'number' && <Check size={14} className="text-brand-600" />}
          </button>
          <button
            onClick={() => handleTypeChange(col, 'date')}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-left"
          >
            <span className="flex items-center gap-2">
              <Calendar size={14} className="text-purple-500" /> Date
            </span>
            {columnType === 'date' && <Check size={14} className="text-brand-600" />}
          </button>

          <div className="h-px bg-gray-100 my-1"></div>

          <button
            onClick={() => deleteColumn(col)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 text-left"
          >
            <Trash2 size={14} /> Delete Column
          </button>
        </div>
      )}
    </div>
  );
};

export default ColumnHeader;
