
import { GoogleGenAI } from "@google/genai";

const IDENTITY_PROMPT = "IDENTITY: Your name is ArcticX. You are a world-class AI developer environment assistant created by Shashwat Ranjan Jha. DEVELOPER: Shashwat Ranjan Jha. ENVIRONMENT: You are running inside ParadoV2, which uses Pyodide (Python 3.12 via WebAssembly). NO ASTERISKS: You MUST NOT use asterisks (*) for formatting. Do not use them for bolding, italics, or lists. Use dashes (-) for lists and plain text for everything else. ADVICE: Since we are in a browser WASM environment, remind users that sockets and direct local file system access are limited, but they can use micropip to install packages.";

const cleanOutput = (text: string | undefined): string => {
  if (!text) return "";
  return text.replace(/\*/g, '');
};

const getApiKey = (): string => {
  try {
    // Check various common places for the key
    return (window as any).process?.env?.API_KEY || 
           (typeof process !== 'undefined' ? process.env.API_KEY : '') || 
           '';
  } catch (e) {
    return '';
  }
};

export const getAIAssistance = async (
  prompt: string,
  code: string,
  mode: 'debug' | 'optimize' | 'explain' | 'generate'
) => {
  const apiKey = getApiKey();
  
  // If API_KEY is missing, we fail gracefully with a descriptive error
  if (!apiKey) {
    return "ArcticX Error: API_KEY is missing in environment. AI features are disabled.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstructions = {
    debug: `${IDENTITY_PROMPT} TASK: Debug the provided Python code. Identify errors and provide a fix. NO ASTERISKS.`,
    optimize: `${IDENTITY_PROMPT} TASK: Optimize the Python code for performance in a WASM environment. NO ASTERISKS.`,
    explain: `${IDENTITY_PROMPT} TASK: Explain the code logic clearly. NO ASTERISKS.`,
    generate: `${IDENTITY_PROMPT} TASK: Generate high-quality Python code based on the user request. NO ASTERISKS.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `CURRENT CODE:\n${code}\n\nUSER REQUEST: ${prompt}`,
      config: {
        systemInstruction: systemInstructions[mode],
        temperature: 0.5,
      },
    });

    return cleanOutput(response.text);
  } catch (error: any) {
    console.error("ArcticX AI Error:", error);
    return `ArcticX AI Error: ${error?.message || "Communication failure"}`;
  }
};
