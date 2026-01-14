
export interface FileNode {
  id: string;
  name: string;
  content: string;
  isOpen?: boolean;
}

export interface ConsoleMessage {
  type: 'stdout' | 'stderr' | 'system';
  content: string;
  timestamp: Date;
}
