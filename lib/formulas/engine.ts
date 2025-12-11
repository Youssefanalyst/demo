import { RowData } from '../../types';

// Helper to evaluate formulas
export const evaluateFormula = (
  formula: string,
  data: RowData[],
  columns: string[]
): string | number => {
  try {
    const cleanFormula = formula.substring(1).toUpperCase(); // Remove '='
    
    // Basic safety: only allow simple math operators, parentheses, commas,
    // and cell/range references (letters/numbers). Block any other characters.
    const safeFormulaPattern = /^[0-9A-Z+\-*/(),:\s.]+$/;
    if (!safeFormulaPattern.test(cleanFormula)) {
      return "#ERROR";
    }

    // Helper: Format value for JS execution (Number or Quoted String)
    const formatValue = (val: string | number | undefined) => {
      if (val === '' || val === null || val === undefined) return 0;
      const num = Number(val);
      // If it matches a number exactly, return number, else return quoted string
      return isNaN(num) ? `"${String(val).replace(/"/g, '\\"')}"` : num;
    };

    // Replace Range references (e.g., B2:B5)
    // Matches: [Letter][Number]:[Letter][Number]
    const rangeRegex = /([A-Z]+)([0-9]+):([A-Z]+)([0-9]+)/g;
    
    const parsedWithRanges = cleanFormula.replace(rangeRegex, (match, startCol, startRow, endCol, endRow) => {
      const startColIndex = startCol.split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const endColIndex = endCol.split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const startRowIndex = parseInt(startRow) - 1; // 1-based to 0-based
      const endRowIndex = parseInt(endRow) - 1;

      const values = [] as (string | number)[];
      for (let r = startRowIndex; r <= endRowIndex; r++) {
        for (let c = startColIndex; c <= endColIndex; c++) {
          if (data[r] && columns[c]) {
            values.push(formatValue(data[r][columns[c]]));
          } else {
            values.push(0);
          }
        }
      }
      return values.join(',');
    });

    // Replace Cell references (e.g., A1, B2)
    // Matches: [Letter][Number]
    const cellRegex = /([A-Z]+)([0-9]+)/g;
    const parsedWithCells = parsedWithRanges.replace(cellRegex, (match, colLetter, rowNum) => {
      // Avoid replacing function names like SUM1 (unlikely but safe check)
      if (['SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'COUNT'].some(fn => match.startsWith(fn))) return match;

      const colIndex = colLetter.split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const rowIndex = parseInt(rowNum) - 1;
      
      if (data[rowIndex] && columns[colIndex]) {
        return String(formatValue(data[rowIndex][columns[colIndex]]));
      }
      return '0';
    });

    // Safe evaluation using Function
    // We define standard spreadsheet functions in the scope
    const evaluate = new Function('values', `
      // Helper to extract numbers only for math functions
      const getNumbers = (args) => args.flat().map(v => Number(v)).filter(v => !isNaN(v));

      const SUM = (...args) => getNumbers(args).reduce((a, b) => a + b, 0);
      const AVERAGE = (...args) => {
        const nums = getNumbers(args);
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      };
      const AVG = AVERAGE;
      const MIN = (...args) => {
         const nums = getNumbers(args);
         return nums.length ? Math.min(...nums) : 0;
      }
      const MAX = (...args) => {
         const nums = getNumbers(args);
         return nums.length ? Math.max(...nums) : 0;
      }
      const COUNT = (...args) => args.flat().length;
      
      try {
        return ${parsedWithCells};
      } catch(e) {
        return "#ERROR";
      }
    `);

    const result = evaluate();
    // Return string if result is string (e.g. text cell link), else number
    return isNaN(Number(result)) ? result : Number(result);
  } catch (e) {
    return "#ERROR";
  }
};
