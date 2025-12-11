import React from 'react';
import { Sigma } from 'lucide-react';

interface FormulaBarProps {
  selectedCellLabel: string;
  hasSelectedCell: boolean;
  value: string;
  onChange: (value: string) => void;
  onInsertFormulaPrefix: () => void;
}

const FormulaBar: React.FC<FormulaBarProps> = ({
  selectedCellLabel,
  hasSelectedCell,
  value,
  onChange,
  onInsertFormulaPrefix,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b border-gray-200 text-sm">
      <div className="w-10 text-center font-semibold text-gray-500 font-mono text-xs">
        {selectedCellLabel}
      </div>
      <div className="h-5 w-px bg-gray-300 mx-1"></div>
      <button
        onClick={onInsertFormulaPrefix}
        disabled={!hasSelectedCell}
        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-brand-600 disabled:opacity-50"
        title="Insert Formula"
      >
        <Sigma size={16} />
      </button>
      <div className="h-5 w-px bg-gray-300 mx-1"></div>
      <input
        className="flex-1 outline-none text-gray-800 font-mono text-sm bg-transparent"
        placeholder={
          hasSelectedCell
            ? 'Enter value or formula (e.g. =SUM(A1:B5))'
            : 'Select a cell'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!hasSelectedCell}
        title="Start with '=' to write a formula. Supported: SUM, AVERAGE, MIN, MAX, COUNT"
      />
    </div>
  );
};

export default FormulaBar;
