import React, { useState, useEffect, useRef } from 'react';
import { countTokens } from './lib/tokenCounter';
import { optimize, OptimizeResult } from './lib/token-optimizer-ru';
import { Hash, AlignLeft, Type, AlertCircle, RefreshCw, Play, CheckCircle2, XCircle, Sun, Moon, Monitor, Wand2, Settings2 } from 'lucide-react';
import { diffWordsWithSpace } from 'diff';

const MODELS = [
  { provider: 'openai', id: 'gpt-5', name: 'GPT-5 / 4o / o3' },
  { provider: 'openai', id: 'gpt-4', name: 'GPT-4' },
  { provider: 'hf', id: 'Xenova/gemma-tokenizer', name: 'Gemini 2.5 / 2.0 / 1.5 / Gemma' },
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
  const [results, setResults] = useState<Record<string, { count?: number, error?: string, calculating?: boolean, tokens?: { id: number, text: string }[] }>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [optModalOpen, setOptModalOpen] = useState(false);
  const [pendingOptResult, setPendingOptResult] = useState<OptimizeResult | null>(null);
  
  const [optConfig, setOptConfig] = useState({
    protectQuotes: true,
    vvodnie: true,
    kancelaria: true,
    pleonazm: true,
    passiv: true,
    biznes: false, // Default off for prompts
    coach: false,  // Default off for prompts
    razgovor: false,
    minifyJson: false,
    stripHtml: false,
    stripMarkdown: false,
    rewriteUrls: false,
    dedupeLines: false,
    compactLists: false,
    squeezePunctuation: false,
    compactKeyValue: false,
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {    try {
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
  
  // Live update optimization when settings change
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (optModalOpen) {
        const optResult = optimize(text, { model: 'both', ...optConfig });
        
        // Calculate real tokens for accurate stats
        try {
          const model = MODELS.find(m => m.id === selectedModelId) || MODELS[0];
          const [before, after] = await Promise.all([
            countTokens(text, model.provider, model.id),
            countTokens(optResult.text, model.provider, model.id)
          ]);
          
          if (!active) return;
          
          const saved = before.count - after.count;
          const savedPct = before.count > 0 ? Math.round(saved / before.count * 100) : 0;
          
          setPendingOptResult({
            ...optResult,
            tokensBefore: before.count,
            tokensAfter: after.count,
            saved,
            savedPct
          });
        } catch (e) {
          if (!active) return;
          setPendingOptResult(optResult);
        }
      }
    };
    
    run();
    return () => { active = false; };
  }, [optConfig, optModalOpen, text]);

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
            [model.id]: { count: result.count, tokens: result.tokens, calculating: false }
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

  const TOKEN_COLORS = [
    'bg-blue-200/60 dark:bg-blue-500/30 text-blue-900 dark:text-blue-100',
    'bg-emerald-200/60 dark:bg-emerald-500/30 text-emerald-900 dark:text-emerald-100',
    'bg-amber-200/60 dark:bg-amber-500/30 text-amber-900 dark:text-amber-100',
    'bg-purple-200/60 dark:bg-purple-500/30 text-purple-900 dark:text-purple-100',
    'bg-pink-200/60 dark:bg-pink-500/30 text-pink-900 dark:text-pink-100',
  ];

  const formatTokenText = (str: string) => {
    // Replace common tokenizer special characters with standard equivalents for display
    return str.replace(/ /g, ' ').replace(/Ġ/g, ' ').replace(/Ċ/g, '\n');
  };

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
              <h1 className="text-xl font-semibold tracking-tight">Tokenizer</h1>
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
          
          {/* Left Panel: Input & Visualizer */}
          <div className="lg:col-span-7 flex flex-col gap-6 min-h-0">
            {/* Text Input */}
            <div className="flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex-1 min-h-[200px]">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/50 shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  <AlignLeft className="w-4 h-4" />
                  Prompt Text
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (!text.trim()) return;
                      setPendingOptResult(optimize(text, { model: 'both', ...optConfig }));
                      setOptModalOpen(true);
                    }}
                    className="text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer font-medium bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1.5 rounded-md"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Optimize
                  </button>
                  <button 
                    onClick={() => setText('')}
                    className="text-xs text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors cursor-pointer px-2 py-1.5"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your prompt here... (Tokens for all models calculated automatically)"
                className="flex-1 w-full bg-transparent p-6 resize-none outline-none text-neutral-800 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Token Visualizer */}
            {selectedResult?.tokens && selectedResult.tokens.length > 0 && (
              <div className="flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex-1 min-h-[200px]">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-neutral-100/50 dark:bg-neutral-900/50 shrink-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    <Type className="w-4 h-4" />
                    Token Breakdown ({selectedModel.name})
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {selectedResult.tokens.map((token, idx) => (
                    <span 
                      key={idx} 
                      className={`inline px-[1px] py-[2px] rounded-sm ${TOKEN_COLORS[idx % TOKEN_COLORS.length]}`}
                      title={`Token ID: ${token.id}`}
                    >
                      {formatTokenText(token.text)}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

      {/* Optimization Modal */}
      {optModalOpen && pendingOptResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Wand2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold">Optimization Results</h2>
              </div>
              <button onClick={() => setOptModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-hidden flex-1 flex flex-col md:flex-row">
              {/* Left: Diff View */}
              <div className="flex-1 p-6 overflow-y-auto bg-neutral-50 dark:bg-neutral-950/50">
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed font-mono break-words">
                  {diffWordsWithSpace(text, pendingOptResult.text).map((part, i) => {
                    if (part.added) return <span key={i} className="bg-emerald-200/60 dark:bg-emerald-500/40 text-emerald-950 dark:text-emerald-50 rounded-sm px-0.5 mx-0.5">{part.value}</span>;
                    if (part.removed) return <span key={i} className="bg-red-200/60 dark:bg-red-500/40 text-red-950 dark:text-red-50 line-through rounded-sm opacity-70 px-0.5 mx-0.5">{part.value}</span>;
                    return <span key={i} className="text-neutral-700 dark:text-neutral-300">{part.value}</span>;
                  })}
                </div>
              </div>

              {/* Right: Settings & Stats */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 overflow-y-auto flex flex-col gap-6 shrink-0">
                {/* Stats */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-sm">Saved {pendingOptResult.saved} tokens ({pendingOptResult.savedPct}%)</span>
                  </div>
                  
                  {pendingOptResult.appliedRules.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {pendingOptResult.appliedRules.map((rule, idx) => (
                        <span key={idx} className="text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700">
                          {rule}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500">No specific rules applied.</span>
                  )}
                </div>

                <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full"></div>

                {/* Settings */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Настройки
                  </h3>
                  <div className="space-y-4">
                    {/* Смысл */}
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-2">Текст и смысл</div>
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.protectQuotes} onChange={e => setOptConfig({...optConfig, protectQuotes: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🛡️ Защищать кавычки</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.vvodnie} onChange={e => setOptConfig({...optConfig, vvodnie: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🗑️ Вводные слова</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.kancelaria} onChange={e => setOptConfig({...optConfig, kancelaria: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🏢 Канцелярит</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.pleonazm} onChange={e => setOptConfig({...optConfig, pleonazm: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">♻️ Плеоназмы</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.passiv} onChange={e => setOptConfig({...optConfig, passiv: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🔄 Пассив в актив</span>
                        </label>
                      </div>
                    </div>

                    {/* Форматирование */}
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-2">Форматирование</div>
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.stripHtml} onChange={e => setOptConfig({...optConfig, stripHtml: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🌐 Удалить HTML</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.stripMarkdown} onChange={e => setOptConfig({...optConfig, stripMarkdown: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">📝 Упростить Markdown</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.rewriteUrls} onChange={e => setOptConfig({...optConfig, rewriteUrls: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🔗 Сократить URL</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.dedupeLines} onChange={e => setOptConfig({...optConfig, dedupeLines: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">📑 Удалить дубли строк</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.compactLists} onChange={e => setOptConfig({...optConfig, compactLists: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">📋 Сжать списки</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.squeezePunctuation} onChange={e => setOptConfig({...optConfig, squeezePunctuation: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">!! Сжать пунктуацию</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.compactKeyValue} onChange={e => setOptConfig({...optConfig, compactKeyValue: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🏷️ Сжать key: value</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Опасно */}
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-500 mb-2">Опасно для промптов</div>
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.biznes} onChange={e => setOptConfig({...optConfig, biznes: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">👔 Деловые клише</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.coach} onChange={e => setOptConfig({...optConfig, coach: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🧘 Коучинг / Продажи</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.razgovor} onChange={e => setOptConfig({...optConfig, razgovor: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">📢 Разговорные</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setOptModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setText(pendingOptResult.text);
                  setOptModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
