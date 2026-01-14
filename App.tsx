
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal as TerminalIcon, FileCode, Plus, Trash2, 
  ChevronRight, Cpu, RefreshCw, X, Menu, 
  Layers, Code, Package, Download, 
  Maximize2, Minimize2, Monitor, EyeOff, 
  Activity, RotateCcw, Maximize, Layout, Search,
  CheckCircle2, Box, HelpCircle, AlertCircle
} from 'lucide-react';
import { FileNode, ConsoleMessage } from './types';

const PRESET_PACKAGES = [
  "pandas", "scikit-learn", "scipy", "networkx", "beautifulsoup4", 
  "requests", "pyyaml", "sympy", "statsmodels", "seaborn", 
  "pillow", "nltk", "pydantic", "joblib", "tqdm"
];

const App: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<FileNode[]>([
    { 
      id: '1', 
      name: 'main.py', 
      content: 'import numpy as np\nimport pandas as pd\n\n# Create a sample DataFrame\ndata = {\n    "Signal": np.random.randn(10),\n    "Intensity": np.random.rand(10) * 100\n}\ndf = pd.DataFrame(data)\n\nprint("--- Parado Analysis Node ---")\nprint(df)\nprint("\\nStatistics:")\nprint(df.describe())' 
    },
    {
      id: '2',
      name: 'game_alternative.py',
      content: 'import js\nimport math\n\n# Why no Pygame? \n# Browser WASM uses the Canvas API instead.\n\ncanvas = js.document.getElementById("game-canvas")\nctx = canvas.getContext("2d")\n\ndef render_frame(t):\n    # Clear and animate\n    ctx.fillStyle = "#020617"\n    ctx.fillRect(0, 0, canvas.width, canvas.height)\n    \n    x = 400 + math.cos(t/500) * 200\n    y = 225 + math.sin(t/500) * 100\n    \n    ctx.beginPath()\n    ctx.arc(x, y, 40, 0, math.pi*2)\n    ctx.fillStyle = "#3b82f6"\n    ctx.shadowBlur = 25\n    ctx.shadowColor = "#3b82f6"\n    ctx.fill()\n    \n    js.requestAnimationFrame(render_frame)\n\nprint("Animation engine started on HTML5 Canvas...")\nrender_frame(0)'
    }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);
  const [outputTab, setOutputTab] = useState<'terminal' | 'display'>('terminal');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showCompatibilityInfo, setShowCompatibilityInfo] = useState(false);
  
  // Package Management State
  const [installedPackages, setInstalledPackages] = useState<string[]>(['numpy', 'matplotlib', 'micropip', 'pandas']);
  const [packageSearch, setPackageSearch] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  useEffect(() => {
    initEngine();
  }, []);

  const initEngine = async () => {
    setIsLoading(true);
    try {
      const py = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
      });
      await py.loadPackage(["micropip", "matplotlib", "numpy", "pandas"]);
      setPyodide(py);
      setIsLoading(false);
      addConsoleMessage('system', 'Parado Engine Online. WASM Core Secured.');
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  const installPackage = async (pkgName: string) => {
    if (!pyodide || isInstalling || installedPackages.includes(pkgName)) return;
    if (pkgName.toLowerCase() === 'pygame') {
        addConsoleMessage('stderr', 'WASM ALERT: Pygame requires a native OS. Use the Canvas Bridge.');
        setShowCompatibilityInfo(true);
        return;
    }

    setIsInstalling(true);
    addConsoleMessage('system', `Installing ${pkgName}...`);
    try {
      const micropip = pyodide.pyimport("micropip");
      await micropip.install(pkgName);
      setInstalledPackages(prev => [...prev, pkgName]);
      addConsoleMessage('system', `Successfully installed ${pkgName}.`);
    } catch (err: any) {
      addConsoleMessage('stderr', `Installation error: ${err.message}`);
    } finally {
      setIsInstalling(false);
      setPackageSearch('');
    }
  };

  const clearOutputs = () => {
    setConsoleMessages([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    const htmlOut = document.getElementById("html-output");
    if (htmlOut) htmlOut.innerHTML = '';
    const pltOut = document.getElementById("pyplot-output");
    if (pltOut) pltOut.innerHTML = '';
  };

  const executeCode = async () => {
    if (!pyodide || !activeFile || isRunning) return;
    setIsRunning(true);
    setIsConsoleExpanded(true);
    const content = activeFile.content.toLowerCase();
    if (content.includes('plt.') || content.includes('canvas') || content.includes('js.document')) {
        setOutputTab('display');
    }
    addConsoleMessage('system', `Running ${activeFile.name}...`);
    try {
      if (content.includes('plt.')) {
          await pyodide.runPythonAsync(`
import matplotlib
import matplotlib.pyplot as plt
matplotlib.use("module://matplotlib.backends.html5_canvas_backend")
          `);
      }
      pyodide.setStdout({ batched: (text: string) => addConsoleMessage('stdout', text) });
      pyodide.setStderr({ batched: (text: string) => addConsoleMessage('stderr', text) });
      await pyodide.runPythonAsync(activeFile.content);
    } catch (err: any) {
      addConsoleMessage('stderr', err.message);
      setOutputTab('terminal');
    } finally {
      setIsRunning(false);
    }
  };

  const refreshEngine = () => {
    addConsoleMessage('system', 'Restarting runtime environment...');
    initEngine();
  };

  const toggleAppFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const toggleDisplayFullscreen = () => {
    if (displayContainerRef.current) {
        if (!document.fullscreenElement) displayContainerRef.current.requestFullscreen();
        else document.exitFullscreen();
    }
  };

  const filteredPreset = PRESET_PACKAGES.filter(p => 
    p.includes(packageSearch.toLowerCase()) && !installedPackages.includes(p)
  );

  return (
    <div className={`flex h-screen bg-[#020617] text-slate-300 font-sans overflow-hidden ${isZenMode ? 'zen-mode' : ''}`}>
      
      {/* Sidebar - Mobile Drawer behavior */}
      <aside className={`fixed lg:static inset-y-0 left-0 flex flex-col border-r border-white/5 bg-[#020617] transition-all duration-300 z-[100] ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-16'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          {(isSidebarOpen || window.innerWidth < 1024) ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1.5 bg-blue-600 rounded shrink-0"><Layers size={14} className="text-white" /></div>
              <span className="font-black text-sm text-white tracking-tighter italic truncate">PARADO V2</span>
            </div>
          ) : (
            <button onClick={() => setIsSidebarOpen(true)} className="mx-auto text-blue-400 p-2 hover:bg-white/5 rounded-lg"><Menu size={18} /></button>
          )}
          {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><X size={16} /></button>}
        </div>

        <div className={`flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin ${!isSidebarOpen && 'hidden lg:block'}`}>
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Files</span>
              <button onClick={() => {
                const name = prompt("Filename:");
                if(name) setFiles(prev => [...prev, { id: Date.now().toString(), name, content: '' }]);
              }} className="hover:text-blue-400"><Plus size={14} /></button>
            </div>
            <div className="space-y-1">
              {files.map(f => (
                <div 
                  key={f.id}
                  onClick={() => { setActiveFileId(f.id); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer border ${activeFileId === f.id ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'border-transparent hover:bg-white/5 text-slate-500'}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Code size={12} className={activeFileId === f.id ? 'text-blue-400' : 'text-slate-600'} />
                    <span className="text-[11px] font-bold truncate">{f.name}</span>
                  </div>
                  {files.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter(file => file.id !== f.id)); }} className="hover:text-red-400"><Trash2 size={10} /></button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-slate-300 uppercase">Packages</span>
              </div>
              <button onClick={() => setShowCompatibilityInfo(!showCompatibilityInfo)} className="text-slate-600 hover:text-blue-400"><HelpCircle size={14} /></button>
            </div>

            {showCompatibilityInfo && (
                <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] text-slate-400">
                  <span className="text-blue-400 font-bold uppercase block mb-1">Notice:</span>
                  WebAssembly environments do not support native GUIs. Use Canvas for graphics.
                </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[10px] focus:outline-none focus:border-blue-500/50 text-slate-300"
              />
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
              {isInstalling && <div className="p-2 text-[9px] text-blue-400 animate-pulse">Installing...</div>}
              {packageSearch ? filteredPreset.map(pkg => (
                <button key={pkg} onClick={() => installPackage(pkg)} className="w-full flex items-center justify-between p-2 hover:bg-white/10 rounded-lg transition-all">
                  <span className="text-[10px] font-bold">{pkg}</span>
                  <Plus size={10} />
                </button>
              )) : installedPackages.map(pkg => (
                <div key={pkg} className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-400">{pkg}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/60 z-50 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        {!isZenMode && (
          <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 shrink-0 bg-[#020617]/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 lg:hidden"><Menu size={18} /></button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                <FileCode size={14} className="text-blue-400" />
                <span className="text-[11px] font-bold text-slate-200 truncate max-w-[100px] sm:max-w-none">{activeFile.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                <button onClick={() => setIsZenMode(true)} className="p-1.5 text-slate-500 hover:text-blue-400" title="Zen Mode"><EyeOff size={16} /></button>
                <button onClick={toggleAppFullscreen} className="p-1.5 text-slate-500 hover:text-blue-400" title="Fullscreen App"><Monitor size={16} /></button>
              </div>

              <button 
                onClick={executeCode}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                <span className="hidden xs:inline">Run</span>
              </button>
            </div>
          </header>
        )}

        {/* Editor */}
        <div className={`flex-1 relative overflow-hidden bg-[#0d1117] transition-all duration-300 ${isConsoleMaximized ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <div className="absolute top-0 left-0 w-10 sm:w-12 h-full bg-[#020617]/50 border-r border-white/5 flex flex-col items-center py-4 font-mono text-[9px] sm:text-[10px] text-slate-600 select-none z-10">
            {activeFile.content.split('\n').map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
          </div>
          <textarea
            value={activeFile.content}
            onChange={(e) => setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: e.target.value } : f))}
            className="w-full h-full pl-12 sm:pl-16 pr-6 py-4 bg-transparent text-slate-300 font-mono text-sm leading-6 outline-none resize-none z-20 focus:ring-0 scrollbar-thin"
            spellCheck={false}
          />
        </div>

        {/* Console / Preview */}
        <div className={`transition-all duration-300 border-t border-white/5 bg-[#020617] flex flex-col z-50 ${isConsoleMaximized ? 'absolute inset-0 h-full' : isConsoleExpanded ? 'h-1/2 sm:h-2/5' : 'h-10'}`}>
          <div className="h-10 flex items-center justify-between px-4 sm:px-6 bg-[#020617] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6 h-full">
                <button onClick={() => setOutputTab('terminal')} className={`flex items-center gap-2 h-full border-b-2 transition-all px-1 sm:px-2 ${outputTab === 'terminal' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600'}`}>
                    <TerminalIcon size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Console</span>
                </button>
                <button onClick={() => setOutputTab('display')} className={`flex items-center gap-2 h-full border-b-2 transition-all px-1 sm:px-2 ${outputTab === 'display' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600'}`}>
                    <Layout size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Preview</span>
                </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={refreshEngine} className="text-slate-600 hover:text-emerald-400" title="Reload Runtime"><RotateCcw size={14} /></button>
              <button onClick={clearOutputs} className="text-slate-600 hover:text-red-400" title="Clear All"><Trash2 size={14} /></button>
              <button onClick={() => setIsConsoleMaximized(!isConsoleMaximized)} className="text-slate-600 hover:text-blue-400">{isConsoleMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
              {!isConsoleMaximized && <button onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="text-slate-500"><ChevronRight size={14} className={`transition-transform duration-300 ${isConsoleExpanded ? 'rotate-90' : ''}`} /></button>}
            </div>
          </div>
          
          {(isConsoleExpanded || isConsoleMaximized) && (
            <div className="flex-1 relative overflow-hidden flex bg-black/40">
                <div className={`absolute inset-0 p-4 sm:p-6 overflow-y-auto font-mono text-[10px] sm:text-[11px] space-y-2 transition-opacity duration-300 ${outputTab === 'terminal' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    {consoleMessages.length === 0 && <div className="text-slate-700 italic">Console idle.</div>}
                    {consoleMessages.map((m, i) => (
                        <div key={i} className={`flex gap-3 p-2 rounded border ${m.type === 'stderr' ? 'text-red-400 bg-red-400/5 border-red-500/10' : m.type === 'system' ? 'text-blue-400 bg-blue-400/5 border-blue-500/10' : 'text-slate-300 border-transparent'}`}>
                            <span className="opacity-30 shrink-0 text-[8px] mt-1">{m.timestamp.toLocaleTimeString([], {hour12: false})}</span>
                            <pre className="whitespace-pre-wrap">{m.content}</pre>
                        </div>
                    ))}
                </div>
                <div ref={displayContainerRef} className={`absolute inset-0 flex flex-col transition-opacity duration-300 bg-[#020617] ${outputTab === 'display' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5 backdrop-blur-sm sticky top-0 z-20">
                        <div className="flex items-center gap-2"><Activity size={10} className="text-emerald-500" /><span className="text-[9px] font-black text-slate-500 uppercase">Output</span></div>
                        <button onClick={toggleDisplayFullscreen} className="p-1 hover:text-blue-400 text-slate-500" title="Fullscreen Preview"><Maximize size={12} /></button>
                    </div>
                    <div className="flex-1 relative overflow-auto p-4 flex flex-col items-center scrollbar-thin">
                        <div id="html-output" className="w-full mb-4"></div>
                        <div id="pyplot-output" className="w-full flex justify-center mb-4"></div>
                        <div className="relative w-full max-w-[800px] aspect-video bg-black/60 rounded-xl border border-white/10 overflow-hidden">
                            <canvas ref={canvasRef} id="game-canvas" width={800} height={450} className="w-full h-full object-contain" />
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="h-7 bg-[#020617] border-t border-white/5 flex items-center justify-between px-4 text-[8px] sm:text-[9px] font-black text-slate-600 z-[60] uppercase tracking-widest">
            <div className="flex items-center gap-3 sm:gap-6">
              <span className="text-blue-500/60 truncate italic">Parado 2.5</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="hidden xs:inline">{isRunning ? 'Running' : 'Ready'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Box size={10} />
              <span>{installedPackages.length} Modules</span>
            </div>
        </footer>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#020617] z-[200] flex flex-col items-center justify-center">
            <div className="relative mb-8">
                <div className="w-16 h-16 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
            </div>
            <h1 className="text-2xl font-black text-white italic">PARADO V2</h1>
            <p className="mt-2 text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Booting Core...</p>
        </div>
      )}
      
      <style>{`
        .zen-mode aside, .zen-mode header, .zen-mode footer { display: none; }
        :fullscreen #game-canvas { width: 100vw; height: 100vh; object-fit: contain; background: #000; }
        @media (max-width: 640px) {
          .zen-mode header { display: flex; }
        }
      `}</style>
    </div>
  );
};

export default App;
