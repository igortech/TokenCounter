import React, { useState, useEffect } from 'react';
import { countTokens } from './lib/tokenCounter';
import { Hash, AlignLeft, Type, AlertCircle, RefreshCw, Play, CheckCircle2, XCircle, Sun, Moon, Monitor } from 'lucide-react';

const MODELS = [
  { provider: 'openai', id: 'gpt-5', name: 'GPT-5' },
  { provider: 'openai', id: 'o3', name: 'o3' },
  { provider: 'openai', id: 'gpt-4o', name: 'GPT-4o' },
  { provider: 'openai', id: 'gpt-4', name: 'GPT-4' },
  { provider: 'hf', id: 'Xenova/gemma-tokenizer', name: 'Gemma' },
  { provider: 'deepseek', id: 'deepseek-ai/deepseek-coder-6.7b-base', name: 'DeepSeek Coder / V2' },
  { provider: 'deepseek', id: 'deepseek-ai/deepseek-llm-7b-chat', name: 'DeepSeek LLM / V3' },
  { provider: 'meta', id: 'Xenova/llama3-tokenizer', name: 'Llama 3 / 3.1' },
  { provider: 'meta', id: 'Xenova/llama2-tokenizer', name: 'Llama 2' },
  { provider: 'hf', id: 'Xenova/mistral-tokenizer', name: 'Mistral 7B / Mixtral' },
  { provider: 'hf', id: 'Xenova/Qwen1.5-0.5B', name: 'Qwen 1.5 / 2.0' }
];

export default function App() {
  const [text, setText] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('gpt-5');
  const [results, setResults] = useState<Record<string, { count?: number, error?: string, calculating?: boolean }>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
        return saved || 'system';
      }
    } catch (e) {
      console.warn('LocalStorage access denied, defaulting to system theme');
    }
    return 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // Ignore storage errors
    }

    if (theme === 'system') {
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);
  
  // Automatic calculation for all models
  useEffect(() => {
    const calculateAll = async () => {
      if (!text.trim()) {
        setResults({});
        setIsCalculating(false);
        return;
      }
      
      setIsCalculating(true);
      
      // Initialize loading state
      const initial: Record<string, any> = {};
      MODELS.forEach(m => {
        initial[m.id] = { calculating: true };
      });
      setResults(initial);

      // Calculate sequentially to avoid browser lag
      for (const model of MODELS) {
        try {
          const result = await countTokens(text, model.provider, model.id);
          setResults(prev => ({
            ...prev,
            [model.id]: { count: result.count, calculating: false }
          }));
        } catch (err: any) {
          setResults(prev => ({
            ...prev,
            [model.id]: { error: err.message || "Error", calculating: false }
          }));
        }
      }
      setIsCalculating(false);
    };

    const timeoutId = setTimeout(() => {
      calculateAll();
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [text]);

  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];
  const selectedResult = results[selectedModelId];
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 lg:p-8 flex flex-col h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">TokenCounter</h1>
              <p className="text-sm text-neutral-500">2026 Edition</p>
            </div>
          </div>

          <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setTheme('light')}
              className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-2 rounded-lg transition-all ${theme === 'system' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              title="System Preference"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-neutral-800 text-indigo-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* Left Panel: Input */}
          <div className="lg:col-span-7 flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                <AlignLeft className="w-4 h-4" />
                Prompt Text
              </div>
              <button 
                onClick={() => setText('')}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your prompt here... (Tokens for all models calculated automatically)"
              className="flex-1 w-full bg-transparent p-6 resize-none outline-none text-neutral-800 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Right Panel: Results */}
          <div className="lg:col-span-5 flex flex-col gap-6 overflow-hidden">
            
            {/* Primary Result: Selected Model & Stats */}
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shrink-0 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
              
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{selectedModel.name}</h2>
                <div className="flex flex-col items-end gap-1 uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Type className="w-4 h-4" />
                    {charCount.toLocaleString()} chars
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <AlignLeft className="w-3 h-3" />
                    {wordCount.toLocaleString()} words
                  </div>
                </div>
              </div>
              
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {selectedResult?.calculating ? (
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    ) : (
                      selectedResult?.count?.toLocaleString() || '—'
                    )}
                  </span>
                  {!selectedResult?.calculating && <span className="text-neutral-500 mb-1">tokens</span>}
                </div>
                {isCalculating && (
                  <RefreshCw className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-spin mb-2" />
                )}
              </div>

              {selectedResult?.error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500/90 leading-relaxed">{selectedResult.error}</p>
                </div>
              )}
            </div>

            {/* Models List */}
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
              <div className="flex-1 overflow-y-auto p-2">
                <ul className="space-y-1">
                  {MODELS.map(model => {
                    const result = results[model.id];
                    const isSelected = model.id === selectedModelId;

                    return (
                      <li 
                        key={model.id} 
                        onClick={() => setSelectedModelId(model.id)}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30' 
                            : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 border border-transparent'
                        }`}
                      >
                        <span className={`text-sm font-medium ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {model.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {result?.calculating ? (
                            <RefreshCw className="w-4 h-4 text-neutral-400 dark:text-neutral-500 animate-spin" />
                          ) : result?.error ? (
                            <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400" title={result.error}>
                              <XCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className={`flex items-center gap-2 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-900 dark:text-white'}`}>
                              <span className="font-semibold">{result?.count?.toLocaleString() || '—'}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
