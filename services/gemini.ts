
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIAssistance = async (
  prompt: string,
  code: string,
  mode: 'debug' | 'optimize' | 'explain' | 'generate'
) => {
  const systemInstructions = {
    debug: "You are a professional Python debugger. Analyze the provided code and identify logical or syntax errors. Provide a fixed version of the code and a brief explanation.",
    optimize: "You are a Python performance expert. Rewrite the provided code to be more efficient, Pythonic, and readable. Explain your changes.",
    explain: "You are a technical educator. Explain how the provided Python code works in simple terms.",
    generate: "You are a Python expert. Generate clean, documented Python code based on the user's request."
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Code:\n\`\`\`python\n${code}\n\`\`\`\n\nRequest: ${prompt}`,
    config: {
      systemInstruction: systemInstructions[mode],
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 2000 }
    },
  });

  return response.text;
};

export const suggestAutoCompletion = async (code: string, cursorPosition: number) => {
  // Simple completion suggestion logic
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide a short one-line completion for this Python code snippet. Only return the completion text, no backticks:\n\n${code}`,
    config: {
      maxOutputTokens: 20,
    }
  });
  return response.text?.trim() || '';
};
