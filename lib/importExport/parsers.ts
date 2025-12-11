import { RowData } from '../../types';
import * as XLSX from 'xlsx';

export const importDataFromFile = (
  file: File,
  finalizeImport: (headers: string[], rows: RowData[]) => void
) => {
  // ORC Import Handler (via backend)
  if (file.name.toLowerCase().endsWith('.orc')) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:8000/orc/import', {
      method: 'POST',
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('ORC import failed');
        }
        const json = await res.json();
        const columns = (json.columns || []) as string[];
        const rows = (json.rows || []) as RowData[];
        finalizeImport(columns, rows);
      })
      .catch((error) => {
        console.error('ORC import failed', error);
        alert('Failed to parse ORC file via backend. Is the ORC server running?');
      });

    return;
  }

  // Parquet Import Handler
  if (file.name.toLowerCase().endsWith('.parquet')) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer | null;
        if (!arrayBuffer) {
          alert('Failed to read Parquet file.');
          return;
        }

        // Load parquet-wasm and apache-arrow from CDN dynamically
        const parquet: any = await import(
          'https://cdn.jsdelivr.net/npm/parquet-wasm@0.6.1/esm/+esm'
        );
        await parquet.default();
        const arrow: any = await import(
          'https://cdn.jsdelivr.net/npm/apache-arrow@14.0.2/+esm'
        );

        const parquetUint8 = new Uint8Array(arrayBuffer);
        const wasmTable = parquet.readParquet(parquetUint8);
        const arrowTable = arrow.tableFromIPC(wasmTable.intoIPCStream());

        const headers: string[] = arrowTable.schema.fields.map(
          (field: any) => field.name as string,
        );
        const rows: RowData[] = [];

        for (let rowIndex = 0; rowIndex < arrowTable.numRows; rowIndex++) {
          const row: RowData = {};
          headers.forEach((header, colIndex) => {
            const column = arrowTable.getChildAt(colIndex) as any;
            row[header] = column ? column.get(rowIndex) : null;
          });
          rows.push(row);
        }

        if (typeof wasmTable.drop === 'function') {
          wasmTable.drop();
        }

        finalizeImport(headers, rows);
      } catch (error) {
        console.error('Parquet import failed', error);
        alert('Failed to parse Parquet file.');
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // Feather / Arrow IPC Import Handler
  if (
    file.name.toLowerCase().endsWith('.feather') ||
    file.name.toLowerCase().endsWith('.arrow')
  ) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer | null;
        if (!arrayBuffer) {
          alert('Failed to read Feather/Arrow IPC file.');
          return;
        }

        const arrow: any = await import(
          'https://cdn.jsdelivr.net/npm/apache-arrow@14.0.2/+esm'
        );

        const table = arrow.tableFromIPC(new Uint8Array(arrayBuffer));
        const headers: string[] = table.schema.fields.map(
          (field: any) => field.name as string,
        );
        const rows: RowData[] = [];

        for (let rowIndex = 0; rowIndex < table.numRows; rowIndex++) {
          const row: RowData = {};
          headers.forEach((header, colIndex) => {
            const column = table.getChildAt(colIndex) as any;
            row[header] = column ? column.get(rowIndex) : null;
          });
          rows.push(row);
        }

        finalizeImport(headers, rows);
      } catch (error) {
        console.error('Feather/Arrow IPC import failed', error);
        alert('Failed to parse Feather/Arrow IPC file.');
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // SQL Script (.sql) Import Handler
  if (file.name.toLowerCase().endsWith('.sql')) {
      if (!(window as any).initSqlJs) {
           alert("SQL Engine not loaded yet.");
           return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
           try {
              const sqlContent = e.target?.result as string;
              const SQL = await (window as any).initSqlJs({
                  locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
              });
              const db = new SQL.Database();
              
              // Execute the SQL script
              db.run(sqlContent);
              
              // Find first user table created by the script
              const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
              if (tables.length === 0 || !tables[0].values.length) {
                  alert("No tables found in SQL file.");
                  return;
              }
              const tableName = tables[0].values[0][0];
              
              // Extract data
              const res = db.exec(`SELECT * FROM "${tableName}"`);
              if (res.length === 0) {
                   finalizeImport([], []); 
                   return;
              }
              
              const columns = res[0].columns;
              const rows = res[0].values.map((v: any[]) => {
                  const row: RowData = {};
                  columns.forEach((col: string, i: number) => row[col] = v[i]);
                  return row;
              });
              
              finalizeImport(columns, rows);
           } catch (error) {
               console.error("SQL Import Failed", error);
               alert("Failed to parse SQL file. Ensure it contains valid SQL statements.");
           }
      };
      reader.readAsText(file);
      return;
  }

  // SQLite Import Handler
  if (file.name.match(/\.(db|sqlite|sqlite3)$/i)) {
      if (!(window as any).initSqlJs) {
           alert("SQL Engine not loaded yet.");
           return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const SQL = await (window as any).initSqlJs({
                  locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
              });
              const Uints = new Uint8Array(e.target?.result as ArrayBuffer);
              const db = new SQL.Database(Uints);
              
              // Find first user table
              const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
              if (tables.length === 0 || !tables[0].values.length) {
                  alert("No valid tables found in database.");
                  return;
              }
              const tableName = tables[0].values[0][0];
              
              // Read all data
              const res = db.exec(`SELECT * FROM "${tableName}"`);
              if (res.length === 0) {
                   finalizeImport([], []); 
                   return;
              }
              
              const columns = res[0].columns;
              const rows = res[0].values.map((v: any[]) => {
                  const row: RowData = {};
                  columns.forEach((col: string, i: number) => row[col] = v[i]);
                  return row;
              });
              
              finalizeImport(columns, rows);
          } catch (error) {
              console.error("SQLite Import Failed", error);
              alert("Failed to parse SQLite database.");
          }
      }
      reader.readAsArrayBuffer(file);
      return;
  }

  // Avro Binary Import Handler (.avro)
  if (file.name.toLowerCase().endsWith('.avro')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const arrayBuffer = e.target?.result as ArrayBuffer | null;
              if (!arrayBuffer) {
                  alert('Failed to read Avro file.');
                  return;
              }

              const avroModule: any = await import('https://esm.sh/avro-js@1.11.0');
              const avro = avroModule.default || avroModule;

              const schema = {
                  type: 'record',
                  name: 'SpreadsheetExport',
                  fields: [
                      { name: 'columns', type: { type: 'array', items: 'string' } },
                      {
                          name: 'rows',
                          type: {
                              type: 'array',
                              items: {
                                  type: 'map',
                                  values: 'string',
                              },
                          },
                      },
                  ],
              };

              const type = avro.parse(schema);
              const uint8 = new Uint8Array(arrayBuffer);

              let decoded: any;
              try {
                  decoded = type.fromBuffer(uint8 as any);
              } catch (binaryError) {
                  // Fallback: try to interpret the file as JSON (for older .avro exports)
                  try {
                      const text = new TextDecoder('utf-8').decode(uint8);
                      const parsed = JSON.parse(text);

                      let headers: string[] = [];
                      let rows: RowData[] = [];

                      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                          if (Array.isArray(parsed.rows)) {
                              rows = parsed.rows as RowData[];
                          }
                          if (parsed.schema && Array.isArray(parsed.schema.fields)) {
                              headers = parsed.schema.fields
                                  .map((f: any) => f && typeof f.name === 'string' ? f.name : null)
                                  .filter((name: string | null): name is string => !!name);
                          }
                      } else if (Array.isArray(parsed)) {
                          rows = parsed as RowData[];
                      }

                      if (!headers.length && rows.length > 0) {
                          const allKeys = new Set<string>();
                          rows.forEach((row: any) => {
                              if (row && typeof row === 'object') {
                                  Object.keys(row).forEach(k => allKeys.add(k));
                              }
                          });
                          headers = Array.from(allKeys);
                      }

                      if (!headers.length) {
                          alert('Invalid Avro file: no columns detected.');
                          return;
                      }

                      finalizeImport(headers, rows || []);
                      return;
                  } catch (jsonFallbackError) {
                      console.error('Avro import JSON fallback failed', jsonFallbackError);
                      throw binaryError;
                  }
              }

              const columns = Array.isArray(decoded.columns) ? decoded.columns : [];
              const rawRows = Array.isArray(decoded.rows) ? decoded.rows as any[] : [];

              let headers = columns;
              if (!headers.length && rawRows.length > 0) {
                  const allKeys = new Set<string>();
                  rawRows.forEach((row: any) => {
                      if (row && typeof row === 'object') {
                          Object.keys(row).forEach(k => allKeys.add(k));
                      }
                  });
                  headers = Array.from(allKeys);
              }

              if (!headers.length) {
                  alert('Invalid Avro file: no columns detected.');
                  return;
              }

              const rows: RowData[] = rawRows.map((row: any) => {
                  const r: RowData = {};
                  headers.forEach((h) => {
                      if (row && Object.prototype.hasOwnProperty.call(row, h)) {
                          r[h] = row[h];
                      } else {
                          r[h] = '';
                      }
                  });
                  return r;
              });

              finalizeImport(headers, rows || []);
          } catch (error) {
              console.error('Avro binary import failed', error);
              alert('Failed to parse Avro file.');
          }
      };
      reader.readAsArrayBuffer(file);
      return;
  }

  // Avro (JSON-encoded) Import Handler for .avro.json
  // Expects either an object of shape { schema: { fields: [{ name: string }] }, rows: RowData[] }
  // or a plain array of objects (treated similarly to JSON import).
  if (file.name.toLowerCase().endsWith('.avro.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const parsed = JSON.parse(text);

              let headers: string[] = [];
              let rows: RowData[] = [];

              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  if (Array.isArray(parsed.rows)) {
                      rows = parsed.rows as RowData[];
                  }
                  if (parsed.schema && Array.isArray(parsed.schema.fields)) {
                      headers = parsed.schema.fields
                          .map((f: any) => f && typeof f.name === 'string' ? f.name : null)
                          .filter((name: string | null): name is string => !!name);
                  }
              } else if (Array.isArray(parsed)) {
                  rows = parsed as RowData[];
              }

              if (!headers.length && rows.length > 0) {
                  const allKeys = new Set<string>();
                  rows.forEach((row: any) => {
                      if (row && typeof row === 'object') {
                          Object.keys(row).forEach(k => allKeys.add(k));
                      }
                  });
                  headers = Array.from(allKeys);
              }

              if (!headers.length) {
                  alert('Invalid Avro JSON file: no columns detected.');
                  return;
              }

              finalizeImport(headers, rows || []);
          } catch (error) {
              console.error('Avro JSON import failed', error);
              alert('Failed to parse Avro JSON file.');
          }
      };
      reader.readAsText(file);
      return;
  }

  // JSONL / NDJSON Import Handler
  if (
    file.name.toLowerCase().endsWith('.jsonl') ||
    file.name.toLowerCase().endsWith('.ndjson')
  ) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (!lines.length) {
          finalizeImport([], []);
          return;
        }

        const rows: RowData[] = [];
        const allKeys = new Set<string>();

        lines.forEach((line) => {
          const parsed = JSON.parse(line);
          if (parsed && typeof parsed === 'object') {
            rows.push(parsed as RowData);
            Object.keys(parsed).forEach((k) => allKeys.add(k));
          }
        });

        const headers = Array.from(allKeys);
        finalizeImport(headers, rows);
      } catch (error) {
        console.error('JSONL Import failed', error);
        alert('Failed to parse JSONL/NDJSON file.');
      }
    };
    reader.readAsText(file);
    return;
  }

  // HTML Table Import Handler
  if (
    file.name.toLowerCase().endsWith('.html') ||
    file.name.toLowerCase().endsWith('.htm') ||
    file.type === 'text/html'
  ) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          finalizeImport([], []);
          return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const table = doc.querySelector('table');

        if (!table) {
          alert('No <table> found in HTML file.');
          finalizeImport([], []);
          return;
        }

        let headerRow = table.querySelector('thead tr');
        if (!headerRow) {
          const firstRow = table.querySelector('tr');
          headerRow = firstRow;
        }

        if (!headerRow) {
          finalizeImport([], []);
          return;
        }

        const headerCells = Array.from(
          headerRow.querySelectorAll('th,td'),
        ) as HTMLElement[];

        const headers = headerCells.map((cell, idx) => {
          const textContent = cell.textContent?.trim() || '';
          return textContent || `Column ${idx + 1}`;
        });

        let dataRows = Array.from(table.querySelectorAll('tbody tr'));
        if (!dataRows.length) {
          dataRows = Array.from(table.querySelectorAll('tr')).filter(
            (tr) => tr !== headerRow,
          );
        }

        const rows: RowData[] = [];

        dataRows.forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td,th'));
          const values = cells.map((cell) => cell.textContent?.trim() || '');
          const isEmpty = values.every((v) => v === '');
          if (isEmpty) return;

          const row: RowData = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] ?? '';
          });
          rows.push(row);
        });

        finalizeImport(headers, rows);
      } catch (error) {
        console.error('HTML Import failed', error);
        alert('Failed to parse HTML file.');
      }
    };
    reader.readAsText(file);
    return;
  }

  // JSON Import Handler
  if (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const jsonData = JSON.parse(text);
              
              if (!Array.isArray(jsonData)) {
                  alert("Invalid JSON: Root must be an array of objects.");
                  return;
              }

              // Extract all unique keys from all objects to serve as headers
              const allKeys = new Set<string>();
              jsonData.forEach((row: any) => {
                  if (typeof row === 'object' && row !== null) {
                      Object.keys(row).forEach(k => allKeys.add(k));
                  }
              });
              
              const headers = Array.from(allKeys);
              const newData = jsonData as RowData[];
              
              finalizeImport(headers, newData);
          } catch (error) {
              console.error("JSON Import failed", error);
              alert("Failed to parse JSON file.");
          }
      };
      reader.readAsText(file);
      return;
  }

  // TSV Import Handler
  if (
    file.name.toLowerCase().endsWith('.tsv') ||
    file.type === 'text/tab-separated-values'
  ) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        finalizeImport([], []);
        return;
      }

      const lines = text.split(/\r?\n/);
      if (!lines.length) {
        finalizeImport([], []);
        return;
      }

      const headerLine = lines[0];
      const headers = headerLine.split('\t').map((h) => h.trim());
      const rows: RowData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const cells = line.split('\t');
        const isEmpty = cells.every((c) => c === '');
        if (isEmpty) continue;

        const row: RowData = {};
        headers.forEach((header, idx) => {
          row[header] = cells[idx] ?? '';
        });
        rows.push(row);
      }

      finalizeImport(headers, rows);
    };
    reader.readAsText(file);
    return;
  }

  // Excel/CSV Import Handler (Default)
  const reader = new FileReader();
  reader.onload = (e) => {
    const arrayBuffer = e.target?.result;
    if (!arrayBuffer) return;

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length === 0) return;

    const headers = (jsonData[0] || []).map(h => String(h).trim());
    const rowsRaw = jsonData.slice(1);

    const newData: RowData[] = [];

    // Parse data rows
    rowsRaw.forEach((rowArray) => {
        const row: RowData = {};
        headers.forEach((header, index) => {
            // SheetJS rowArray might be sparse or undefined
            let val = rowArray[index];
            if (val === undefined || val === null) val = '';
            row[header] = val;
        });
        newData.push(row);
    });

    finalizeImport(headers, newData);
  };
  reader.readAsArrayBuffer(file);
};
