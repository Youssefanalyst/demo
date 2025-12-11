import React from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface FormulaHelpProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const FormulaHelp: React.FC<FormulaHelpProps> = ({ isOpen, setIsOpen }) => {
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-md transition-colors ${
          isOpen ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
        title="Formula Help"
      >
        <HelpCircle size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm">Formula Guide</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="text-xs text-gray-600 space-y-2">
            <p>
              Start a cell with{' '}
              <code className="bg-gray-100 px-1 rounded border border-gray-200">=</code> to write a
              formula.
            </p>
            <div>
              <span className="font-medium text-gray-800">Direct Linking:</span>
              <p className="mt-1 text-gray-500">
                Use <code className="bg-gray-100 px-1 rounded">=A1</code> to link to another cell's
                value (text or number).
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-800">Supported Functions:</span>
              <ul className="list-disc list-inside mt-1 ml-1 space-y-1 text-gray-500">
                <li>SUM, AVERAGE, AVG</li>
                <li>MIN, MAX, COUNT</li>
              </ul>
            </div>
            <div>
              <span className="font-medium text-gray-800">Examples:</span>
              <ul className="mt-1 space-y-1 font-mono text-[10px] bg-gray-50 p-2 rounded border border-gray-100 text-blue-600">
                <li>=A1</li>
                <li>=SUM(A1:A5)</li>
                <li>=B2 * 1.2</li>
                <li>=AVERAGE(C1:C10) + 10</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaHelp;
