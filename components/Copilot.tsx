import React, { useState, useRef, useEffect } from 'react';
import { Message, SpreadsheetState, SheetAssistantResult } from '../types';
import { askCopilotWithOpenRouter, assistSpreadsheetWithOpenRouter, AISettings } from '../services/openRouterService';
import { evaluateFormula } from '../lib/formulas/engine';
import { Send, Bot, User, X } from 'lucide-react';

interface CopilotProps {
  data: SpreadsheetState;
  onDataChange: (newData: SpreadsheetState) => void;
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
}

const Copilot: React.FC<CopilotProps> = ({ data, onDataChange, isOpen, onClose, aiSettings }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: "Hi! I'm Lumina. I can help you analyze this spreadsheet, write formulas, or explain trends. What's on your mind?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const applyCellChange = (
    state: SpreadsheetState,
    rowIndex: number,
    column: string,
    value: string | number,
  ): SpreadsheetState => {
    if (!state.data[rowIndex]) return state;

    const newData = [...state.data];
    const newFormulas = { ...state.formulas };
    const formulaKey = `${rowIndex}-${column}`;

    let newValue: string | number = value;
    const type = state.columnTypes[column] || 'text';

    if (typeof value === 'string' && value.startsWith('=')) {
      newFormulas[formulaKey] = value;
      newValue = evaluateFormula(value, newData, state.columns);
    } else {
      if (newFormulas[formulaKey]) {
        delete newFormulas[formulaKey];
      }

      if (type === 'number') {
        if (value === '') {
          newValue = '';
        } else {
          const valueStr = String(value);
          const num = typeof value === 'number' ? value : parseFloat(valueStr);
          if (!isNaN(num) && !(typeof value === 'string' && valueStr.endsWith('.'))) {
            newValue = num;
          } else {
            newValue = value;
          }
        }
      }
    }

    newData[rowIndex] = {
      ...newData[rowIndex],
      [column]: newValue,
    };

    return {
      ...state,
      data: newData,
      formulas: newFormulas,
    };
  };

  const applySheetAssistantResult = (
    state: SpreadsheetState,
    result: SheetAssistantResult,
  ): SpreadsheetState => {
    let nextState = state;

    if (Array.isArray(result.operations)) {
      result.operations.forEach((op) => {
        if (op.type !== 'update_cell') return;
        const rowIndex = op.target?.rowIndex;
        const columnKey = op.target?.columnKey;
        if (
          typeof rowIndex === 'number' &&
          rowIndex >= 0 &&
          rowIndex < nextState.data.length &&
          typeof columnKey === 'string' &&
          nextState.columns.includes(columnKey)
        ) {
          nextState = applyCellChange(nextState, rowIndex, columnKey, op.value);
        }
      });
    }

    return nextState;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      if (!aiSettings.apiKey || !aiSettings.model) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: 'AI settings are not configured. Please set your OpenRouter API key and model from the AI Settings panel.',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, botMsg]);
        return;
      }

      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const response = await askCopilotWithOpenRouter(history, data, aiSettings);

      let reply = response || "I couldn't generate a response.";

      // Try to also interpret the message as a sheet-edit instruction
      try {
        const sheetResult = await assistSpreadsheetWithOpenRouter(data, aiSettings, userMsg.content);
        if (sheetResult && Array.isArray(sheetResult.operations) && sheetResult.operations.length > 0) {
          const updatedState = applySheetAssistantResult(data, sheetResult);
          if (updatedState !== data) {
            onDataChange(updatedState);
          }
          if (sheetResult.explanation) {
            reply = `${reply}\n\n${sheetResult.explanation}`;
          }
        }
      } catch (sheetError) {
        console.error('Sheet assistant inside Copilot failed', sheetError);
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Sorry, I encountered an error connecting to the AI service. Please check your API key.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="bg-brand-100 p-1.5 rounded-lg">
            <Bot size={20} className="text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-800">Lumina Assistant</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-br-none' 
                : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm"
            placeholder="Ask about your data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Copilot;
