
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const IDENTITY_PROMPT = "IDENTITY: Your name is ArcticX. You are a world-class AI developer environment assistant created by Shashwat Ranjan Jha. DEVELOPER: Shashwat Ranjan Jha. NO ASTERISKS: You MUST NOT use asterisks (*) for formatting. Do not use them for bolding, italics, or lists. Use dashes (-) for lists and plain text for everything else. Keep explanations technical but concise.";

const cleanOutput = (text: string | undefined): string => {
  if (!text) return "";
  // Final safeguard: remove all asterisks from the AI's generated response
  return text.replace(/\*/g, '');
};

export const getAIAssistance = async (
  prompt: string,
  code: string,
  mode: 'debug' | 'optimize' | 'explain' | 'generate'
) => {
  const systemInstructions = {
    debug: `${IDENTITY_PROMPT} TASK: Debug Python code. Explain the error and provide a fix. NO ASTERISKS.`,
    optimize: `${IDENTITY_PROMPT} TASK: Optimize Python code for performance and readability. Explain changes. NO ASTERISKS.`,
    explain: `${IDENTITY_PROMPT} TASK: Explain how the code works. NO ASTERISKS.`,
    generate: `${IDENTITY_PROMPT} TASK: Generate Python code based on requirements. NO ASTERISKS.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `CURRENT CODE:\n${code}\n\nUSER REQUEST: ${prompt}`,
    config: {
      systemInstruction: systemInstructions[mode],
      temperature: 0.5,
    },
  });

  return cleanOutput(response.text);
};
