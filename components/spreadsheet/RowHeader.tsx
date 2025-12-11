import React from 'react';
import { Trash2 } from 'lucide-react';

interface RowHeaderProps {
  rowIndex: number;
  deleteRow: (index: number) => void;
}

const RowHeader: React.FC<RowHeaderProps> = ({ rowIndex, deleteRow }) => {
  return (
    <td className="p-2 border-b border-r border-gray-100 text-center text-xs text-gray-400 font-mono bg-gray-50 group-hover:bg-gray-100 relative sticky left-0 z-10">
      <div className="flex items-center justify-center group-hover:hidden">{rowIndex + 1}</div>
      <button
        onClick={() => deleteRow(rowIndex)}
        className="hidden group-hover:flex absolute inset-0 items-center justify-center text-red-400 hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </td>
  );
};

export default RowHeader;
