import React, { Dispatch, SetStateAction, RefObject } from 'react';
import { FormattingRule } from '../types';
import { Undo, Redo, Search, ChevronDown, ChevronUp, X } from 'lucide-react';
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
}) => {
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
