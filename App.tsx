
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Terminal as TerminalIcon, 
  Settings, 
  Bug, 
  Zap, 
  HelpCircle, 
  FileCode, 
  Plus, 
  Trash2, 
  ChevronRight,
  Download,
  Share2,
  Cpu,
  Sparkles,
  RefreshCw,
  X,
  Code2,
  Wand2,
  Check,
  Copy
} from 'lucide-react';
import { FileNode, ConsoleMessage, ExecutionResult } from './types';
import { getAIAssistance } from './services/gemini';

// --- Global Pyodide Reference ---
declare global {
  interface Window {
    loadPyodide: any;
  }
}

const App: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<FileNode[]>([
    { id: '1', name: 'main.py', content: 'print("Welcome to PyForge AI!")\n\n# Try writing some Python code or use the Magic Wand to generate code\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Developer"))' }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  
  // AI Generation State
  const [showGenPrompt, setShowGenPrompt] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        });
        setPyodide(py);
        setIsLoading(false);
        addConsoleMessage('system', 'Pyodide initialized. Python 3.12 ready.');
      } catch (err) {
        addConsoleMessage('stderr', `Failed to load Python runtime: ${err}`);
        setIsLoading(false);
      }
    };
    initPyodide();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        setShowGenPrompt(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pyodide, activeFile.content]);

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  const handleRunCode = async () => {
    if (!pyodide || isRunning) return;
    
    setIsRunning(true);
    addConsoleMessage('system', `Execution started: ${activeFile.name}`);
    setIsConsoleExpanded(true);

    try {
      // Capture stdout/stderr
      pyodide.setStdout({
        batched: (text: string) => addConsoleMessage('stdout', text)
      });
      pyodide.setStderr({
        batched: (text: string) => addConsoleMessage('stderr', text)
      });

      // Clear previous outputs visually if user wants? For now just append.
      await pyodide.runPythonAsync(activeFile.content);
      addConsoleMessage('system', 'Process finished successfully.');
    } catch (err: any) {
      addConsoleMessage('stderr', err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAIAction = async (mode: 'debug' | 'optimize' | 'explain') => {
    setIsAIProcessing(true);
    setAiResponse(null);
    try {
      const result = await getAIAssistance('', activeFile.content, mode);
      setAiResponse(result || 'No response from AI.');
    } catch (err) {
      setAiResponse(`Error: ${err}`);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!genPrompt.trim()) return;
    setIsAIProcessing(true);
    setShowGenPrompt(false);
    try {
      const result = await getAIAssistance(genPrompt, activeFile.content, 'generate');
      
      // Attempt to extract code from markdown
      const codeMatch = result?.match(/```python\n([\s\S]*?)```/) || result?.match(/```\n([\s\S]*?)```/);
      const extractedCode = codeMatch ? codeMatch[1] : result;

      if (extractedCode) {
        // Option to either append or replace. Let's append for safety with a comment.
        const newContent = activeFile.content + `\n\n# --- AI Generated Code ---\n` + extractedCode;
        updateFileContent(newContent);
        addConsoleMessage('system', 'AI generated code inserted into file.');
      }
    } catch (err) {
      addConsoleMessage('stderr', `Generation failed: ${err}`);
    } finally {
      setIsAIProcessing(false);
      setGenPrompt('');
    }
  };

  const updateFileContent = (content: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content } : f));
  };

  const createNewFile = () => {
    const newId = Date.now().toString();
    const newFile: FileNode = { id: newId, name: `script_${files.length}.py`, content: '' };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newId);
  };

  const deleteFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) {
      const remaining = files.filter(f => f.id !== id);
      setActiveFileId(remaining[0].id);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] text-white space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" size={32} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">PyForge AI</h1>
          <p className="text-slate-400 animate-pulse">Loading WebAssembly Python Runtime...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-[#020617] border-r border-slate-800 transition-all duration-300 flex flex-col z-40`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#020617]">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg shadow-blue-900/20">
              <Cpu size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">PyForge</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-5 mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Files</span>
            <button 
              onClick={createNewFile} 
              className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-blue-400 transition-all"
              title="New Python File"
            >
              <Plus size={18} />
            </button>
          </div>
          <nav className="space-y-1 px-2">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`group px-3 py-2.5 flex items-center justify-between cursor-pointer rounded-lg transition-all ${
                  activeFileId === file.id 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileCode size={18} className={activeFileId === file.id ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="truncate text-sm font-medium">{file.name}</span>
                </div>
                {files.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} 
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800 bg-[#020617] space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/20"></div>
            <span className="text-slate-400 font-medium">Python 3.12 (Local WASM)</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20"></div>
            <span className="text-slate-400 font-medium">Gemini AI Ready</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
        {/* Top Header */}
        <header className="h-16 bg-[#020617] border-b border-slate-800 flex items-center justify-between px-6 z-30 shadow-sm">
          <div className="flex items-center gap-5">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            )}
            <div className="flex items-center gap-3 py-1.5 px-3 bg-slate-900 rounded-lg border border-slate-800">
              <FileCode size={16} className="text-blue-400" />
              <span className="text-sm text-slate-200 font-semibold">{activeFile.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center bg-slate-900/50 rounded-xl p-1 border border-slate-800">
              <button 
                onClick={() => setShowGenPrompt(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-blue-600/10 rounded-lg text-blue-400 font-medium transition-all group"
                title="AI Magic Code Generation (Ctrl+I)"
              >
                <Wand2 size={16} className="group-hover:rotate-12 transition-transform" />
                <span>AI Magic</span>
              </button>
              <div className="w-px h-6 bg-slate-800 mx-1"></div>
              <button 
                onClick={() => handleAIAction('debug')}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-orange-500/10 rounded-lg text-orange-400 font-medium transition-all"
              >
                <Bug size={16} />
                <span>Fix</span>
              </button>
              <button 
                onClick={() => handleAIAction('optimize')}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-yellow-500/10 rounded-lg text-yellow-400 font-medium transition-all"
              >
                <Zap size={16} />
                <span>Tweak</span>
              </button>
            </div>

            <button 
              onClick={handleRunCode}
              disabled={isRunning}
              className={`flex items-center gap-3 px-8 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-xl ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30'
              }`}
            >
              {isRunning ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
              <span className="text-base uppercase tracking-wider">Run Code</span>
              <span className="text-[10px] opacity-60 font-normal hidden sm:inline ml-1">⌘↵</span>
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative min-h-0">
          <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
             <div className="absolute top-0 left-0 w-12 h-full bg-[#0d1117] border-r border-slate-800/50 flex flex-col items-center py-6 text-slate-600 select-none pointer-events-none text-xs leading-relaxed font-mono">
               {activeFile.content.split('\n').map((_, i) => (
                 <div key={i}>{i + 1}</div>
               ))}
             </div>
             <textarea
                ref={textareaRef}
                value={activeFile.content}
                onChange={(e) => updateFileContent(e.target.value)}
                className="w-full h-full pl-16 pr-8 py-6 bg-transparent text-slate-300 code-font text-[15px] leading-relaxed outline-none resize-none spellcheck-false focus:ring-1 focus:ring-blue-500/10"
                placeholder="# Compose your Python masterpiece here..."
                spellCheck={false}
             />
          </div>

          {/* Floating AI Generation Box */}
          {showGenPrompt && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-[#1e293b] border border-blue-500/30 rounded-2xl shadow-2xl p-4 shadow-blue-900/40">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles size={18} className="text-blue-400" />
                  <span className="text-sm font-bold text-white tracking-wide">What should I build?</span>
                </div>
                <div className="flex gap-3">
                  <input 
                    autoFocus
                    type="text"
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateCode()}
                    placeholder="e.g., 'Write a function to calculate Fibonacci numbers'"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
                  />
                  <button 
                    onClick={handleGenerateCode}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    Generate
                  </button>
                  <button 
                    onClick={() => setShowGenPrompt(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-2 rounded-xl"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Side Result Panel */}
          {(isAIProcessing || aiResponse) && (
            <div className="absolute top-6 right-6 w-[420px] max-h-[85%] bg-[#1e293b] border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-right-6 duration-300">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Assistant</h3>
                    <p className="text-[10px] text-slate-500 font-medium">GEMINI 3.0 PRO</p>
                  </div>
                </div>
                <button onClick={() => setAiResponse(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                {isAIProcessing ? (
                  <div className="flex flex-col items-center py-12 space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                      <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">Generating Logic...</p>
                      <p className="text-xs text-slate-500 mt-1">This usually takes a few seconds</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                     <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-4">
                       <pre className="whitespace-pre-wrap font-mono text-xs leading-normal">{aiResponse}</pre>
                     </div>
                     <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          const codeMatch = aiResponse?.match(/```python\n([\s\S]*?)```/) || aiResponse?.match(/```\n([\s\S]*?)```/);
                          const extracted = codeMatch ? codeMatch[1] : aiResponse;
                          updateFileContent(activeFile.content + '\n\n' + extracted);
                          setAiResponse(null);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                       >
                         <Check size={16} />
                         Append to File
                       </button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Console / Terminal Panel */}
        <section className={`${isConsoleExpanded ? 'h-80' : 'h-12'} bg-[#020617] transition-all duration-300 flex flex-col border-t border-slate-800 relative z-20`}>
          <div 
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            className="flex items-center justify-between px-6 h-12 bg-[#020617] cursor-pointer hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TerminalIcon size={16} className="text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Execution Terminal</span>
              </div>
              {consoleMessages.length > 0 && (
                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                  {consoleMessages.length} Messages
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); setConsoleMessages([]); }}
                className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"
                title="Clear Terminal"
              >
                <Trash2 size={16} />
              </button>
              <div className={`p-1 rounded-md transition-all ${isConsoleExpanded ? 'rotate-90' : 'rotate-0'}`}>
                <ChevronRight size={20} className="text-slate-500" />
              </div>
            </div>
          </div>
          
          {isConsoleExpanded && (
            <div className="flex-1 p-6 overflow-y-auto code-font text-[14px] bg-black/40 scrollbar-thin scrollbar-thumb-slate-800">
              {consoleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 select-none grayscale">
                  <TerminalIcon size={48} className="mb-4" />
                  <p className="text-lg font-medium italic">Waiting for execution...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {consoleMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <span className="text-slate-600 shrink-0 text-[11px] mt-1 font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                        [{msg.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                      </span>
                      <pre className={`whitespace-pre-wrap break-all font-mono tracking-tight leading-relaxed ${
                        msg.type === 'stderr' ? 'text-red-400 bg-red-500/5 px-2 py-0.5 rounded border-l-2 border-red-500' : 
                        msg.type === 'system' ? 'text-blue-400 font-bold' : 'text-slate-200'
                      }`}>
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                  <div className="h-4"></div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-6 bg-[#1e293b] border-t border-slate-800 text-slate-400 flex items-center justify-between px-4 text-[10px] font-semibold z-50 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-blue-400">
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
            <span className="uppercase tracking-tight">System Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={10} />
            <span className="uppercase tracking-tight">Pyodide v0.26.4</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={10} className="text-indigo-400" />
            <span className="uppercase tracking-tight">AI Integrated</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <span className="opacity-60">Lines: {activeFile.content.split('\n').length}</span>
             <span className="opacity-60">Chars: {activeFile.content.length}</span>
          </div>
          <span className="text-slate-500">UTF-8</span>
          <span className="text-blue-400 font-bold uppercase tracking-widest">Python 3.12</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
            <span className="text-green-500 uppercase">Runtime Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
