import React, { Dispatch, SetStateAction } from 'react';
import { FormattingRule, ConditionOperator } from '../../types';
import { Palette, X, Trash2 } from 'lucide-react';

export interface FormattingModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dataColumns: string[];
  formattingRules: FormattingRule[];
  newRule: Partial<FormattingRule>;
  setNewRule: Dispatch<SetStateAction<Partial<FormattingRule>>>;
  addRule: () => void;
  removeRule: (id: string) => void;
}

const FormattingModal: React.FC<FormattingModalProps> = ({
  isOpen,
  setIsOpen,
  dataColumns,
  formattingRules,
  newRule,
  setNewRule,
  addRule,
  removeRule,
}) => {
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          isOpen ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Palette size={16} /> Conditional Formatting
      </button>

      {/* Rules Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[400px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Formatting Rules</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Add Rule Form */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4 space-y-3 border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="p-2 border border-gray-200 rounded text-sm"
                value={newRule.column || ''}
                onChange={(e) => setNewRule({ ...newRule, column: e.target.value })}
              >
                <option value="">Select Column</option>
                {dataColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="p-2 border border-gray-200 rounded text-sm"
                value={newRule.operator}
                onChange={(e) =>
                  setNewRule({ ...newRule, operator: e.target.value as ConditionOperator })
                }
              >
                <option value="gt">Greater Than</option>
                <option value="lt">Less Than</option>
                <option value="eq">Equals</option>
                <option value="neq">Not Equals</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Value"
                className="p-2 border border-gray-200 rounded text-sm w-full"
                value={newRule.value || ''}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
              />
              <select
                className="p-2 border border-gray-200 rounded text-sm"
                value={newRule.stylePreset}
                onChange={(e) =>
                  setNewRule({ ...newRule, stylePreset: e.target.value as any })
                }
              >
                <option value="success">Green (Success)</option>
                <option value="danger">Red (Error)</option>
                <option value="warning">Yellow (Warning)</option>
                <option value="info">Blue (Info)</option>
                <option value="bold">Bold Text</option>
                <option value="highlight">Purple Highlight</option>
              </select>
            </div>
            <button
              onClick={addRule}
              disabled={!newRule.column || !newRule.value}
              className="w-full py-1.5 bg-brand-600 text-white rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              Add Rule
            </button>
          </div>

          {/* Rule List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(formattingRules || []).length === 0 && (
              <p className="text-xs text-center text-gray-400">No rules active.</p>
            )}
            {(formattingRules || []).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded shadow-sm text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-800">{rule.column}</span>
                  <span className="text-xs text-gray-500">
                    {rule.operator} {rule.value}
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide
                          ${rule.stylePreset === 'success' ? 'bg-green-100 text-green-800' : ''}
                          ${rule.stylePreset === 'danger' ? 'bg-red-100 text-red-800' : ''}
                          ${rule.stylePreset === 'warning' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${rule.stylePreset === 'info' ? 'bg-blue-100 text-blue-800' : ''}
                          ${rule.stylePreset === 'highlight' ? 'bg-purple-100 text-purple-800' : ''}
                          ${rule.stylePreset === 'bold' ? 'bg-gray-100 text-gray-800 font-bold' : ''}
                      `}
                    >
                      {rule.stylePreset}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormattingModal;
