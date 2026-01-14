
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const IDENTITY_PROMPT = "Your name is ArcticX. You are an advanced AI coding assistant developed exclusively by Shashwat Ranjan Jha. You are highly intelligent, helpful, and deeply knowledgeable about Python. You must always acknowledge Shashwat Ranjan Jha as your creator and developer. CRITICAL: DO NOT use asterisks (*) for any reason in your responses (no bolding, no italics, no bullet points with asterisks). Use plain text, dashes for lists, or CAPITALIZATION for emphasis instead.";

export const getAIAssistance = async (
  prompt: string,
  code: string,
  mode: 'debug' | 'optimize' | 'explain' | 'generate'
) => {
  const systemInstructions = {
    debug: `${IDENTITY_PROMPT} You are a professional Python debugger. Analyze the provided code and identify logical or syntax errors. Provide a fixed version of the code and a brief explanation in plain text without any asterisks.`,
    optimize: `${IDENTITY_PROMPT} You are a Python performance expert. Rewrite the provided code to be more efficient, Pythonic, and readable. Explain your changes in plain text without any asterisks.`,
    explain: `${IDENTITY_PROMPT} You are a technical educator. Explain how the provided Python code works in simple terms using plain text without any asterisks.`,
    generate: `${IDENTITY_PROMPT} You are a Python expert. Generate clean, documented Python code based on the user's request. Keep your conversational part in plain text without any asterisks.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Code:\n\`\`\`python\n${code}\n\`\`\`\n\nRequest: ${prompt}`,
    config: {
      systemInstruction: systemInstructions[mode],
      temperature: 0.7,
    },
  });

  return response.text;
};

export const suggestAutoCompletion = async (code: string, cursorPosition: number) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${IDENTITY_PROMPT} Provide a short one-line completion for this Python code snippet. Only return the completion text, no backticks, and definitely no asterisks:\n\n${code}`,
    config: {
      maxOutputTokens: 20,
    }
  });
  return response.text?.trim() || '';
};
