import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { AISettings } from '../services/openRouterService';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
}

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AISettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Settings</h2>
              <p className="text-xs text-gray-500">Configure OpenRouter API key and model used for dashboards and copilot.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">OpenRouter API Key</label>
            <input
              type="password"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              placeholder="sk-or-..."
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
            />
            <p className="text-[11px] text-gray-500">
              Stored locally in your browser (localStorage). Not sent anywhere except directly to OpenRouter.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Model ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              placeholder="e.g. openai/gpt-4.1-mini or anthropic/claude-3.7-sonnet"
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
            />
            <p className="text-[11px] text-gray-500">
              Paste any valid OpenRouter model name. You can change this at any time.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!localSettings.apiKey || !localSettings.model}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 disabled:hover:bg-brand-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;
