
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
  Code,
  Package,
  Download
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
    { id: '1', name: 'main.py', content: 'import math\nimport sys\n\nprint(f"Python Version: {sys.version}")\nprint(f"Value of Pi: {math.pi}")\n\n# Try importing a package like "numpy" after installing it from the sidebar!\ndef greet(name):\n    return f"Hello {name}, welcome to ParadoV2!"\n\nprint(greet("Developer"))' }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  
  const [showGenPrompt, setShowGenPrompt] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  
  // Package Management
  const [installedPackages, setInstalledPackages] = useState<string[]>(['micropip', 'setuptools']);
  const [newPackage, setNewPackage] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        let checkCount = 0;
        while (typeof window.loadPyodide === 'undefined' && checkCount < 100) {
          await new Promise(r => setTimeout(r, 100));
          checkCount++;
        }

        if (typeof window.loadPyodide === 'undefined') {
          throw new Error("Pyodide script failed to load. Check network.");
        }

        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        });
        
        await py.loadPackage(["micropip"]);
        
        if (mounted) {
          setPyodide(py);
          setIsLoading(false);
          addConsoleMessage('system', 'ParadoV2 Core successfully initialized. Python 3.12 (WASM) is live.');
        }
      } catch (err: any) {
        if (mounted) {
          setLoadError(err.message || "Unknown error during initialization.");
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  const handleInstallPackage = async () => {
    if (!pyodide || !newPackage.trim() || isInstalling) return;
    setIsInstalling(true);
    const pkg = newPackage.trim().toLowerCase();
    addConsoleMessage('system', `Installing package: ${pkg}...`);
    
    try {
      const micropip = pyodide.pyimport("micropip");
      await micropip.install(pkg);
      setInstalledPackages(prev => [...new Set([...prev, pkg])]);
      addConsoleMessage('system', `Successfully installed ${pkg}`);
      setNewPackage('');
    } catch (err: any) {
      addConsoleMessage('stderr', `Failed to install ${pkg}: ${err.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

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
        updateFileContent(activeFile.content + '\n\n# Generated by ArcticX\n' + extractedCode);
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
    const name = prompt("File name (e.g. script.py):", `script_${files.length}.py`);
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-white p-8">
        <div className="relative mb-12">
          <div className="w-32 h-32 border-[10px] border-blue-600/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.1)]"></div>
          <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={48} />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-white uppercase italic">Parado V2</h1>
          <p className="text-blue-500 font-bold uppercase tracking-[0.5em] text-[10px]">Initializing Core Runtimes</p>
          {loadError && (
            <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl max-w-sm mx-auto">
              <p className="text-red-400 font-bold mb-2 uppercase tracking-widest text-xs tracking-widest">Boot Error</p>
              <p className="text-red-300/80 text-[10px] leading-relaxed mb-6">{loadError}</p>
              <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-500 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all">Retry</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden selection:bg-blue-500/30">
      {/* Sidebar - Enhanced with Package Manager */}
      <aside className={`fixed lg:relative h-full transition-all duration-300 ease-in-out z-50 bg-[#020617] border-r border-slate-800/50 flex flex-col ${isSidebarOpen ? 'w-72 md:w-80' : 'w-0 overflow-hidden'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow-lg">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-black text-white tracking-tighter block leading-none">PARADO</span>
              <span className="text-[8px] text-blue-400 font-black tracking-[0.3em] uppercase block mt-1">V2.1.0</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin">
          {/* File Explorer */}
          <div>
            <div className="flex items-center justify-between px-2 mb-3">
              <div className="flex items-center gap-2">
                <FileCode size={14} className="text-slate-500" />
                <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Explorer</h2>
              </div>
              <button onClick={createNewFile} className="p-1 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {files.map(file => (
                <div 
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    activeFileId === file.id 
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                    : 'bg-transparent border-transparent hover:bg-slate-800/40 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Code size={14} className={activeFileId === file.id ? 'text-blue-400' : 'text-slate-600'} />
                    <span className="truncate text-xs font-bold tracking-tight">{file.name}</span>
                  </div>
                  {files.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Package Manager */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-4">
              <Package size={14} className="text-slate-500" />
              <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Package Manager</h2>
            </div>
            <div className="px-2 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newPackage}
                  onChange={(e) => setNewPackage(e.target.value)}
                  placeholder="e.g. numpy"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-white"
                />
                <button 
                  onClick={handleInstallPackage}
                  disabled={isInstalling || !newPackage}
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isInstalling ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {installedPackages.map(pkg => (
                  <span key={pkg} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-bold rounded-md border border-slate-700/50 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                    {pkg}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/50">
          <div className="p-3 bg-blue-900/10 rounded-xl border border-blue-800/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Active Runtime</span>
            </div>
            <p className="text-[8px] text-slate-500 font-bold">PYTHON 3.12 (WASM)</p>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        <header className="h-16 md:h-20 bg-[#020617] border-b border-slate-800/50 flex items-center justify-between px-4 md:px-8 shrink-0 z-40">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-blue-400 shadow-lg">
                <Menu size={18} />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-3 py-1.5 px-4 bg-slate-900/40 rounded-xl border border-slate-800/50 shadow-inner">
              <FileCode size={16} className="text-blue-400" />
              <span className="text-xs font-bold tracking-tight text-white">{activeFile.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center bg-slate-900/40 rounded-xl p-1 border border-slate-800/50 shrink-0">
              <button onClick={() => setShowGenPrompt(true)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-400 transition-all group" title="ArcticX Command">
                <Wand2 size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
              <div className="w-px h-5 bg-slate-800 mx-1"></div>
              <button onClick={() => handleAIAction('debug')} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-600/10 rounded-lg transition-all">
                <Bug size={12} />
                <span>Fix</span>
              </button>
              <button onClick={() => handleAIAction('optimize')} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-600/10 rounded-lg transition-all">
                <Zap size={12} />
                <span>Opt</span>
              </button>
            </div>

            <button 
              onClick={handleRunCode}
              disabled={isRunning}
              className={`flex items-center gap-2 md:gap-3 px-6 md:px-10 py-2.5 md:py-3.5 rounded-xl font-black transition-all transform active:scale-95 shadow-xl relative overflow-hidden group ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white ring-1 ring-white/10'
              }`}
            >
              {isRunning ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
              <span className="text-xs md:text-sm uppercase tracking-tighter">Execute</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative bg-[#0d1117] overflow-hidden">
            <div className="absolute top-0 left-0 w-10 md:w-14 h-full bg-[#020617]/40 border-r border-slate-800/30 flex flex-col items-center py-6 text-slate-700 select-none font-mono text-[10px] md:text-xs leading-[24px] md:leading-[28px] z-10">
              {activeFile.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            
            <textarea
              ref={textareaRef}
              value={activeFile.content}
              onChange={(e) => updateFileContent(e.target.value)}
              className="w-full h-full pl-12 md:pl-20 pr-4 md:pr-8 py-6 bg-transparent text-slate-300 code-font text-sm md:text-[16px] leading-[24px] md:leading-[28px] outline-none resize-none spellcheck-false selection:bg-blue-500/30 relative z-20"
              placeholder="# BUILD YOUR PYTHON MASTERPIECE..."
              spellCheck={false}
            />

            {(isAIProcessing || aiResponse) && (
              <div className="absolute top-4 right-4 bottom-4 w-[calc(100%-2rem)] max-w-sm md:max-w-md z-50 animate-in slide-in-from-right-8 duration-300">
                <div className="h-full glass-card flex flex-col rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border-slate-800/80 ring-1 ring-white/5">
                  <div className="p-4 md:p-6 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-tight">ArcticX AI</h3>
                        <p className="text-[8px] text-blue-500 font-black tracking-[0.2em] uppercase">Intelligence Node</p>
                      </div>
                    </div>
                    <button onClick={() => setAiResponse(null)} className="p-2 text-slate-500 hover:text-white transition-all bg-slate-800/30 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="flex-1 p-5 md:p-8 overflow-y-auto text-xs md:text-sm leading-relaxed scrollbar-thin">
                    {isAIProcessing ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-500 rounded-full animate-spin"></div>
                          <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
                        </div>
                        <p className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Processing logic...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-black/40 rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-inner">
                          <pre className="whitespace-pre-wrap font-mono text-[11px] md:text-sm text-slate-200 tracking-tight leading-relaxed">{aiResponse}</pre>
                        </div>
                        <button 
                          onClick={() => {
                            const codeMatch = aiResponse?.match(/```python\n([\s\S]*?)```/) || aiResponse?.match(/```\n([\s\S]*?)```/);
                            const extracted = codeMatch ? codeMatch[1] : aiResponse;
                            updateFileContent(activeFile.content + '\n\n' + extracted);
                            setAiResponse(null);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95"
                        >
                          <Check size={16} />
                          Inject Code
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showGenPrompt && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-2xl border-blue-500/20 ring-1 ring-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-blue-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Command Engine</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input 
                      autoFocus
                      type="text"
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateCode()}
                      placeholder="E.G., BUILD A WEB SCRAPER..."
                      className="flex-1 bg-black/40 border border-slate-700/50 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-white placeholder-slate-700 transition-all uppercase"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleGenerateCode} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all">Generate</button>
                      <button onClick={() => setShowGenPrompt(false)} className="bg-slate-800 p-3 rounded-xl"><X size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <section className={`${isConsoleExpanded ? 'h-60 md:h-72 lg:h-80 max-h-[40vh]' : 'h-12'} bg-[#020617] border-t border-slate-800/50 flex flex-col transition-all duration-300 ease-in-out z-40 shrink-0`}>
            <div onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="h-12 flex items-center justify-between px-6 cursor-pointer hover:bg-slate-900/30 transition-colors shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <TerminalIcon size={14} className="text-blue-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">System Log</span>
                </div>
                {consoleMessages.length > 0 && (
                  <span className="bg-blue-600/10 text-blue-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-blue-500/20">{consoleMessages.length}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button onClick={(e) => { e.stopPropagation(); setConsoleMessages([]); }} className="p-1.5 text-slate-500 hover:text-red-500 transition-all">
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className={`text-slate-600 transition-transform duration-300 ${isConsoleExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {isConsoleExpanded && (
              <div className="flex-1 p-5 md:p-6 overflow-y-auto code-font bg-[#020617] scrollbar-thin">
                {consoleMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 select-none grayscale">
                    <Code size={40} className="mb-4 text-slate-600" />
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-600">Idle Engine</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-8">
                    {consoleMessages.map((msg, idx) => (
                      <div key={idx} className="flex gap-4 group animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-slate-700 shrink-0 text-[8px] mt-1 font-black uppercase tracking-widest group-hover:text-slate-500">
                          {msg.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <pre className={`whitespace-pre-wrap break-all font-mono text-[12px] md:text-[13px] px-3 md:px-4 py-2 rounded-xl border ${
                          msg.type === 'stderr' ? 'text-red-400 bg-red-500/5 border-red-500/20 shadow-lg' : 
                          msg.type === 'system' ? 'text-blue-400 font-black bg-blue-600/5 border-blue-500/30' : 'text-slate-300 bg-slate-900/20 border-slate-800/50'
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

        <footer className="h-7 bg-[#020617] border-t border-slate-800/50 flex items-center justify-between px-4 text-[8px] md:text-[9px] font-black text-slate-600 z-50 shrink-0 select-none">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-blue-500/60 uppercase tracking-widest">
              <RefreshCw size={10} className={isRunning ? 'animate-spin' : ''} />
              <span>Engine Live</span>
            </div>
            <div className="hidden md:flex items-center gap-2 uppercase tracking-widest">
              <Sparkles size={10} className="text-indigo-400" />
              <span>ArcticX Core</span>
            </div>
          </div>
          <div className="flex items-center gap-6 uppercase tracking-widest">
            <span className="hidden md:inline text-blue-500/70">Shashwat Ranjan Jha</span>
            <div className="flex items-center gap-2 text-green-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span>Secure</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
