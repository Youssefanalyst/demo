import React, { RefObject } from 'react';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  FileJson,
  Database,
  FileCode,
  Package,
  ChevronDown,
} from 'lucide-react';

export interface FileMenuProps {
  fileInputRef: RefObject<HTMLInputElement>;
  fileMenuRef: RefObject<HTMLDivElement>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
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
}

const FileMenu: React.FC<FileMenuProps> = ({
  fileInputRef,
  fileMenuRef,
  isOpen,
  setIsOpen,
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
}) => {
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          isOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100'
        }`}
        title="File Options"
      >
        <FileSpreadsheet size={16} /> File <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          ref={fileMenuRef}
          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col text-sm text-gray-700 animate-in fade-in zoom-in duration-100"
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <Upload size={14} className="text-gray-400" /> Import File
          </button>
          <div className="h-px bg-gray-100 my-1"></div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileText size={14} className="text-gray-400" /> Export CSV
          </button>
          <button
            onClick={handleExportTSV}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileText size={14} className="text-gray-400" /> Export TSV
          </button>
          <button
            onClick={handleExportHTML}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileCode size={14} className="text-indigo-600" /> Export HTML
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileText size={14} className="text-red-600" /> Export PDF
          </button>
          <button
            onClick={handleExportORC}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <Package size={14} className="text-purple-600" /> Export ORC (.orc)
          </button>
          <button
            onClick={handleExportFeather}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <Package size={14} className="text-purple-600" /> Export Feather (.feather)
          </button>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileSpreadsheet size={14} className="text-green-600" /> Export Excel (.xlsx)
          </button>
          <button
            onClick={handleExportXLS}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileSpreadsheet size={14} className="text-blue-600" /> Export Excel 97-2003 (.xls)
          </button>
          <button
            onClick={handleExportODS}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Export ODS
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileJson size={14} className="text-yellow-600" /> Export JSON
          </button>
          <button
            onClick={handleExportJSONL}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileJson size={14} className="text-yellow-600" /> Export JSONL (.jsonl)
          </button>
          <button
            onClick={handleExportAvroJson}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileJson size={14} className="text-orange-600" /> Export Avro (.avro.json)
          </button>
          <button
            onClick={handleExportAvro}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileJson size={14} className="text-orange-600" /> Export Avro (.avro)
          </button>
          <button
            onClick={handleExportSQLite}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <Database size={14} className="text-blue-600" /> Export SQLite
          </button>
          <button
            onClick={handleExportSQL}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <FileCode size={14} className="text-indigo-600" /> Export SQL
          </button>
          <button
            onClick={handleExportParquet}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            <Package size={14} className="text-emerald-600" /> Export Parquet
          </button>
        </div>
      )}
    </div>
  );
};

export default FileMenu;
