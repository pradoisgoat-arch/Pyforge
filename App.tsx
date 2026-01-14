
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal as TerminalIcon, Bug, Zap, FileCode, Plus, Trash2, 
  ChevronRight, Cpu, Sparkles, RefreshCw, X, Wand2, Check, Menu, 
  Layers, Code, Package, Download, Send, Bot, User, Layout, 
  Settings, Maximize2, Minimize2, ExternalLink
} from 'lucide-react';
import { FileNode, ConsoleMessage, ChatMessage } from './types';
import { getArcticXChat } from './services/gemini';

const App: React.FC = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<FileNode[]>([
    { id: '1', name: 'main.py', content: 'def welcome():\n    print("Welcome to ParadoV2 Architecture")\n    return 42\n\nresult = welcome()\nprint(f"Result: {result}")' }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isChatOpen, setIsChatOpen] = useState(window.innerWidth > 1280);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [installedPackages, setInstalledPackages] = useState<string[]>(['micropip']);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<any>(null);
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAITyping]);

  useEffect(() => {
    const init = async () => {
      try {
        const py = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        });
        await py.loadPackage(["micropip"]);
        setPyodide(py);
        setIsLoading(false);
        addConsoleMessage('system', 'Parado Engine v2.5 Online.');
        chatInstance.current = getArcticXChat();
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const addConsoleMessage = (type: 'stdout' | 'stderr' | 'system', content: string) => {
    setConsoleMessages(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  const executeCode = async (targetId?: string) => {
    const fileToRun = targetId ? files.find(f => f.id === targetId) : activeFile;
    if (!pyodide || !fileToRun || isRunning) return "Engine Busy";
    
    setIsRunning(true);
    setIsConsoleExpanded(true);
    addConsoleMessage('system', `Executing ${fileToRun.name}...`);
    
    let output = "";
    try {
      pyodide.setStdout({ batched: (text: string) => {
        output += text + "\n";
        addConsoleMessage('stdout', text);
      }});
      pyodide.setStderr({ batched: (text: string) => {
        output += text + "\n";
        addConsoleMessage('stderr', text);
      }});
      await pyodide.runPythonAsync(fileToRun.content);
      return output || "Executed successfully (no output).";
    } catch (err: any) {
      addConsoleMessage('stderr', err.message);
      return `Error: ${err.message}`;
    } finally {
      setIsRunning(false);
    }
  };

  const handleToolCall = async (call: any) => {
    const { name, args, id } = call;
    let result: any = "Success";

    try {
      switch (name) {
        case 'create_file':
          const newId = Date.now().toString();
          setFiles(prev => [...prev, { id: newId, name: args.name, content: args.content }]);
          setActiveFileId(newId);
          result = { status: "created", id: newId };
          break;
        case 'update_file':
          setFiles(prev => prev.map(f => f.id === args.id ? { ...f, content: args.content } : f));
          result = { status: "updated" };
          break;
        case 'delete_file':
          if (files.length > 1) {
            setFiles(prev => prev.filter(f => f.id !== args.id));
            result = { status: "deleted" };
          } else {
            result = { error: "Cannot delete the last file" };
          }
          break;
        case 'install_package':
          addConsoleMessage('system', `Installing ${args.name}...`);
          const micropip = pyodide.pyimport("micropip");
          await micropip.install(args.name);
          setInstalledPackages(prev => [...prev, args.name]);
          result = { status: "installed" };
          break;
        case 'run_code':
          const res = await executeCode();
          result = { output: res };
          break;
      }
    } catch (err: any) {
      result = { error: err.message };
    }

    return { id, name, response: { result } };
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatInstance.current || isAITyping) return;

    const userMsg: ChatMessage = { role: 'user', parts: [{ text: chatInput }] };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAITyping(true);

    try {
      let response = await chatInstance.current.sendMessage({ message: userMsg.parts[0].text });
      
      while (response.functionCalls && response.functionCalls.length > 0) {
        const toolResponses = await Promise.all(response.functionCalls.map(handleToolCall));
        response = await chatInstance.current.sendMessage({
          message: { 
            role: "function", 
            parts: toolResponses.map(tr => ({
              functionResponse: {
                id: tr.id,
                name: tr.name,
                response: tr.response
              }
            }))
          }
        });
      }

      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: response.text }] }]);
    } catch (err: any) {
      addConsoleMessage('stderr', `ArcticX Chat Error: ${err.message}`);
    } finally {
      setIsAITyping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center p-6">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-[4px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
          <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter italic">PARADO V2</h1>
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.5em] mt-2 animate-pulse">Initializing Neural Link</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* Sidebar Explorer */}
      <aside className={`flex flex-col border-r border-white/5 bg-[#020617] transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-16'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-600 rounded"><Layers size={14} className="text-white" /></div>
              <span className="font-black text-xs text-white tracking-tight">PARADO</span>
            </div>
          ) : (
             <button onClick={() => setIsSidebarOpen(true)} className="mx-auto text-blue-400 p-2 hover:bg-white/5 rounded-lg"><Menu size={18} /></button>
          )}
          {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg"><X size={16} /></button>}
        </div>

        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workspace</span>
                <button onClick={() => {
                  const name = prompt("Filename:");
                  if(name) setFiles(prev => [...prev, { id: Date.now().toString(), name, content: '' }]);
                }} className="hover:text-blue-400"><Plus size={14} /></button>
              </div>
              <div className="space-y-1">
                {files.map(f => (
                  <div 
                    key={f.id}
                    onClick={() => setActiveFileId(f.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border ${activeFileId === f.id ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'border-transparent hover:bg-white/5 text-slate-500'}`}
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
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-4 block">Engine Hub</span>
              <div className="px-2 space-y-2">
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                  <Package size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-bold">WASM V0.26</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                  <Cpu size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold">PY 3.12 Core</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </aside>

      {/* Main Code Editor Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0 bg-[#020617]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><Menu size={18} /></button>}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
              <FileCode size={14} className="text-blue-400" />
              <span className="text-[11px] font-bold text-slate-200">{activeFile.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border ${isChatOpen ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
              <Bot size={14} />
              <span>ArcticX Agent</span>
            </button>
            <button 
              onClick={() => executeCode()}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-tight transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              <span>Execute</span>
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
          <div className="absolute top-0 left-0 w-12 h-full bg-[#020617]/50 border-r border-white/5 flex flex-col items-center py-4 font-mono text-[10px] text-slate-600 select-none z-10">
            {activeFile.content.split('\n').map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
          </div>
          <textarea
            value={activeFile.content}
            onChange={(e) => setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: e.target.value } : f))}
            className="w-full h-full pl-16 pr-6 py-4 bg-transparent text-slate-300 font-mono text-sm leading-6 outline-none resize-none z-20 scrollbar-thin"
            spellCheck={false}
          />
        </div>

        {/* Console */}
        <div className={`transition-all duration-300 border-t border-white/5 bg-[#020617] flex flex-col ${isConsoleExpanded ? 'h-1/3' : 'h-10'}`}>
          <div onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="h-10 flex items-center justify-between px-6 cursor-pointer hover:bg-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <TerminalIcon size={12} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Output Log</span>
            </div>
            <ChevronRight size={14} className={`text-slate-500 transition-transform ${isConsoleExpanded ? 'rotate-90' : ''}`} />
          </div>
          {isConsoleExpanded && (
            <div className="flex-1 p-4 overflow-y-auto bg-black/20 font-mono text-[11px] space-y-1 scrollbar-thin">
              {consoleMessages.length === 0 && <div className="text-slate-700 italic">No activity recorded...</div>}
              {consoleMessages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.type === 'stderr' ? 'text-red-400' : m.type === 'system' ? 'text-blue-400' : 'text-slate-400'}`}>
                  <span className="opacity-30 shrink-0">{m.timestamp.toLocaleTimeString([], { hour12: false })}</span>
                  <pre className="whitespace-pre-wrap">{m.content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - ArcticX AI Agent */}
      <aside className={`fixed lg:relative inset-y-0 right-0 z-[60] flex flex-col bg-[#020617] border-l border-white/5 transition-all duration-300 shadow-2xl ${isChatOpen ? 'w-full sm:w-80 md:w-[400px]' : 'w-0 overflow-hidden border-none'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-blue-400 animate-pulse" />
            <h3 className="text-xs font-black text-white uppercase tracking-tight">ArcticX Architect</h3>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin flex flex-col">
          {chatHistory.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20">
              <Bot size={48} className="mb-4" />
              <p className="text-xs font-bold uppercase tracking-[0.2em]">Autonomous Agent Standby</p>
              <p className="text-[10px] mt-2 italic">"Build me a login system", "Fix my errors", or "Install pandas"</p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0 border border-blue-500/20"><Bot size={14} className="text-blue-400" /></div>}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/5 text-slate-300 shadow-xl'}`}>
                {msg.parts[0].text}
              </div>
              {msg.role === 'user' && <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0"><User size={14} className="text-slate-400" /></div>}
            </div>
          ))}
          {isAITyping && (
            <div className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-500/20"><Bot size={14} className="text-blue-400" /></div>
              <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="relative group">
            <textarea 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Deploy an idea..."
              className="w-full bg-[#0f172a] border border-white/10 rounded-2xl p-4 pr-12 text-[12px] text-white outline-none focus:ring-1 focus:ring-blue-500/50 min-h-[50px] max-h-[150px] resize-none placeholder-slate-600 transition-all shadow-inner"
            />
            <button 
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isAITyping}
              className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-30 active:scale-90 shadow-lg"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black uppercase text-emerald-500/80">ArcticX Link Active</span>
            </div>
            <span className="text-[9px] font-bold text-slate-600 uppercase italic">Power by Gemini 3</span>
          </div>
        </div>
      </aside>

      <footer className="fixed bottom-0 left-0 w-full h-6 bg-[#020617] border-t border-white/5 flex items-center justify-between px-4 text-[9px] font-black text-slate-600 z-[70] select-none pointer-events-none">
        <div className="flex items-center gap-6">
          <span className="text-blue-500/60 uppercase tracking-widest">Parado V2.5.0</span>
          <span className="uppercase tracking-widest hidden sm:inline">User: Developer</span>
        </div>
        <div className="flex items-center gap-4 uppercase tracking-widest">
          <span className="text-emerald-500/70">Secure WASM Core</span>
          <span className="hidden xs:inline">ArcticX Architect: Ready</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
