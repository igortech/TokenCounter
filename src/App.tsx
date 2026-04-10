import React, { useState, useEffect, useRef } from 'react';
import { countTokens, releaseTiktoken } from './lib/tokenCounter';
import { optimize, OptimizeResult } from './lib/token-optimizer-ru';
import { Hash, AlignLeft, Type, AlertCircle, RefreshCw, Play, CheckCircle2, XCircle, Sun, Moon, Monitor, Wand2, Settings2, ArrowRight, ArrowLeft } from 'lucide-react';
import { diffWordsWithSpace } from 'diff';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';

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
  const [activeTab, setActiveTab] = useState<'editor' | 'tokens' | 'models'>('editor');
  const [slideDir, setSlideDir] = useState(1);
  const [modelChangedOnTab, setModelChangedOnTab] = useState(false);
  const [fabBottom, setFabBottom] = useState(112); // 112px = bottom-28 (increased from 96)

  useEffect(() => {
    if (!window.visualViewport) return;
    
    const initialHeight = window.innerHeight;
    
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      
      const layoutHeight = window.innerHeight;
      const visualHeight = viewport.height;
      const offsetTop = viewport.offsetTop;
      
      // Calculate how much is hidden by the keyboard
      const hiddenByVisualViewport = layoutHeight - (visualHeight + offsetTop);
      const hiddenByLayoutShrink = initialHeight - layoutHeight;
      
      const totalHidden = Math.max(hiddenByVisualViewport, hiddenByLayoutShrink);
      
      // If keyboard is open (totalHidden > 100), position FAB just above keyboard/nav
      if (totalHidden > 100) {
        if (hiddenByLayoutShrink > 100) {
          // On Android, layout shrinks, nav moves up. Position FAB above nav.
          setFabBottom(80); // 80px is roughly nav height (60px) + 20px margin
        } else {
          // On iOS, layout stays, keyboard covers bottom. Position FAB above keyboard.
          setFabBottom(hiddenByVisualViewport + 20);
        }
      } else {
        setFabBottom(112); // Default bottom-28
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  const changeTab = (newTab: 'editor' | 'tokens' | 'models') => {
    if (newTab === activeTab) return;
    const order = { editor: 0, tokens: 1, models: 2 };
    setSlideDir(order[newTab] > order[activeTab] ? 1 : -1);
    setActiveTab(newTab);
  };
  
  // Remove splash screen on mount
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
    }
  }, []);

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
    removeComments: false,
    removeEmoji: false,
    normalizeNumbers: false,
    removeArticles: false,
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Fake splash screen to allow UI to render instantly before heavy logic
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsReady(true);
      }, 100); // Small delay to ensure native splash transitions smoothly
    });
  }, []);

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
  
  useEffect(() => {
    if (activeTab !== 'models') {
      setModelChangedOnTab(false);
    }
  }, [activeTab]);

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

  const [needsAllModelsCalc, setNeedsAllModelsCalc] = useState(false);

  // 1. Mark all as calculating immediately when text changes
  useEffect(() => {
    if (!text.trim()) {
      setResults({});
      setNeedsAllModelsCalc(false);
      return;
    }
    
    setNeedsAllModelsCalc(true);
    setResults(prev => {
      const next = { ...prev };
      MODELS.forEach(m => {
        next[m.id] = { ...next[m.id], calculating: true };
      });
      return next;
    });
  }, [text]);

  // 2. Calculate selected model (debounced)
  useEffect(() => {
    if (!text.trim()) return;
    
    const calculateSelected = async () => {
      const model = MODELS.find(m => m.id === selectedModelId) || MODELS[0];
      try {
        const result = await countTokens(text, model.provider, model.id);
        setResults(prev => ({
          ...prev,
          [selectedModelId]: { count: result.count, tokens: result.tokens, calculating: false }
        }));
      } catch (err: any) {
        setResults(prev => ({
          ...prev,
          [selectedModelId]: { error: err.message || "Error", calculating: false }
        }));
      }
    };

    const timeoutId = setTimeout(() => {
      calculateSelected();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [text, selectedModelId]);

  // 3. Calculate all other models (debounced, only when visible)
  useEffect(() => {
    const isModelsVisible = activeTab === 'models' || (typeof window !== 'undefined' && window.innerWidth >= 1024);
    if (!isModelsVisible || !needsAllModelsCalc || !text.trim()) return;

    const calculateAll = async () => {
      // Calculate sequentially to avoid browser lag
      for (const model of MODELS) {
        if (model.id === selectedModelId) continue;
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
      setNeedsAllModelsCalc(false);
      
      // Free memory after calculating all models ONLY ON MOBILE
      if (Capacitor.isNativePlatform()) {
        releaseTiktoken();
      }
    };

    const timeoutId = setTimeout(() => {
      calculateAll();
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [text, activeTab, needsAllModelsCalc, selectedModelId]);

  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];
  const selectedResult = results[selectedModelId];
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const digitCount = (text.match(/\d/g) || []).length;
  const specialCount = (text.match(/[^a-zA-Z0-9\s\u0400-\u04FF]/g) || []).length;

  const OPT_GROUPS = {
    meaning: ['protectQuotes', 'vvodnie', 'kancelaria', 'pleonazm', 'passiv'],
    code: ['minifyJson', 'removeComments', 'normalizeNumbers', 'compactKeyValue'],
    formatting: ['stripHtml', 'stripMarkdown', 'rewriteUrls', 'dedupeLines', 'compactLists', 'squeezePunctuation', 'removeEmoji'],
    dangerous: ['biznes', 'coach', 'razgovor'],
    en: ['removeArticles']
  } as const;

  const toggleGroup = (group: keyof typeof OPT_GROUPS) => {
    const keys = OPT_GROUPS[group];
    const allChecked = keys.every(k => (optConfig as any)[k]);
    const newState = { ...optConfig };
    keys.forEach(k => {
      (newState as any)[k] = !allChecked;
    });
    setOptConfig(newState);
  };

  const isGroupChecked = (group: keyof typeof OPT_GROUPS) => {
    return OPT_GROUPS[group].every(k => (optConfig as any)[k]);
  };

  const isGroupIndeterminate = (group: keyof typeof OPT_GROUPS) => {
    const keys = OPT_GROUPS[group];
    const checkedCount = keys.filter(k => (optConfig as any)[k]).length;
    return checkedCount > 0 && checkedCount < keys.length;
  };

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

  if (!isReady) {
    return <div className="min-h-screen bg-white dark:bg-neutral-950"></div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-screen lg:h-screen">
        
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
        <motion.div 
          className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 pb-20 lg:pb-0 relative overflow-hidden"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {/* Left Panel: Input & Visualizer */}
            {(activeTab === 'editor' || activeTab === 'tokens' || window.innerWidth >= 1024) && (
              <motion.div 
                key={`left-panel-${activeTab}`}
                drag={typeof window !== 'undefined' && window.innerWidth < 1024 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -500 || offset.x < -50) {
                    if (activeTab === 'editor') changeTab('tokens');
                    else if (activeTab === 'tokens') changeTab('models');
                  } else if (swipe > 500 || offset.x > 50) {
                    if (activeTab === 'tokens') changeTab('editor');
                    else if (activeTab === 'models') changeTab('tokens');
                  }
                }}
                initial={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 0, x: slideDir > 0 ? 50 : -50 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 0, x: slideDir > 0 ? -50 : 50 } : false}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`lg:col-span-7 flex flex-col gap-6 min-h-0 ${activeTab === 'models' ? 'hidden lg:flex' : 'flex'} order-2 lg:order-1 w-full`}
              >
                {/* Text Input */}
                <div className={`flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex-1 min-h-[300px] lg:min-h-[200px] ${activeTab === 'tokens' ? 'hidden lg:flex' : 'flex'}`}>
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
                        className="flex text-xs items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer font-medium bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1.5 rounded-md"
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
                {(selectedResult?.tokens && selectedResult.tokens.length > 0) || selectedResult?.calculating ? (
                  <div className={`flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex-1 min-h-[300px] lg:min-h-[200px] ${activeTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-neutral-100/50 dark:bg-neutral-900/50 shrink-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        <Type className="w-4 h-4" />
                        Token Breakdown ({selectedModel.name})
                      </div>
                    </div>
                    {selectedResult?.calculating ? (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <RefreshCw className="w-6 h-6 text-neutral-400 dark:text-neutral-500 animate-spin" />
                      </div>
                    ) : (
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
                    )}
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Right Panel: Results */}
            {(activeTab === 'tokens' || activeTab === 'models' || window.innerWidth >= 1024) && (
              <motion.div 
                key={`right-panel-${activeTab}`}
                drag={typeof window !== 'undefined' && window.innerWidth < 1024 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -500 || offset.x < -50) {
                    if (activeTab === 'editor') changeTab('tokens');
                    else if (activeTab === 'tokens') changeTab('models');
                  } else if (swipe > 500 || offset.x > 50) {
                    if (activeTab === 'tokens') changeTab('editor');
                    else if (activeTab === 'models') changeTab('tokens');
                  }
                }}
                initial={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 0, x: slideDir > 0 ? 50 : -50 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 0, x: slideDir > 0 ? -50 : 50 } : false}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`lg:col-span-5 flex flex-col gap-6 lg:overflow-hidden ${activeTab === 'editor' ? 'hidden lg:flex' : 'flex'} order-1 lg:order-2 w-full`}
              >
                
                {/* Primary Result: Selected Model & Stats (Visible on Tokens tab on mobile) */}
                <div className={`bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 lg:p-5 shrink-0 relative overflow-hidden shadow-sm ${activeTab === 'tokens' ? 'block' : 'hidden lg:block'}`}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
                  
                  <div className="flex items-start justify-between mb-2 lg:mb-3">
                    <div>
                      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{selectedModel.name}</h2>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-4xl lg:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white leading-none">
                          {selectedResult?.calculating ? (
                            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                          ) : (
                            selectedResult?.count?.toLocaleString() || '—'
                          )}
                        </span>
                        {!selectedResult?.calculating && <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">tokens</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
                      <div className="flex items-center gap-1.5 text-xs lg:text-sm">
                        <Type className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        {charCount.toLocaleString()} chars
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] lg:text-[10px]">
                        <AlignLeft className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                        {wordCount.toLocaleString()} words
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] lg:text-[10px]">
                        <span className="font-bold">#</span>
                        {digitCount.toLocaleString()} digits
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] lg:text-[10px]">
                        <span className="font-bold">@</span>
                        {specialCount.toLocaleString()} symbols
                      </div>
                    </div>
                  </div>
                  
                  {isCalculating && !selectedResult?.calculating && (
                    <div className="absolute bottom-4 right-4">
                      <RefreshCw className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-spin" />
                    </div>
                  )}

                  {selectedResult?.error && (
                    <div className="mt-3 lg:mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-500/90 leading-relaxed">{selectedResult.error}</p>
                    </div>
                  )}
                </div>

                {/* Models List */}
                <div className={`bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col flex-1 min-h-[400px] lg:min-h-0 lg:overflow-hidden shadow-sm ${activeTab === 'models' ? 'flex' : 'hidden lg:flex'}`}>
                  <div className="flex-1 overflow-y-auto p-2">
                    <ul className="space-y-1">
                      {MODELS.map(model => {
                        const result = results[model.id];
                        const isSelected = model.id === selectedModelId;

                        return (
                          <li 
                            key={model.id} 
                            onClick={() => {
                              setSelectedModelId(model.id);
                              setModelChangedOnTab(true);
                            }}
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

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Mobile Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => changeTab('editor')} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'editor' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`}
          >
            <AlignLeft className="w-5 h-5" />
            <span className="text-[10px] font-medium">Editor</span>
          </button>
          <button 
            onClick={() => changeTab('tokens')} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tokens' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`}
          >
            <Type className="w-5 h-5" />
            <span className="text-[10px] font-medium">Tokens</span>
          </button>
          <button 
            onClick={() => changeTab('models')} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'models' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`}
          >
            <Hash className="w-5 h-5" />
            <span className="text-[10px] font-medium">Models</span>
          </button>
        </nav>

        {/* Floating Action Buttons (Mobile Only) */}
        {activeTab === 'editor' && text.trim() && (
          <button 
            onClick={() => changeTab('tokens')}
            style={{ bottom: `${fabBottom}px` }}
            className="lg:hidden fixed right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        )}

        {activeTab === 'models' && modelChangedOnTab && (
          <button 
            onClick={() => changeTab('tokens')}
            style={{ bottom: `${fabBottom}px` }}
            className="lg:hidden fixed left-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
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
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Left: Diff View */}
              <div className="flex-[2] p-6 overflow-y-auto bg-neutral-50 dark:bg-neutral-950/50 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800">
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed font-mono break-words">
                  {diffWordsWithSpace(text, pendingOptResult.text).map((part, i) => {
                    if (part.added) return <span key={i} className="bg-emerald-200/60 dark:bg-emerald-500/40 text-emerald-950 dark:text-emerald-50 rounded-sm px-0.5 mx-0.5">{part.value}</span>;
                    if (part.removed) return <span key={i} className="bg-red-200/60 dark:bg-red-500/40 text-red-950 dark:text-red-50 line-through rounded-sm opacity-70 px-0.5 mx-0.5">{part.value}</span>;
                    return <span key={i} className="text-neutral-700 dark:text-neutral-300">{part.value}</span>;
                  })}
                </div>
              </div>

              {/* Right: Settings & Stats */}
              <div className="flex-1 md:flex-none md:w-80 bg-white dark:bg-neutral-900 p-6 overflow-y-auto flex flex-col gap-6">
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
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isGroupChecked('meaning')}
                            ref={el => el && (el.indeterminate = isGroupIndeterminate('meaning'))}
                            onChange={() => toggleGroup('meaning')}
                            className="rounded text-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Текст и смысл</div>
                        </label>
                      </div>
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

                    {/* Код и данные */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isGroupChecked('code')}
                            ref={el => el && (el.indeterminate = isGroupIndeterminate('code'))}
                            onChange={() => toggleGroup('code')}
                            className="rounded text-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Код и данные</div>
                        </label>
                      </div>
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.minifyJson} onChange={e => setOptConfig({...optConfig, minifyJson: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">📦 Минифицировать JSON</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.removeComments} onChange={e => setOptConfig({...optConfig, removeComments: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">💬 Удалить комментарии</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.normalizeNumbers} onChange={e => setOptConfig({...optConfig, normalizeNumbers: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🔢 Нормализовать числа</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.compactKeyValue} onChange={e => setOptConfig({...optConfig, compactKeyValue: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🏷️ Сжать key: value</span>
                        </label>
                      </div>
                    </div>

                    {/* Форматирование */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isGroupChecked('formatting')}
                            ref={el => el && (el.indeterminate = isGroupIndeterminate('formatting'))}
                            onChange={() => toggleGroup('formatting')}
                            className="rounded text-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Форматирование</div>
                        </label>
                      </div>
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
                          <input type="checkbox" checked={optConfig.removeEmoji} onChange={e => setOptConfig({...optConfig, removeEmoji: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">✨ Удалить Emoji</span>
                        </label>
                      </div>
                    </div>

                    {/* Стиль (EN) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isGroupChecked('en')}
                            ref={el => el && (el.indeterminate = isGroupIndeterminate('en'))}
                            onChange={() => toggleGroup('en')}
                            className="rounded text-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Стиль (EN)</div>
                        </label>
                      </div>
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                          <input type="checkbox" checked={optConfig.removeArticles} onChange={e => setOptConfig({...optConfig, removeArticles: e.target.checked})} className="rounded text-indigo-500 w-4 h-4" />
                          <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">🅰️ Удалить артикли</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Опасно */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isGroupChecked('dangerous')}
                            ref={el => el && (el.indeterminate = isGroupIndeterminate('dangerous'))}
                            onChange={() => toggleGroup('dangerous')}
                            className="rounded text-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-500">Опасно для промптов</div>
                        </label>
                      </div>
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
