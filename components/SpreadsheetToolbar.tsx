import React, { Dispatch, SetStateAction, RefObject, useState } from 'react';
import { FormattingRule } from '../types';
import { Undo, Redo, Search, ChevronDown, ChevronUp, X, Sigma } from 'lucide-react';
import FileMenu from './spreadsheet/FileMenu';
import FormattingModal from './spreadsheet/FormattingModal';
import FormulaHelp from './spreadsheet/FormulaHelp';

interface SpreadsheetToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  fileInputRef: RefObject<HTMLInputElement>;
  fileMenuRef: RefObject<HTMLDivElement>;
  isFileMenuOpen: boolean;
  setIsFileMenuOpen: (open: boolean) => void;
  handleExportCSV: () => void;
  handleExportTSV: () => void;
   handleExportHTML: () => void;
  handleExportPDF: () => void;
  handleExportORC: () => void;
  handleExportFeather: () => void;
  handleExportXLS: () => void;
  handleExportXLSX: () => void;
  handleExportODS: () => void;
  handleExportJSON: () => void;
  handleExportJSONL: () => void;
  handleExportAvroJson: () => void;
  handleExportAvro: () => void;
  handleExportSQLite: () => void;
  handleExportSQL: () => void;
  handleExportParquet: () => void;

  isFormattingModalOpen: boolean;
  setIsFormattingModalOpen: (open: boolean) => void;
  dataColumns: string[];
  formattingRules: FormattingRule[];
  newRule: Partial<FormattingRule>;
  setNewRule: Dispatch<SetStateAction<Partial<FormattingRule>>>;
  addRule: () => void;
  removeRule: (id: string) => void;

  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;

  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResultsCount: number;
  currentMatchIndex: number;
  prevMatch: () => void;
  nextMatch: () => void;
  onRunAnomalyDetection: (options: {
    method: 'zscore' | 'iqr';
    columns?: string[];
    action?: 'highlight' | 'replace_mean' | 'replace_median' | 'replace_mode' | 'delete_rows';
  }) => void;
}

