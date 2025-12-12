import { SpreadsheetState, DashboardData, SheetAssistantResult } from '../types';
import { detectAnomalies } from '../lib/anomalyDetection';

export interface AISettings {
  apiKey: string;
  model: string;
}

type ChatMessageRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

interface WorkbookContext {
  activeSheetName: string;
  sheets: {
    name: string;
    columns: string[];
    columnTypes: Record<string, any>;
    rowCount: number;
  }[];
}

const buildAnomalySummary = (spreadsheet: SpreadsheetState): string => {
  try {
    const { anomalies, usedColumns } = detectAnomalies(spreadsheet);
    if (!anomalies || anomalies.length === 0) {
      return 'No anomalies detected in numeric columns (z-score method, threshold 3).';
    }

    const byColumn: Record<
      string,
      {
        count: number;
        samples: { rowIndex: number; value: number }[];
      }
    > = {};

    anomalies.forEach((a) => {
      const bucket = byColumn[a.column] || { count: 0, samples: [] };
      bucket.count += 1;
      if (bucket.samples.length < 5) {
        bucket.samples.push({ rowIndex: a.rowIndex, value: a.value });
      }
      byColumn[a.column] = bucket;
    });

    const lines: string[] = [];
    lines.push(
      `Total anomalies: ${anomalies.length} across ${usedColumns.length} numeric columns (z-score ≥ 3).`,
    );

    Object.entries(byColumn).forEach(([column, info]) => {
      const sampleText = info.samples
        .map((s) => `row ${s.rowIndex + 1} (value=${s.value})`)
        .join(', ');
      if (sampleText) {
        lines.push(`- ${column}: ${info.count} anomalies, e.g. ${sampleText}`);
      } else {
        lines.push(`- ${column}: ${info.count} anomalies`);
      }
    });

    return lines.join('\n');
  } catch {
    return '';
  }
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const extractContent = (message: any): string => {
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
};

const callOpenRouter = async (
  settings: AISettings,
  messages: ChatMessage[],
): Promise<string> => {
  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is missing');
  }
  if (!settings.model) {
    throw new Error('OpenRouter model is not set');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };

  if (typeof window !== 'undefined') {
    try {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Tahlel';
    } catch {
      
    }
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenRouter request failed: ${response.status} ${text}`);
  }

  const json: any = await response.json();
  const firstChoice = json.choices && json.choices[0];
  if (!firstChoice || !firstChoice.message) {
    throw new Error('No choices returned from OpenRouter');
  }

  const raw = extractContent(firstChoice.message);
  if (!raw) {
    throw new Error('Empty content returned from OpenRouter');
  }

  return raw;
};

export const analyzeDataWithOpenRouter = async (
  spreadsheet: SpreadsheetState,
  settings: AISettings,
  userQuery?: string,
): Promise<DashboardData> => {
  const dataSample = JSON.stringify(spreadsheet.data.slice(0, 50));
  const columns = JSON.stringify(spreadsheet.columns);
  const types = JSON.stringify(spreadsheet.columnTypes);
  const formulas = JSON.stringify(spreadsheet.formulas);
  const formattingRules = JSON.stringify(spreadsheet.formattingRules);

  const userPrompt = `
Data Columns: ${columns}
Column Types: ${types}
Formulas: ${formulas}
Formatting Rules: ${formattingRules}
Data Sample (up to 50 rows): ${dataSample}
`;

  const systemPrompt = `You are an expert Data Analyst and Business Intelligence specialist.
You will receive metadata about a spreadsheet and a sample of the rows.
${
    userQuery
      ? `User Request: "${userQuery}"`
      : 'Please analyze this data effectively for a business user.'
  }

Tasks:
1. Generate 3-5 key textual insights derived from the data patterns.
2. Suggest 2-4 charts that would best visualize the trends in this data.
3. Provide a brief summary of the dataset.

You must respond with JSON only, no extra text or markdown.
The JSON must match this TypeScript shape:
{
  "insights": string[],
  "summary": string,
  "charts": {
    "id": string,
    "title": string,
    "description"?: string,
    "type": "bar" | "line" | "area" | "pie" | "scatter" | "scatter3d",
    "xAxisKey": string,
    "dataKeys": string[],
    "zAxisKey"?: string,
    "colors"?: string[]
  }[]
}

For charts, valid types are exactly: 'bar', 'line', 'area', 'pie', 'scatter', 'scatter3d'.
If using 'scatter3d', you must provide a 'zAxisKey'.
Ensure 'xAxisKey', 'dataKeys', and 'zAxisKey' exactly match the provided column names.
Return strictly valid JSON that can be parsed by JSON.parse.`;

  const raw = await callOpenRouter(settings, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const cleaned = raw.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed as DashboardData;
  } catch (error) {
    throw new Error('Failed to parse AI response as JSON');
  }
};

export const askCopilotWithOpenRouter = async (
  history: { role: 'user' | 'model'; content: string }[],
  contextData: SpreadsheetState,
  settings: AISettings,
  workbookContext?: WorkbookContext,
): Promise<string> => {
  let context = `Current Dataset Context:
Columns: ${JSON.stringify(contextData.columns)}
Types: ${JSON.stringify(contextData.columnTypes)}
Formulas: ${JSON.stringify(contextData.formulas)}
Formatting Rules: ${JSON.stringify(contextData.formattingRules)}
Data (first 10 rows): ${JSON.stringify(contextData.data.slice(0, 10))}`;

  const anomalySummary = buildAnomalySummary(contextData);
  if (anomalySummary) {
    context += `\n\nAnomaly detection summary for the active sheet (computed with z-score method):\n${anomalySummary}`;
  }

  if (workbookContext && workbookContext.sheets.length > 0) {
    const sheetsSummary = workbookContext.sheets
      .map(
        (sheet, index) =>
          `Sheet ${index + 1} - ${sheet.name} (rows: ${sheet.rowCount})\n` +
          `Columns: ${JSON.stringify(sheet.columns)}\n` +
          `Types: ${JSON.stringify(sheet.columnTypes)}`,
      )
      .join('\n\n');

    context += `\n\nWorkbook Overview:\n${sheetsSummary}\n\nActive sheet: ${workbookContext.activeSheetName}`;
  }

  const systemPrompt = `You are Tahlel, a helpful data assistant.
You help users edit spreadsheets, understand formulas, and analyze data.
Keep answers concise and helpful.
Use this dataset context when answering:
${context}`;

  const hasUserMessage = history.some((m) => m.role === 'user');
  if (!hasUserMessage) {
    return 'Waiting for user input...';
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as ChatMessageRole,
      content: m.content,
    })),
  ];

  const raw = await callOpenRouter(settings, messages);

  return raw;
};

export const assistSpreadsheetWithOpenRouter = async (
  spreadsheet: SpreadsheetState,
  settings: AISettings,
  userInstruction: string,
  workbookContext?: WorkbookContext,
): Promise<SheetAssistantResult> => {
  const columns = spreadsheet.columns;
  const sampleRows = spreadsheet.data.slice(0, 20);

  const systemPrompt = `You are Tahlel, an AI assistant embedded inside a spreadsheet.
You receive the spreadsheet structure (column names, types, and sample rows) and a natural language command from the user.
Your job is to translate that command into concrete, safe edit operations on the spreadsheet.

You must respond with JSON only, no extra text or markdown.
The JSON must match exactly this TypeScript shape:
{
  "explanation": string;
  "operations": (
    | {
        "type": "update_cell";
        "target": {
          "rowIndex": number; // zero-based index into the data array
          "columnKey": string; // must be exactly one of the provided column names
        };
        "value": string | number;
      }
    | {
        "type": "run_anomaly_detection";
        "options"?: {
          "method"?: "zscore" | "iqr";
          "columns"?: string[];
          "action"?: "highlight" | "replace_mean" | "replace_median" | "replace_mode" | "delete_rows";
        };
      }
    | {
        "type": "add_rows";
        "count": number;
      }
  )[];
}

Notes:
- The user can refer to cells in A1 notation like "A5".
- Columns array is ordered; index 0 corresponds to column letter A, index 1 to B, etc.
- "A5" means: column index 0 (columns[0]) and the 5th row (rowIndex 4).
- If the user mentions column names directly (like "Total" or "Price"), prefer using those as columnKey.
- Never invent new column names; columnKey MUST always be one of: ${JSON.stringify(columns)}.
- Never invent rows beyond the current data length. Valid rowIndex is between 0 and data.length - 1.
- If the user asks for a calculation (e.g. "multiply A5 by 2"), compute the new value and return it as "value".
- If the instruction is ambiguous, do the safest, smallest change that clearly matches it.
- If the user asks you to highlight or select anomalous values without changing them, return a single 'run_anomaly_detection' operation with options.action = 'highlight' (or omit action, which defaults to highlight) instead of 'update_cell'.
- If the user asks you to automatically fix or treat anomalous values (for example, replace them with the column mean/median/mode, or delete rows containing anomalies), prefer returning a single 'run_anomaly_detection' operation with options.action set to 'replace_mean', 'replace_median', 'replace_mode', or 'delete_rows' instead of issuing many 'update_cell' operations.
 - If the user asks you to add N new empty rows (for example, "add 20000 empty rows"), prefer returning a single 'add_rows' operation with count = N instead of many separate edits.
- If you cannot determine any safe edit, return operations: [] and a brief explanation why.`;

  const anomalySummary = buildAnomalySummary(spreadsheet);

  let workbookSection = '';
  if (workbookContext && workbookContext.sheets.length > 0) {
    const sheetsSummary = workbookContext.sheets
      .map(
        (sheet, index) =>
          `Sheet ${index + 1} - ${sheet.name} (rows: ${sheet.rowCount})\n` +
          `Columns: ${JSON.stringify(sheet.columns)}`,
      )
      .join('\n\n');

    workbookSection = `\n\nWorkbook context (all sheets):\n${sheetsSummary}\n\nActive sheet for edits: ${workbookContext.activeSheetName}`;
  }

  const userPrompt = `Spreadsheet columns (in order): ${JSON.stringify(columns)}
Column types: ${JSON.stringify(spreadsheet.columnTypes)}
Current data sample (first rows): ${JSON.stringify(sampleRows)}${
    anomalySummary ? `\n\nAnomaly detection summary for this sheet (computed with z-score method):\n${anomalySummary}` : ''
  }${workbookSection}

User instruction:
"""${userInstruction}"""`;

  const raw = await callOpenRouter(settings, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const cleaned = raw.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed as SheetAssistantResult;
  } catch (error) {
    throw new Error('Failed to parse sheet assistant response as JSON');
  }
};
