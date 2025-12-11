
import React, { useState, useEffect } from 'react';
import { LayoutGrid, Table as TableIcon, Sparkles, MessageSquare, BarChart2, Settings } from 'lucide-react';
import Spreadsheet from './components/Spreadsheet';
import Dashboard from './components/Dashboard';
import ManualDashboard from './components/ManualDashboard';
import Copilot from './components/Copilot';
import { INITIAL_DATA } from './constants';
import { SpreadsheetState, DashboardData } from './types';
import AISettingsModal from './components/AISettingsModal';
import { analyzeDataWithOpenRouter, AISettings } from './services/openRouterService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'dashboard' | 'manual'>('data');
  // Replaced single data state with history stack
  const [history, setHistory] = useState<SpreadsheetState[]>([INITIAL_DATA]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [aiSettings, setAISettings] = useState<AISettings>({ apiKey: '', model: '' });

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('lumina_ai_settings');
      if (raw) {
        const parsed = JSON.parse(raw) as AISettings;
        if (parsed && typeof parsed.apiKey === 'string' && typeof parsed.model === 'string') {
          setAISettings(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load AI settings', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('lumina_ai_settings', JSON.stringify(aiSettings));
    } catch (error) {
      console.error('Failed to save AI settings', error);
    }
  }, [aiSettings]);

  // Derived current state
  const data = history[currentIndex];

  // Handle data changes by pushing to history
  const handleDataChange = (newData: SpreadsheetState) => {
    // Determine if the new state is actually different from the current state to prevent duplicates
    // For simplicity in this structure, we assume an update is always meaningful or handled by the child
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleGenerateDashboard = async () => {
    setActiveTab('dashboard');
    if (isGenerating) return;
    
    if (!aiSettings.apiKey || !aiSettings.model) {
      alert('Please configure your AI settings (OpenRouter API key and model) first.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await analyzeDataWithOpenRouter(data, aiSettings);
      setDashboardData(result);
    } catch (error) {
      console.error(error);
      alert('Failed to generate insights. Please check your AI settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateChartDescription = (chartId: string, newDescription: string) => {
    if (!dashboardData) return;
    
    setDashboardData({
      ...dashboardData,
      charts: dashboardData.charts.map(chart => 
        chart.id === chartId ? { ...chart, description: newDescription } : chart
      )
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2 rounded-lg shadow-sm">
            <LayoutGrid className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Lumina<span className="text-brand-600">BI</span></h1>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'data' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TableIcon size={16} /> Data Grid
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'manual' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart2 size={16} /> Manual Dashboard
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles size={16} className={activeTab === 'dashboard' ? 'text-brand-500' : ''} /> Dashboard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings size={16} /> AI Settings
          </button>
          <button 
             onClick={handleGenerateDashboard}
             className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
             <Sparkles size={16} /> Analyze
          </button>
          <button 
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`p-2.5 rounded-lg border transition-colors relative ${
              isCopilotOpen ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Toggle Copilot"
          >
            <MessageSquare size={20} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          {activeTab === 'data' ? (
            <div className="h-full p-6">
              <Spreadsheet 
                data={data} 
                onChange={handleDataChange}
                onUndo={undo}
                onRedo={redo}
                canUndo={currentIndex > 0}
                canRedo={currentIndex < history.length - 1}
              />
            </div>
          ) : activeTab === 'dashboard' ? (
            <Dashboard 
              data={dashboardData} 
              rawData={data.data} 
              isLoading={isGenerating} 
              onGenerate={handleGenerateDashboard}
              onUpdateDescription={handleUpdateChartDescription}
            />
          ) : (
            <ManualDashboard data={data} />
          )}
        </div>
        
        {/* Copilot Sidebar Overlay/Container */}
        <Copilot 
          isOpen={isCopilotOpen} 
          onClose={() => setIsCopilotOpen(false)} 
          data={data}
          onDataChange={handleDataChange}
          aiSettings={aiSettings}
        />
      </main>

      <AISettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={aiSettings}
        onSave={setAISettings}
      />
    </div>
  );
};

export default App;
