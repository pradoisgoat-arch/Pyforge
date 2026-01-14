
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Terminal as TerminalIcon, 
  Bug, 
  Zap, 
  FileCode, 
  Plus, 
  Trash2, 
  ChevronRight,
  Cpu,
  Sparkles,
  RefreshCw,
  X,
  Wand2,
  Check,
  AlertCircle,
  Menu,
  ChevronDown
} from 'lucide-react';
import { FileNode, ConsoleMessage } from './types';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([
    { id: '1', name: 'main.py', content: 'print("Welcome to ParadoV2 ArcticX!")\n\n# ArcticX by Shashwat Ranjan Jha\ndef greet(name):\n    return f"Hello, {name}! ArcticX is ready to assist you."\n\nprint(greet("Developer"))' }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  
  // AI Generation State
  const [showGenPrompt, setShowGenPrompt] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Pyodide with improved resilience
  useEffect(() => {
    let isMounted = true;
    const loadTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        setLoadError("Initialization taking longer than expected. Please check your internet connection.");
      }
    }, 12000);

    const initPyodide = async () => {
      try {
        let attempts = 0;
        while (!window.loadPyodide && attempts < 100) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }

        if (!window.loadPyodide) {
          throw new Error("Pyodide script failed to load. Check your connection.");
        }

        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        });
        
        if (isMounted) {
          setPyodide(py);
          setIsLoading(false);
          clearTimeout(loadTimeout);
          addConsoleMessage('system', 'ParadoV2 Runtime Initialized. Python 3.12 ready.');
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(err);
          setLoadError(`Failed to load Python runtime: ${err.message}`);
          setIsLoading(false);
          clearTimeout(loadTimeout);
        }
      }
    };

    initPyodide();
    return () => { isMounted = false; };
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

  const handleRunCode = async () => {
    if (!pyodide || isRunning) return;
    
    setIsRunning(true);
    addConsoleMessage('system', `Execution started: ${activeFile.name}`);
    setIsConsoleExpanded(true);

    try {
      pyodide.setStdout({
        batched: (text: string) => addConsoleMessage('stdout', text)
      });
      pyodide.setStderr({
        batched: (text: string) => addConsoleMessage('stderr', text)
      });

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
      setAiResponse(result || 'No response from ArcticX.');
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
      const codeMatch = result?.match(/```python\n([\s\S]*?)```/) || result?.match(/```\n([\s\S]*?)```/);
      const extractedCode = codeMatch ? codeMatch[1] : result;

      if (extractedCode) {
        const newContent = activeFile.content + `\n\n# --- Generated by ArcticX ---\n` + extractedCode;
        updateFileContent(newContent);
        addConsoleMessage('system', 'ArcticX code injected successfully.');
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-white p-6">
        <div className="relative mb-10">
          <div className="w-32 h-32 border-8 border-blue-500/10 border-t-blue-600 rounded-full animate-spin"></div>
          <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={56} />
        </div>
        <div className="text-center max-w-lg">
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500">PARADO V2</h1>
          <p className="text-slate-400 font-medium text-lg mb-8 tracking-wide">Initializing ArcticX Advanced IDE...</p>
          {loadError && (
            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left shadow-2xl">
              <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
              <div>
                <p className="text-red-500 text-lg font-black uppercase tracking-widest">Initialization Failure</p>
                <p className="text-red-400/80 text-sm mt-2 leading-relaxed">{loadError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-5 text-xs uppercase font-black tracking-[0.2em] px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all shadow-lg active:scale-95"
                >
                  Force Reboot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-[#020617] border-r border-slate-800/50 transition-all duration-500 ease-in-out flex flex-col z-40 relative group/sidebar`}>
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-[#020617]">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/10">
              <Cpu size={24} className="text-white" />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tighter text-white block">PARADO</span>
              <span className="text-[10px] text-blue-400 font-black tracking-[0.3em] uppercase block leading-none">V2 CORE</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-8 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-6 mb-6 flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Project Files</span>
            <button onClick={createNewFile} className="p-2 hover:bg-blue-600/10 rounded-xl text-slate-400 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/30" title="New Python File">
              <Plus size={20} />
            </button>
          </div>
          <nav className="space-y-1.5 px-3">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`group px-4 py-3 flex items-center justify-between cursor-pointer rounded-2xl transition-all ${
                  activeFileId === file.id 
                  ? 'bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/5' 
                  : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <FileCode size={20} className={activeFileId === file.id ? 'text-blue-400' : 'text-slate-500'} />
                  <span className="truncate text-sm font-bold tracking-tight">{file.name}</span>
                </div>
                {files.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-8 border-t border-slate-800/50 bg-[#020617] space-y-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-xl shadow-green-500/40 ring-4 ring-green-500/10"></div>
            <span className="text-slate-400 font-bold uppercase tracking-widest">WASM Python 3.12</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-xl shadow-blue-500/40 ring-4 ring-blue-500/10"></div>
            <span className="text-slate-400 font-bold uppercase tracking-widest">ArcticX AI v1.2</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        {/* Mobile Header Overlay */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-6 z-50">
             <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 text-blue-400 shadow-2xl active:scale-95 transition-all">
                <Menu size={24} />
             </button>
          </div>
        )}

        {/* Top Header */}
        <header className="h-20 bg-[#020617] border-b border-slate-800/50 flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 py-2 px-5 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 shadow-inner">
              <FileCode size={20} className="text-blue-400" />
              <span className="text-sm text-slate-100 font-black tracking-tight">{activeFile.name}</span>
              <ChevronDown size={16} className="text-slate-600" />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center bg-slate-900/40 rounded-2xl p-1.5 border border-slate-800/50 ring-1 ring-white/5">
              <button onClick={() => setShowGenPrompt(true)} className="flex items-center gap-2.5 px-5 py-2.5 text-xs hover:bg-blue-600/10 rounded-xl text-blue-400 font-black uppercase tracking-widest transition-all group" title="ArcticX Command (Ctrl+I)">
                <Wand2 size={16} className="group-hover:rotate-12 transition-transform" />
                <span>Command</span>
              </button>
              <div className="w-px h-6 bg-slate-800 mx-2"></div>
              <button onClick={() => handleAIAction('debug')} className="flex items-center gap-2.5 px-5 py-2.5 text-xs hover:bg-orange-600/10 rounded-xl text-orange-400 font-black uppercase tracking-widest transition-all">
                <Bug size={16} />
                <span>Fix</span>
              </button>
            </div>

            <button 
              onClick={handleRunCode}
              disabled={isRunning}
              className={`flex items-center gap-4 px-6 md:px-14 py-3.5 rounded-2xl font-black transition-all transform active:scale-95 shadow-2xl relative overflow-hidden group ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-blue-500/20 ring-1 ring-white/20'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {isRunning ? <RefreshCw size={28} className="animate-spin" /> : <Play size={28} fill="currentColor" />}
              <span className="text-lg md:text-xl uppercase tracking-tighter">Execute</span>
              <span className="text-[10px] opacity-60 font-black hidden sm:inline ml-2 tracking-widest">^↵</span>
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative min-h-0 bg-[#0d1117]">
          <div className="flex-1 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-16 h-full bg-[#020617] border-r border-slate-800/50 flex flex-col items-center py-8 text-slate-600 select-none pointer-events-none text-xs leading-[28px] font-mono font-bold">
               {activeFile.content.split('\n').map((_, i) => (
                 <div key={i}>{i + 1}</div>
               ))}
             </div>
             <textarea
                ref={textareaRef}
                value={activeFile.content}
                onChange={(e) => updateFileContent(e.target.value)}
                className="w-full h-full pl-20 pr-10 py-8 bg-[#0d1117] text-slate-300 code-font text-[16px] leading-[28px] outline-none resize-none spellcheck-false focus:ring-1 focus:ring-blue-500/10 selection:bg-blue-500/30"
                placeholder="# COMPOSE YOUR MASTERPIECE HERE..."
                spellCheck={false}
             />
          </div>

          {/* Floating AI Generation Box */}
          {showGenPrompt && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-2xl z-50 animate-in fade-in slide-in-from-top-8 duration-500">
              <div className="bg-[#1e293b]/90 backdrop-blur-xl border border-blue-500/40 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] p-6 shadow-blue-500/10 ring-1 ring-white/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Sparkles size={20} className="text-blue-400" />
                  </div>
                  <span className="text-sm font-black text-white uppercase tracking-[0.2em]">ArcticX Command Interface</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    autoFocus
                    type="text"
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateCode()}
                    placeholder="E.G., BUILD A SECURE AUTHENTICATION SYSTEM..."
                    className="flex-1 bg-black/40 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-white placeholder-slate-600 uppercase tracking-wide transition-all"
                  />
                  <div className="flex gap-3">
                    <button onClick={handleGenerateCode} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20">Generate</button>
                    <button onClick={() => setShowGenPrompt(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-4 rounded-2xl transition-all"><X size={20} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Side Result Panel */}
          {(isAIProcessing || aiResponse) && (
            <div className="absolute top-8 right-8 w-full max-w-md max-h-[80%] bg-[#020617]/90 backdrop-blur-xl border border-slate-800/50 rounded-[32px] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.8)] flex flex-col z-40 overflow-hidden animate-in slide-in-from-right-8 duration-500 ring-1 ring-white/10">
              <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">ArcticX Intelligence</h3>
                    <p className="text-[10px] text-blue-500 font-black tracking-[0.3em] uppercase opacity-70">By Shashwat Ranjan Jha</p>
                  </div>
                </div>
                <button onClick={() => setAiResponse(null)} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/50 rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto text-sm text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                {isAIProcessing ? (
                  <div className="flex flex-col items-center py-20 space-y-8">
                    <div className="relative">
                      <div className="w-24 h-24 border-2 border-blue-500/5 border-t-blue-500 rounded-full animate-spin"></div>
                      <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-black text-xl uppercase tracking-widest">Processing</p>
                      <p className="text-xs text-slate-500 mt-2 uppercase tracking-[0.3em] font-black">Architecting Logic</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                     <div className="bg-black/60 rounded-3xl p-6 border border-slate-800/50 shadow-inner">
                       <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-200">{aiResponse}</pre>
                     </div>
                     <button 
                        onClick={() => {
                          const codeMatch = aiResponse?.match(/```python\n([\s\S]*?)```/) || aiResponse?.match(/```\n([\s\S]*?)```/);
                          const extracted = codeMatch ? codeMatch[1] : aiResponse;
                          updateFileContent(activeFile.content + '\n\n' + extracted);
                          setAiResponse(null);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl shadow-blue-500/20"
                     >
                       <Check size={20} />
                       Inject Code
                     </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Console / Terminal Panel */}
        <section className={`${isConsoleExpanded ? 'h-96' : 'h-14'} bg-[#020617] transition-all duration-500 ease-in-out flex flex-col border-t border-slate-800/50 relative z-20`}>
          <div onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="flex items-center justify-between px-8 h-14 bg-[#020617] cursor-pointer hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <TerminalIcon size={18} className="text-blue-500" />
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Live Engine Stream</span>
              </div>
              {consoleMessages.length > 0 && (
                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/20">{consoleMessages.length} ENTRIES</span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <button onClick={(e) => { e.stopPropagation(); setConsoleMessages([]); }} className="text-slate-500 hover:text-red-500 p-2 transition-all hover:bg-red-500/10 rounded-xl" title="Clear Terminal">
                <Trash2 size={18} />
              </button>
              <div className={`p-1.5 bg-slate-900 rounded-lg transition-all ${isConsoleExpanded ? 'rotate-90' : 'rotate-0'}`}>
                <ChevronRight size={18} className="text-slate-500" />
              </div>
            </div>
          </div>
          
          {isConsoleExpanded && (
            <div className="flex-1 p-8 overflow-y-auto code-font text-[15px] bg-[#020617] scrollbar-thin scrollbar-thumb-slate-800">
              {consoleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 select-none grayscale">
                  <TerminalIcon size={80} className="mb-6 text-slate-600" />
                  <p className="text-2xl font-black uppercase tracking-[0.5em] text-slate-600 italic">SYSTEM IDLE</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consoleMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-6 group animate-in fade-in slide-in-from-left-4 duration-300">
                      <span className="text-slate-700 shrink-0 text-[10px] mt-1.5 font-black group-hover:text-slate-500 transition-colors uppercase tracking-widest">
                        {msg.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <pre className={`whitespace-pre-wrap break-all font-mono tracking-tight leading-relaxed text-[15px] px-5 py-3 rounded-2xl ${
                        msg.type === 'stderr' ? 'text-red-400 bg-red-500/5 border border-red-500/20 shadow-lg shadow-red-500/5' : 
                        msg.type === 'system' ? 'text-blue-400 font-black border-l-4 border-blue-600 bg-blue-600/5' : 'text-slate-200 bg-slate-900/30'
                      }`}>
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                  <div className="h-8"></div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-8 bg-[#020617] border-t border-slate-800/50 text-slate-600 flex items-center justify-between px-6 text-[10px] font-black z-50 select-none backdrop-blur-md">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 text-blue-500/80">
            <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
            <span className="uppercase tracking-[0.2em]">ArcticX Engine Active</span>
          </div>
          <div className="hidden md:flex items-center gap-2.5">
            <Cpu size={12} />
            <span className="uppercase tracking-[0.2em]">Parado V2 Environment</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="hidden sm:flex items-center gap-4">
             <span className="opacity-50 tracking-widest uppercase">Buffer: {activeFile.content.length}b</span>
             <span className="opacity-50 tracking-widest uppercase">L: {activeFile.content.split('\n').length}</span>
          </div>
          <span className="text-blue-500 tracking-[0.3em] uppercase">Developer: Shashwat Ranjan Jha</span>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse"></div>
            <span className="text-green-500 uppercase tracking-widest">Secure</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
