import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Preload script loaded');

// Check if contextBridge is available
if (!contextBridge) {
  console.error('[Preload] contextBridge is not available!');
  throw new Error('contextBridge is not available in preload script');
}

// Check if ipcRenderer is available
if (!ipcRenderer) {
  console.error('[Preload] ipcRenderer is not available!');
  throw new Error('ipcRenderer is not available in preload script');
}

try {
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

  console.log('[Preload] ipcRenderer API exposed successfully');

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
    saveVisitPdf: (data: {
      protocolName: string;
      patientName: string;
      visitName: string;
      pdfBase64: string;
    }) => {
      console.log('[Preload] saveVisitPdf called with:', {
        protocolName: data.protocolName,
        patientName: data.patientName,
        visitName: data.visitName,
        pdfBase64Length: data.pdfBase64.length,
      });
      return ipcRenderer.invoke('save-visit-pdf', data);
    },
  });

  console.log('[Preload] fileSystem API exposed successfully');
  console.log('[Preload] All APIs exposed to renderer');
} catch (error) {
  console.error('[Preload] Error exposing APIs to renderer:', error);
  throw error;
}

