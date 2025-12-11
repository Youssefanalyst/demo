
import { SpreadsheetState } from './types';

export const INITIAL_DATA: SpreadsheetState = {
  columns: ['Month', 'Sales', 'Expenses', 'Profit', 'Region'],
  columnTypes: {
    'Month': 'text',
    'Sales': 'number',
    'Expenses': 'number',
    'Profit': 'number',
    'Region': 'text'
  },
  formulas: {},
  formattingRules: [
    {
      id: '1',
      column: 'Profit',
      operator: 'gt',
      value: '10000',
      stylePreset: 'success'
    },
    {
      id: '2',
      column: 'Expenses',
      operator: 'gt',
      value: '15000',
      stylePreset: 'danger'
    }
  ],
  data: [
    { Month: 'Jan', Sales: 12000, Expenses: 8000, Profit: 4000, Region: 'North' },
    { Month: 'Feb', Sales: 15000, Expenses: 9000, Profit: 6000, Region: 'North' },
    { Month: 'Mar', Sales: 18000, Expenses: 10000, Profit: 8000, Region: 'North' },
    { Month: 'Apr', Sales: 14000, Expenses: 8500, Profit: 5500, Region: 'South' },
    { Month: 'May', Sales: 22000, Expenses: 12000, Profit: 10000, Region: 'South' },
    { Month: 'Jun', Sales: 25000, Expenses: 13000, Profit: 12000, Region: 'South' },
    { Month: 'Jul', Sales: 24000, Expenses: 14000, Profit: 10000, Region: 'East' },
    { Month: 'Aug', Sales: 28000, Expenses: 15000, Profit: 13000, Region: 'East' },
    { Month: 'Sep', Sales: 32000, Expenses: 18000, Profit: 14000, Region: 'East' },
    { Month: 'Oct', Sales: 30000, Expenses: 16000, Profit: 14000, Region: 'West' },
    { Month: 'Nov', Sales: 35000, Expenses: 19000, Profit: 16000, Region: 'West' },
    { Month: 'Dec', Sales: 42000, Expenses: 22000, Profit: 20000, Region: 'West' },
  ]
};
