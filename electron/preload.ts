import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Preload script loaded');

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
  },
  off: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.off(channel, listener);
  },
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
});

// --------- Expose file system API to the Renderer process ---------
contextBridge.exposeInMainWorld('fileSystem', {
  getDownloadsPath: () => {
    console.log('[Preload] getDownloadsPath called');
    return ipcRenderer.invoke('get-downloads-path');
  },
  saveVisitJson: (data: {
    protocolName: string;
    patientName: string;
    visitName: string;
    jsonContent: string;
  }) => {
    console.log('[Preload] saveVisitJson called with:', {
      protocolName: data.protocolName,
      patientName: data.patientName,
      visitName: data.visitName,
      jsonContentLength: data.jsonContent.length,
    });
    return ipcRenderer.invoke('save-visit-json', data);
  },
});

console.log('[Preload] APIs exposed to renderer');

