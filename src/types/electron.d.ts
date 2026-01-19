export interface IpcRenderer {
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, listener: (event: any, ...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
}

export interface FileSystem {
  getDownloadsPath: () => Promise<string>;
  saveVisitJson: (data: {
    protocolName: string;
    patientName: string;
    visitName: string;
    jsonContent: string;
  }) => Promise<{
    success: boolean;
    path?: string;
    message?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    ipcRenderer?: IpcRenderer;
    fileSystem?: FileSystem;
  }
}

