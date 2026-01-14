
export interface FileNode {
  id: string;
  name: string;
  content: string;
  isOpen?: boolean;
}

export interface ExecutionResult {
  output: string;
  error: string | null;
}

export interface AIAction {
  type: 'debug' | 'optimize' | 'explain' | 'generate';
  label: string;
  icon: string;
}

export interface ConsoleMessage {
  type: 'stdout' | 'stderr' | 'system';
  content: string;
  timestamp: Date;
}
