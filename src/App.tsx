import React, { useState, useEffect } from 'react';
import { countTokens } from './lib/tokenCounter';
import { Hash, AlignLeft, Type, AlertCircle, RefreshCw, Play, CheckCircle2, XCircle } from 'lucide-react';

const OTHER_MODELS = [
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
  
  // GPT-5 State
  const [gpt5Count, setGpt5Count] = useState(0);
  const [isGpt5Calculating, setIsGpt5Calculating] = useState(false);
  const [gpt5Error, setGpt5Error] = useState<string | null>(null);

  // Other Models State
  const [otherResults, setOtherResults] = useState<Record<string, { count?: number, error?: string, calculating?: boolean }>>({});
  const [isCalculatingOthers, setIsCalculatingOthers] = useState(false);

  // Clear other results when text changes
  useEffect(() => {
    setOtherResults({});
  }, [text]);

  // Debounced GPT-5 token calculation (2 seconds)
  useEffect(() => {
    const calculateGpt5 = async () => {
      if (!text.trim()) {
        setGpt5Count(0);
        setGpt5Error(null);
        return;
      }
      
      setIsGpt5Calculating(true);
      setGpt5Error(null);
      try {
        const result = await countTokens(text, 'openai', 'gpt-5');
        setGpt5Count(result.count);
      } catch (err: any) {
        console.error("Failed to calculate GPT-5 tokens", err);
        setGpt5Error(err.message || "Failed to calculate tokens");
        setGpt5Count(0);
      } finally {
        setIsGpt5Calculating(false);
      }
    };

    const timeoutId = setTimeout(() => {
      calculateGpt5();
    }, 2000); // 2000ms debounce

    return () => clearTimeout(timeoutId);
  }, [text]);

  const handleCalculateOthers = async () => {
    if (!text.trim()) return;
    
    setIsCalculatingOthers(true);
    
    // Initialize loading state for all
    const initialResults: Record<string, any> = {};
    OTHER_MODELS.forEach(m => {
      initialResults[m.id] = { calculating: true };
    });
    setOtherResults(initialResults);

    // Calculate sequentially to avoid freezing the browser with multiple heavy WASM tokenizers
    for (const model of OTHER_MODELS) {
      try {
        const result = await countTokens(text, model.provider, model.id);
        setOtherResults(prev => ({
          ...prev,
          [model.id]: { count: result.count, calculating: false }
        }));
      } catch (err: any) {
        setOtherResults(prev => ({
          ...prev,
          [model.id]: { error: err.message || "Error", calculating: false }
        }));
      }
    }
    
    setIsCalculatingOthers(false);
  };

  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto p-6 lg:p-8 flex flex-col h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">TokenCounter</h1>
              <p className="text-sm text-neutral-500">2026 Edition</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* Left Panel: Input */}
          <div className="lg:col-span-7 flex flex-col bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
                <AlignLeft className="w-4 h-4" />
                Prompt Text
              </div>
              <button 
                onClick={() => setText('')}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your prompt here... (GPT-5 tokens calculated automatically after 2s)"
              className="flex-1 w-full bg-transparent p-6 resize-none outline-none text-neutral-300 placeholder:text-neutral-600 leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Right Panel: Results */}
          <div className="lg:col-span-5 flex flex-col gap-6 overflow-hidden">
            
            {/* Primary Result: GPT-5 & Stats */}
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
              
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-sm font-medium text-neutral-400">GPT-5</h2>
                <div className="flex flex-col items-end gap-1 uppercase tracking-wider text-neutral-500 font-medium">
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
                  <span className="text-5xl font-semibold tracking-tight text-white">
                    {gpt5Count.toLocaleString()}
                  </span>
                  <span className="text-neutral-500 mb-1">tokens</span>
                </div>
                {isGpt5Calculating && (
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mb-2" />
                )}
              </div>

              {gpt5Error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500/90 leading-relaxed">{gpt5Error}</p>
                </div>
              )}
            </div>

            {/* Other Models List */}
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 shrink-0">
                <h2 className="text-sm font-medium text-neutral-400">Other Models</h2>
                <button
                  onClick={handleCalculateOthers}
                  disabled={isCalculatingOthers || !text.trim() || Object.keys(otherResults).length > 0}
                  className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  {isCalculatingOthers ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Рассчитать
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {Object.keys(otherResults).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-6 text-center">
                    <Hash className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm">Click calculate to count tokens for all other models.</p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {OTHER_MODELS.map(model => {
                      const result = otherResults[model.id];
                      if (!result) return null;

                      return (
                        <li key={model.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800/50 transition-colors">
                          <span className="text-sm text-neutral-300">{model.name}</span>
                          <div className="flex items-center gap-2">
                            {result.calculating ? (
                              <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
                            ) : result.error ? (
                              <div className="flex items-center gap-1.5 text-red-400" title={result.error}>
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">Error</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-white">
                                <span className="font-medium">{result.count?.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
