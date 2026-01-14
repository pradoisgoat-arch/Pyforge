
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
  MoreVertical,
  Layers,
  Code
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
    { id: '1', name: 'main.py', content: 'print("PARADO V2 ONLINE")\nprint("ArcticX by Shashwat Ranjan Jha ready.")\n\n# Try running this:\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint("Fibonacci sequence:", list(fibonacci(10)))' }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  
  const [showGenPrompt, setShowGenPrompt] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  // Improved Pyodide Loading to prevent "Blank Blue Screen" on Netlify
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        console.log("Initializing ParadoV2 Core...");
        
        // Wait for script to be available with timeout
        let checkCount = 0;
        while (typeof window.loadPyodide === 'undefined' && checkCount < 50) {
          await new Promise(r => setTimeout(r, 200));
          checkCount++;
        }

        if (typeof window.loadPyodide === 'undefined') {
          throw new Error("Pyodide script failed to load from CDN. Check network.");
        }

        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        });
        
        if (mounted) {
          setPyodide(py);
          setIsLoading(false);
          addConsoleMessage('system', 'ParadoV2 Core successfully initialized. Python 3.12 active.');
        }
      } catch (err: any) {
        console.error("Pyodide Load Error:", err);
        if (mounted) {
          setLoadError(err.message || "Unknown error during initialization.");
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // Handle sidebar for mobile automatically
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleRunCode = async () => {
    if (!pyodide || isRunning) return;
    setIsRunning(true);
    setIsConsoleExpanded(true);
    addConsoleMessage('system', `Executing: ${activeFile.name}`);

    try {
      pyodide.setStdout({ batched: (text: string) => addConsoleMessage('stdout', text) });
      pyodide.setStderr({ batched: (text: string) => addConsoleMessage('stderr', text) });
      await pyodide.runPythonAsync(activeFile.content);
      addConsoleMessage('system', 'Execution complete.');
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
      setAiResponse(result);
    } catch (err: any) {
      setAiResponse(`ArcticX Error: ${err.message}`);
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
        updateFileContent(activeFile.content + '\n\n# ArcticX Result\n' + extractedCode);
      }
    } catch (err: any) {
      addConsoleMessage('stderr', `ArcticX Generator Error: ${err.message}`);
    } finally {
      setIsAIProcessing(false);
      setGenPrompt('');
    }
  };

  const updateFileContent = (content: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content } : f));
  };

  const createNewFile = () => {
    const name = prompt("File name (e.g. app.py):", `script_${files.length}.py`);
    if (!name) return;
    const newId = Date.now().toString();
    setFiles(prev => [...prev, { id: newId, name, content: '' }]);
    setActiveFileId(newId);
  };

  const deleteFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(files.find(f => f.id !== id)!.id);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-white p-12">
        <div className="relative mb-12">
          <div className="w-32 h-32 border-[10px] border-blue-600/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.2)]"></div>
          <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={48} />
        </div>
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-6xl font-black tracking-tighter mb-4 text-white uppercase italic">Parado V2</h1>
          <p className="text-blue-400 font-bold uppercase tracking-[0.4em] text-xs">Booting ArcticX Intelligence</p>
          {loadError && (
            <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl max-w-md mx-auto">
              <p className="text-red-400 font-bold mb-4 uppercase tracking-widest text-sm">Critical Failure</p>
              <p className="text-red-300/80 text-xs leading-relaxed mb-6">{loadError}</p>
              <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-500 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-red-500/20">Emergency Reload</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:w-0'} bg-[#020617] border-r border-slate-800/50 flex flex-col z-50 transition-all duration-300 ease-out`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/20">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tighter block leading-none">PARADO</span>
              <span className="text-[9px] text-blue-400 font-black tracking-[0.3em] uppercase block mt-1">V2.1.0</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-8">
          <div>
            <div className="flex items-center justify-between px-2 mb-4">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Tree</h2>
              <button onClick={createNewFile} className="p-1.5 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {files.map(file => (
                <div 
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                    activeFileId === file.id 
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5' 
                    : 'bg-transparent border-transparent hover:bg-slate-800/40 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileCode size={18} className={activeFileId === file.id ? 'text-blue-400' : 'text-slate-600'} />
                    <span className="truncate text-sm font-bold tracking-tight">{file.name}</span>
                  </div>
                  {files.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800/50 space-y-4">
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold">PYTHON 3.12 (WASM)</p>
          </div>
          <p className="text-[9px] text-center text-slate-600 font-black uppercase tracking-[0.2em]">Dev: Shashwat Ranjan Jha</p>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        {/* Navbar */}
        <header className="h-20 bg-[#020617] border-b border-slate-800/50 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-blue-400 hover:text-blue-300 transition-all active:scale-90">
                <Menu size={20} />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-3 py-2 px-5 bg-slate-900/40 rounded-xl border border-slate-800/50">
              <FileCode size={18} className="text-blue-400" />
              <span className="text-sm font-bold tracking-tight text-white">{activeFile.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6">
            <div className="flex items-center bg-slate-900/40 rounded-xl p-1 border border-slate-800/50">
              <button onClick={() => setShowGenPrompt(true)} className="p-2.5 hover:bg-blue-600/10 rounded-lg text-blue-400 transition-all group" title="ArcticX Command">
                <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />
              </button>
              <div className="w-px h-6 bg-slate-800 mx-1"></div>
              <button onClick={() => handleAIAction('debug')} className="hidden md:flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-600/10 rounded-lg transition-all">
                <Bug size={14} />
                <span>Fix</span>
              </button>
              <button onClick={() => handleAIAction('optimize')} className="hidden md:flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-600/10 rounded-lg transition-all">
                <Zap size={14} />
                <span>Opt</span>
              </button>
              <button className="md:hidden p-2.5 text-slate-500">
                <MoreVertical size={20} />
              </button>
            </div>

            <button 
              onClick={handleRunCode}
              disabled={isRunning}
              className={`flex items-center gap-3 md:gap-4 px-6 md:px-12 py-3.5 rounded-2xl font-black transition-all transform active:scale-95 shadow-2xl relative overflow-hidden group ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-blue-500/20 ring-1 ring-white/10'
              }`}
            >
              {isRunning ? <RefreshCw size={24} className="animate-spin" /> : <Play size={24} fill="currentColor" />}
              <span className="text-sm md:text-lg uppercase tracking-tighter">Execute</span>
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative bg-[#0d1117] overflow-hidden">
            <div className="absolute top-0 left-0 w-14 h-full bg-[#020617]/50 border-r border-slate-800/30 flex flex-col items-center py-8 text-slate-700 select-none font-mono text-xs leading-[28px]">
              {activeFile.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea
              ref={textareaRef}
              value={activeFile.content}
              onChange={(e) => updateFileContent(e.target.value)}
              className="w-full h-full pl-20 pr-8 py-8 bg-transparent text-slate-300 code-font text-[16px] leading-[28px] outline-none resize-none spellcheck-false selection:bg-blue-500/30"
              placeholder="# ARCHITECT YOUR PYTHON LOGIC HERE..."
              spellCheck={false}
            />

            {/* AI Generator Overlay */}
            {showGenPrompt && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-2xl z-50 animate-in fade-in zoom-in-95 duration-300">
                <div className="glass-card p-6 rounded-[2rem] shadow-2xl border-blue-500/20 shadow-blue-500/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-xl"><Sparkles size={20} className="text-blue-400" /></div>
                    <span className="text-xs font-black text-white uppercase tracking-[0.3em]">ArcticX Command</span>
                  </div>
                  <div className="flex gap-4">
                    <input 
                      autoFocus
                      type="text"
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateCode()}
                      placeholder="E.G., BUILD A SECURE FILE HANDLER..."
                      className="flex-1 bg-black/40 border border-slate-700/50 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-white placeholder-slate-700 transition-all uppercase tracking-wider"
                    />
                    <button onClick={handleGenerateCode} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-blue-500/20 active:scale-95">Generate</button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Assistant Overlay */}
            {(isAIProcessing || aiResponse) && (
              <div className="absolute top-8 right-4 lg:right-12 w-full max-w-md max-h-[85%] z-50 animate-in slide-in-from-right-12 duration-500">
                <div className="glass-card flex flex-col rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden border-slate-800/80">
                  <div className="p-6 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none">ArcticX Assistant</h3>
                        <p className="text-[9px] text-blue-500 font-black tracking-[0.2em] uppercase mt-1">Shashwat Ranjan Jha</p>
                      </div>
                    </div>
                    <button onClick={() => setAiResponse(null)} className="p-2.5 text-slate-500 hover:text-white transition-all bg-slate-800/50 rounded-xl">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto max-h-[500px] text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                    {isAIProcessing ? (
                      <div className="flex flex-col items-center py-24 space-y-8">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-blue-600/10 border-t-blue-500 rounded-full animate-spin"></div>
                          <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={28} />
                        </div>
                        <div className="text-center">
                          <p className="text-white font-black text-lg uppercase tracking-widest">Architecting</p>
                          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.3em] font-black italic">Refining Logic Streams</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="bg-black/60 rounded-[2rem] p-6 border border-slate-800/50 shadow-inner">
                          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-200 tracking-tight leading-relaxed">{aiResponse}</pre>
                        </div>
                        <button 
                          onClick={() => {
                            const codeMatch = aiResponse?.match(/```python\n([\s\S]*?)```/) || aiResponse?.match(/```\n([\s\S]*?)```/);
                            const extracted = codeMatch ? codeMatch[1] : aiResponse;
                            updateFileContent(activeFile.content + '\n\n' + extracted);
                            setAiResponse(null);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98]"
                        >
                          <Check size={20} />
                          Inject Into Workspace
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Console */}
          <section className={`${isConsoleExpanded ? 'h-96' : 'h-14'} bg-[#020617] border-t border-slate-800/50 flex flex-col transition-all duration-500 ease-in-out z-40`}>
            <div onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="h-14 flex items-center justify-between px-8 cursor-pointer hover:bg-slate-900/40 transition-colors">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <TerminalIcon size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Live Process Feed</span>
                </div>
                {consoleMessages.length > 0 && (
                  <span className="bg-blue-600/10 text-blue-400 text-[9px] font-black px-3 py-1 rounded-full border border-blue-500/20">{consoleMessages.length} ENTRIES</span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <button onClick={(e) => { e.stopPropagation(); setConsoleMessages([]); }} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={18} className={`text-slate-600 transition-transform duration-300 ${isConsoleExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {isConsoleExpanded && (
              <div className="flex-1 p-8 overflow-y-auto code-font text-[15px] bg-[#020617] scrollbar-thin">
                {consoleMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 select-none grayscale">
                    <Code size={64} className="mb-6 text-slate-600" />
                    <p className="text-xl font-black uppercase tracking-[0.5em] text-slate-600">IDLE ENGINE</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-12">
                    {consoleMessages.map((msg, idx) => (
                      <div key={idx} className="flex gap-6 group animate-in fade-in slide-in-from-left-4 duration-300">
                        <span className="text-slate-700 shrink-0 text-[10px] mt-1.5 font-black uppercase tracking-widest group-hover:text-slate-500 transition-colors">
                          {msg.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <pre className={`whitespace-pre-wrap break-all font-mono text-[14px] px-5 py-3 rounded-2xl border ${
                          msg.type === 'stderr' ? 'text-red-400 bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5' : 
                          msg.type === 'system' ? 'text-blue-400 font-black bg-blue-600/5 border-blue-500/30' : 'text-slate-300 bg-slate-900/30 border-slate-800/50'
                        }`}>
                          {msg.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="h-8 bg-[#020617] border-t border-slate-800/50 flex items-center justify-between px-6 text-[9px] font-black text-slate-600 z-50 shrink-0">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 text-blue-500/60 uppercase tracking-widest">
              <RefreshCw size={10} className={isRunning ? 'animate-spin' : ''} />
              <span>Engine Status: Online</span>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 uppercase tracking-widest">
              <Sparkles size={10} className="text-indigo-400" />
              <span>ArcticX Powered</span>
            </div>
          </div>
          <div className="flex items-center gap-8 uppercase tracking-widest">
            <span className="hidden md:inline">Memory Buffer: {(activeFile.content.length / 1024).toFixed(2)} KB</span>
            <span className="text-blue-500/80">Dev: Shashwat Ranjan Jha</span>
            <div className="flex items-center gap-2.5 text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span>Secure</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