const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  fileInputRef,
  fileMenuRef,
  isFileMenuOpen,
  setIsFileMenuOpen,
  handleExportCSV,
  handleExportTSV,
  handleExportHTML,
  handleExportPDF,
  handleExportORC,
  handleExportFeather,
  handleExportXLS,
  handleExportXLSX,
  handleExportODS,
  handleExportJSON,
  handleExportJSONL,
  handleExportAvroJson,
  handleExportAvro,
  handleExportSQLite,
  handleExportSQL,
  handleExportParquet,
  isFormattingModalOpen,
  setIsFormattingModalOpen,
  dataColumns,
  formattingRules,
  newRule,
  setNewRule,
  addRule,
  removeRule,
  isHelpOpen,
  setIsHelpOpen,
  searchTerm,
  setSearchTerm,
  searchResultsCount,
  currentMatchIndex,
  prevMatch,
  nextMatch,
  onRunAnomalyDetection,
}) => {
  const [isAnomalyPanelOpen, setIsAnomalyPanelOpen] = useState(false);
  const [anomalyMethod, setAnomalyMethod] = useState<'zscore' | 'iqr'>('zscore');
  const [anomalyScope, setAnomalyScope] = useState<'all' | 'selected'>('all');
  const [anomalySelectedCols, setAnomalySelectedCols] = useState<string[]>([]);
  const [anomalyAction, setAnomalyAction] = useState<
    'highlight' | 'replace_mean' | 'replace_median' | 'replace_mode' | 'delete_rows'
  >('highlight');

  const toggleAnomalyColumn = (col: string) => {
    setAnomalySelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-2">
          {/* Undo/Redo Buttons */}
          <div className="flex items-center bg-gray-100 rounded-md p-0.5 border border-gray-200 mr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* File Menu (Import/Export) */}
          <FileMenu
            fileInputRef={fileInputRef}
            fileMenuRef={fileMenuRef}
            isOpen={isFileMenuOpen}
            setIsOpen={setIsFileMenuOpen}
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
          />

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* Formatting Button */}
          <FormattingModal
            isOpen={isFormattingModalOpen}
            setIsOpen={setIsFormattingModalOpen}
            dataColumns={dataColumns}
            formattingRules={formattingRules || []}
            newRule={newRule}
            setNewRule={setNewRule}
            addRule={addRule}
            removeRule={removeRule}
          />

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* Formula Help Button */}
          <FormulaHelp isOpen={isHelpOpen} setIsOpen={setIsHelpOpen} />

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* Anomaly Detection Button & Panel */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAnomalyPanelOpen((open) => !open)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 shadow-sm"
            >
              <Sigma size={14} className="text-red-500" />
              <span>Anomaly Detection</span>
            </button>

            {isAnomalyPanelOpen && (
              <div className="absolute z-30 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg p-3 right-0">
                <div className="text-xs font-semibold text-gray-700 mb-2">Detection Method</div>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setAnomalyMethod('zscore')}
                    className={`flex-1 px-2 py-1 text-[11px] rounded border ${
                      anomalyMethod === 'zscore'
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    Z-Score
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnomalyMethod('iqr')}
                    className={`flex-1 px-2 py-1 text-[11px] rounded border ${
                      anomalyMethod === 'iqr'
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    IQR
                  </button>
                </div>

                <div className="text-xs font-semibold text-gray-700 mb-1">Data Scope</div>
                <div className="flex flex-col gap-1 mb-2 text-xs text-gray-700">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyScope === 'all'}
                      onChange={() => setAnomalyScope('all')}
                    />
                    <span>All numeric columns</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyScope === 'selected'}
                      onChange={() => setAnomalyScope('selected')}
                    />
                    <span>Select specific columns</span>
                  </label>
                </div>

                {anomalyScope === 'selected' && (
                  <div className="max-h-32 overflow-auto border border-gray-100 rounded p-1 mb-2 text-xs">
                    {dataColumns.map((col) => (
                      <label key={col} className="flex items-center gap-1 py-0.5">
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={anomalySelectedCols.includes(col)}
                          onChange={() => toggleAnomalyColumn(col)}
                        />
                        <span className="truncate">{col}</span>
                      </label>
                    ))}
                    {dataColumns.length === 0 && (
                      <div className="text-gray-400 text-[11px]">No columns available</div>
                    )}
                  </div>
                )}

                <div className="text-xs font-semibold text-gray-700 mb-1">Anomaly Handling</div>
                <div className="flex flex-col gap-1 mb-2 text-xs text-gray-700">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyAction === 'highlight'}
                      onChange={() => setAnomalyAction('highlight')}
                    />
                    <span>Highlight only</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyAction === 'replace_mean'}
                      onChange={() => setAnomalyAction('replace_mean')}
                    />
                    <span>Replace with mean</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyAction === 'replace_median'}
                      onChange={() => setAnomalyAction('replace_median')}
                    />
                    <span>Replace with median</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyAction === 'replace_mode'}
                      onChange={() => setAnomalyAction('replace_mode')}
                    />
                    <span>Replace with mode</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      className="h-3 w-3"
                      checked={anomalyAction === 'delete_rows'}
                      onChange={() => setAnomalyAction('delete_rows')}
                    />
                    <span>Delete rows with anomalies</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    className="px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                    onClick={() => setIsAnomalyPanelOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                    disabled={anomalyScope === 'selected' && anomalySelectedCols.length === 0}
                    onClick={() => {
                      const columns = anomalyScope === 'all' ? undefined : anomalySelectedCols;
                      onRunAnomalyDetection({ method: anomalyMethod, columns, action: anomalyAction });
                      setIsAnomalyPanelOpen(false);
                    }}
                  >
                    Run
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm ml-2">
          <Search size={14} className="text-gray-400" />
          <input
            className="text-sm outline-none w-24 sm:w-32 text-gray-700 placeholder:text-gray-400"
            placeholder="Find..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResultsCount > 0 && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap tabular-nums">
              {currentMatchIndex + 1} of {searchResultsCount}
            </span>
          )}
          <div className="flex flex-col border-l border-gray-100 pl-1 ml-1">
            <button
              onClick={prevMatch}
              disabled={searchResultsCount === 0}
              className="text-gray-500 hover:text-brand-600 disabled:opacity-30"
            >
              <ChevronUp size={10} />
            </button>
            <button
              onClick={nextMatch}
              disabled={searchResultsCount === 0}
              className="text-gray-500 hover:text-brand-600 disabled:opacity-30"
            >
              <ChevronDown size={10} />
            </button>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SpreadsheetToolbar;
