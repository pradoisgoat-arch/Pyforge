
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Defining tools for the ArcticX AI Architect
export const IDE_TOOLS: FunctionDeclaration[] = [
  {
    name: "create_file",
    parameters: {
      type: Type.OBJECT,
      description: "Create a new Python file in the workspace.",
      properties: {
        name: { type: Type.STRING, description: "Name of the file, e.g., 'utils.py'" },
        content: { type: Type.STRING, description: "Initial Python code for the file." }
      },
      required: ["name", "content"]
    }
  },
  {
    name: "update_file",
    parameters: {
      type: Type.OBJECT,
      description: "Update the content of an existing file.",
      properties: {
        id: { type: Type.STRING, description: "The unique ID of the file to update." },
        content: { type: Type.STRING, description: "The new Python code content." }
      },
      required: ["id", "content"]
    }
  },
  {
    name: "delete_file",
    parameters: {
      type: Type.OBJECT,
      description: "Delete a file from the workspace.",
      properties: {
        id: { type: Type.STRING, description: "The unique ID of the file to delete." }
      },
      required: ["id"]
    }
  },
  {
    name: "install_package",
    parameters: {
      type: Type.OBJECT,
      description: "Install a Python package using micropip.",
      properties: {
        name: { type: Type.STRING, description: "The name of the package, e.g., 'numpy'" }
      },
      required: ["name"]
    }
  },
  {
    name: "run_code",
    parameters: {
      type: Type.OBJECT,
      description: "Execute the currently active file and return results.",
      properties: {}
    }
  }
];

const IDENTITY = `You are ArcticX, an elite AI Architect integrated into the ParadoV2 IDE. 
Created by Shashwat Ranjan Jha. You are autonomous.
You can manage files, install packages, and run code using tools.
When asked to modify code, use the 'update_file' tool.
When asked to create new logic, use 'create_file'.
Be concise, technical, and highly efficient. 
Do not explain your tools unless asked. Just use them.`;

// Initialize the ArcticX Chat session following official Gemini SDK guidelines
export const getArcticXChat = () => {
  // Always use a new instance to ensure we pick up the latest API key if it changes externally.
  // Using gemini-3-pro-preview for complex coding and reasoning tasks.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: IDENTITY,
      tools: [{ functionDeclarations: IDE_TOOLS }],
      temperature: 0.7,
    }
  });
};
