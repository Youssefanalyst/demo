
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SpreadsheetState, DashboardData } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeData = async (
  spreadsheet: SpreadsheetState, 
  userQuery?: string
): Promise<DashboardData> => {
  const ai = getClient();
  const dataSample = JSON.stringify(spreadsheet.data.slice(0, 50)); // Send first 50 rows to avoid token limits if large
  const columns = JSON.stringify(spreadsheet.columns);
  const types = JSON.stringify(spreadsheet.columnTypes);
  const formulas = JSON.stringify(spreadsheet.formulas);
  const formattingRules = JSON.stringify(spreadsheet.formattingRules);

  const prompt = `
    You are an expert Data Analyst and Business Intelligence specialist.
    I will provide you with a dataset (columns and rows), formulas, and conditional formatting rules used.
    ${userQuery ? `User Request: "${userQuery}"` : "Please analyze this data effectively."}
    
    Tasks:
    1. Generate 3-5 key textual insights derived from the data patterns.
    2. Suggest 2-4 charts that would best visualize the trends in this data.
    3. Provide a brief summary of the dataset.

    Data Columns: ${columns}
    Column Types: ${types}
    Formulas: ${formulas}
    Formatting Rules: ${formattingRules}
    Data Sample: ${dataSample}

    Return the response strictly in JSON format matching the schema.
    For charts, valid types are: 'bar', 'line', 'area', 'pie', 'scatter', 'scatter3d'.
    If using 'scatter3d', you MUST provide a 'zAxisKey'.
    Ensure 'xAxisKey', 'dataKeys', and 'zAxisKey' exactly match the provided column names.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      insights: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of key textual insights about the data"
      },
      summary: {
        type: Type.STRING,
        description: "A brief summary paragraph of what the data represents"
      },
      charts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['bar', 'line', 'area', 'pie', 'scatter', 'scatter3d'] },
            xAxisKey: { type: Type.STRING },
            dataKeys: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            zAxisKey: { type: Type.STRING, nullable: true },
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["id", "title", "type", "xAxisKey", "dataKeys"]
        }
      }
    },
    required: ["insights", "charts", "summary"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as DashboardData;
  } catch (error) {
    console.error("Error analyzing data:", error);
    throw error;
  }
};

export const askCopilot = async (
  history: { role: 'user' | 'model'; content: string }[],
  contextData: SpreadsheetState
) => {
  const ai = getClient();
  const context = `
    Current Dataset Context:
    Columns: ${JSON.stringify(contextData.columns)}
    Types: ${JSON.stringify(contextData.columnTypes)}
    Formulas: ${JSON.stringify(contextData.formulas)}
    Formatting Rules: ${JSON.stringify(contextData.formattingRules)}
    Data (first 10 rows): ${JSON.stringify(contextData.data.slice(0, 10))}
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are Lumina, a helpful data assistant. 
      You help users edit spreadsheets, understand formulas, and analyze data. 
      Keep answers concise and helpful. 
      ${context}`
    }
  });

  // Replay history
  // Note: In a real app, we would persist the chat session properly using chat.history.
  // Here we just send the last message for simplicity or reconstruct if the API allows content array injection in create.
  // For this simplified implementation, we will just send the user's new message with the context injected in system instruction.
  
  const lastUserMessage = history[history.length - 1];
  if (lastUserMessage.role !== 'user') return "Waiting for user input...";

  const result = await chat.sendMessage({ message: lastUserMessage.content });
  return result.text;
};