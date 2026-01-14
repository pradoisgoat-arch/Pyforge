
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal as TerminalIcon, FileCode, Plus, Trash2, 
  ChevronRight, Cpu, RefreshCw, X, Menu, 
  Layers, Code, Package, Download, 
  Maximize2, Minimize2, Monitor, Eye, EyeOff, Gamepad2, 
  Activity, RotateCcw, Maximize, Layout, BarChart3
} from 'lucide-react';
import { FileNode, ConsoleMessage } from './types';

const App: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<FileNode[]>([
    { 
      id: '1', 
      name: 'main.py', 
      content: 'import js\nimport math\n\n# Access the Parado Display Canvas\ncanvas = js.document.getElementById("game-canvas")\nctx = canvas.getContext("2d")\n\n# Clear and Draw\ndef draw_demo():\n    ctx.clearRect(0, 0, canvas.width, canvas.height)\n    \n    # Draw a neon circle\n    ctx.beginPath()\n    ctx.arc(canvas.width/2, canvas.height/2, 50, 0, math.pi * 2)\n    ctx.fillStyle = "#3b82f6"\n    ctx.shadowBlur = 20\n    ctx.shadowColor = "#3b82f6"\n    ctx.fill()\n    \n    print("Graphical Frame Rendered Successfully!")\n\ndraw_demo()' 
    },
    {
      id: '2',
      name: 'data_viz.py',
      content: 'import matplotlib.pyplot as plt\nimport numpy as np\nimport js\n\n# Clear previous plots\nplt.clf()\n\n# Create some data\nx = np.linspace(0, 10, 100)\ny = np.sin(x) * np.exp(-x/3)\n\n# Plot\nplt.figure(figsize=(8, 4.5))\nplt.plot(x, y, color="#3b82f6", linewidth=2)\nplt.title("WASM Scientific Computing", color="white")\nplt.grid(True, linestyle="--", alpha=0.3)\n\n# Show directly in the display area\nplt.show()'
    },
    {
      id: '3',
      name: 'rich_html.py',
      content: 'import js\n\nhtml_content = """\n<div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 2rem; border-radius: 1rem; border: 1px solid #334155; text-align: center;">\n    <h1 style="color: #60a5fa; font-family: sans-serif;">Rich UI Component</h1>\n    <p style="color: #94a3b8;">Rendered directly from Python logic.</p>\n    <button onclick="alert(\'Python triggered this UI!\')" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer;">Interact</button>\n</div>\n"""\n\njs.document.getElementById("html-output").innerHTML = html_content\nprint("HTML UI Rendered.")'
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
      await py.loadPackage(["micropip", "matplotlib", "numpy"]);
      setPyodide(py);
      setIsLoading(false);
      addConsoleMessage('system', 'Parado Engine v2.5 Online. Scientific & Graphics Stack Ready.');
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  const clearOutputs = () => {
    setConsoleMessages([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    const htmlOut = document.getElementById("html-output");
    if (htmlOut) htmlOut.innerHTML = '';
    
    // Clear Matplotlib plots in DOM if any
    const pltOut = document.getElementById("pyplot-output");
    if (pltOut) pltOut.innerHTML = '';
  };

  const refreshEngine = async () => {
    clearOutputs();
    addConsoleMessage('system', 'Refreshing engine context...');
    await initEngine();
  };

  const executeCode = async () => {
    if (!pyodide || !activeFile || isRunning) return;
    
    setIsRunning(true);
    setIsConsoleExpanded(true);
    
    // Detection logic for switching tabs
    const content = activeFile.content.toLowerCase();
    if (content.includes('plt.') || content.includes('canvas') || content.includes('js.document') || content.includes('display')) {
        setOutputTab('display');
    }

    addConsoleMessage('system', `Executing ${activeFile.name}...`);
    
    try {
      // Set up Matplotlib target before execution
      if (content.includes('plt.')) {
          await pyodide.runPythonAsync(`
import matplotlib
import matplotlib.pyplot as plt
matplotlib.use("module://matplotlib.backends.html5_canvas_backend")
          `);
      }

      pyodide.setStdout({ batched: (text: string) => {
        addConsoleMessage('stdout', text);
      }});
      pyodide.setStderr({ batched: (text: string) => {
        addConsoleMessage('stderr', text);
      }});
      
      await pyodide.runPythonAsync(activeFile.content);
    } catch (err: any) {
      addConsoleMessage('stderr', err.message);
      setOutputTab('terminal');
    } finally {
      setIsRunning(false);
    }
  };

  const toggleAppFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleDisplayFullscreen = () => {
    if (displayContainerRef.current) {
        if (!document.fullscreenElement) {
            displayContainerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
  };

  return (
    <div className={`flex h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden ${isZenMode ? 'zen-mode' : ''}`}>
      
      {/* Sidebar Explorer */}
      {!isZenMode && (
        <aside className={`flex flex-col border-r border-white/5 bg-[#020617] transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-16'}`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-600 rounded shadow-[0_0_15px_rgba(37,99,235,0.4)]"><Layers size={14} className="text-white" /></div>
                <span className="font-black text-xs text-white tracking-tight">PARADO</span>
              </div>
            ) : (
               <button onClick={() => setIsSidebarOpen(true)} className="mx-auto text-blue-400 p-2 hover:bg-white/5 rounded-lg"><Menu size={18} /></button>
            )}
            {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><X size={16} /></button>}
          </div>

          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
              <section>
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workspace</span>
                  <button onClick={() => {
                    const name = prompt("Filename:");
                    if(name) setFiles(prev => [...prev, { id: Date.now().toString(), name, content: '' }]);
                  }} className="hover:text-blue-400 transition-colors"><Plus size={14} /></button>
                </div>
                <div className="space-y-1">
                  {files.map(f => (
                    <div 
                      key={f.id}
                      onClick={() => setActiveFileId(f.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border ${activeFileId === f.id ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 shadow-[inset_0_0_10px_rgba(37,99,235,0.05)]' : 'border-transparent hover:bg-white/5 text-slate-500'}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Code size={12} className={activeFileId === f.id ? 'text-blue-400' : 'text-slate-600'} />
                        <span className="text-[11px] font-bold truncate">{f.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-4 block">Active Modules</span>
                <div className="px-2 space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                    <BarChart3 size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold">Matplotlib 3.8</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                    <Gamepad2 size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold">WASM Graphics</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </aside>
      )}

      {/* Main Code Editor Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        {!isZenMode && (
          <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0 bg-[#020617]/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-4">
              {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 lg:hidden"><Menu size={18} /></button>}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 shadow-inner">
                <FileCode size={14} className="text-blue-400" />
                <span className="text-[11px] font-bold text-slate-200">{activeFile.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5 mr-2">
                <button onClick={() => setIsZenMode(true)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-all" title="Zen Mode"><EyeOff size={16} /></button>
                <button onClick={toggleAppFullscreen} className="p-1.5 text-slate-500 hover:text-blue-400 transition-all" title="Fullscreen App"><Monitor size={16} /></button>
              </div>

              <button 
                onClick={executeCode}
                disabled={isRunning}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-tight transition-all shadow-[0_0_25px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-50"
              >
                {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                <span className="hidden xs:inline">Deploy</span>
              </button>
            </div>
          </header>
        )}

        <div className={`flex-1 relative overflow-hidden bg-[#0d1117] transition-all duration-300 ${isConsoleMaximized ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <div className="absolute top-0 left-0 w-12 h-full bg-[#020617]/50 border-r border-white/5 flex flex-col items-center py-4 font-mono text-[10px] text-slate-600 select-none z-10">
            {activeFile.content.split('\n').map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
          </div>
          <textarea
            value={activeFile.content}
            onChange={(e) => setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: e.target.value } : f))}
            className="w-full h-full pl-16 pr-6 py-4 bg-transparent text-slate-300 font-mono text-sm leading-6 outline-none resize-none z-20 focus:ring-0"
            spellCheck={false}
          />
        </div>

        {/* Unified Output Console & Display */}
        <div className={`transition-all duration-300 border-t border-white/5 bg-[#020617] flex flex-col z-50 ${isConsoleMaximized ? 'absolute inset-0 h-full' : isConsoleExpanded ? 'h-1/2 md:h-2/5' : 'h-10'}`}>
          <div className="h-10 flex items-center justify-between px-6 bg-[#020617] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-6 h-full">
                <button 
                  onClick={() => setOutputTab('terminal')}
                  className={`flex items-center gap-2 h-full border-b-2 transition-all px-2 ${outputTab === 'terminal' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600'}`}
                >
                    <TerminalIcon size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Terminal</span>
                </button>
                <button 
                  onClick={() => setOutputTab('display')}
                  className={`flex items-center gap-2 h-full border-b-2 transition-all px-2 ${outputTab === 'display' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600'}`}
                >
                    <Layout size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Live Preview</span>
                </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={refreshEngine} className="text-slate-600 hover:text-emerald-400 transition-colors" title="Reload Engine">
                <RotateCcw size={14} />
              </button>
              <button onClick={clearOutputs} className="text-slate-600 hover:text-red-400 transition-colors" title="Clear All Outputs">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setIsConsoleMaximized(!isConsoleMaximized)} className="text-slate-600 hover:text-blue-400 transition-colors">
                {isConsoleMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              {!isConsoleMaximized && (
                  <button onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="text-slate-500">
                      <ChevronRight size={14} className={`transition-transform duration-300 ${isConsoleExpanded ? 'rotate-90' : ''}`} />
                  </button>
              )}
            </div>
          </div>
          
          {(isConsoleExpanded || isConsoleMaximized) && (
            <div className="flex-1 relative overflow-hidden flex bg-black/40">
                {/* Terminal View */}
                <div className={`absolute inset-0 p-6 overflow-y-auto font-mono text-[11px] space-y-2 transition-opacity duration-300 ${outputTab === 'terminal' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    {consoleMessages.length === 0 && <div className="text-slate-800 italic">Engine idle. Awaiting command...</div>}
                    {consoleMessages.map((m, i) => (
                        <div key={i} className={`flex gap-4 p-2 rounded border ${m.type === 'stderr' ? 'text-red-400 bg-red-400/5 border-red-500/10' : m.type === 'system' ? 'text-blue-400 bg-blue-400/5 border-blue-500/10' : 'text-slate-300'}`}>
                            <span className="opacity-30 shrink-0 text-[9px]">{m.timestamp.toLocaleTimeString([], {hour12: false})}</span>
                            <pre className="whitespace-pre-wrap">{m.content}</pre>
                        </div>
                    ))}
                </div>

                {/* Rich Graphical Display View */}
                <div ref={displayContainerRef} className={`absolute inset-0 flex flex-col transition-opacity duration-300 bg-[#020617] ${outputTab === 'display' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Runtime Preview</span>
                        <button onClick={toggleDisplayFullscreen} className="p-1 hover:text-blue-400 text-slate-500 transition-all">
                            <Maximize size={12} />
                        </button>
                    </div>
                    
                    <div className="flex-1 relative overflow-auto p-4 flex flex-col items-center">
                        <div id="html-output" className="w-full mb-4"></div>
                        <div id="pyplot-output" className="w-full flex justify-center mb-4"></div>
                        
                        <div className="relative w-full max-w-[800px] aspect-video bg-black/20 rounded-xl border border-white/10 shadow-2xl overflow-hidden group">
                            <canvas 
                                ref={canvasRef}
                                id="game-canvas"
                                width={800}
                                height={450}
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[8px] font-black text-emerald-500 uppercase tracking-tighter border border-emerald-500/30">
                                WASM-GL Viewport
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {!isZenMode && (
          <footer className="h-7 bg-[#020617] border-t border-white/5 flex items-center justify-between px-4 text-[9px] font-black text-slate-600 z-[60] uppercase tracking-widest">
            <div className="flex items-center gap-6">
              <span className="text-blue-500/60">Parado Architecture 2.5</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span>Engine Status: {isRunning ? 'Active' : 'Idle'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-emerald-500/70">Secure WASM Core</span>
              <span className="hidden xs:inline">Preview Bridge: Rich Output</span>
            </div>
          </footer>
        )}
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#020617] z-[1000] flex flex-col items-center justify-center">
            <div className="relative mb-8">
                <div className="w-24 h-24 border-[4px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">PARADO V2</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.5em] mt-2 animate-pulse">Initializing Scientific Stack</p>
        </div>
      )}
    </div>
  );
};

export default App;
