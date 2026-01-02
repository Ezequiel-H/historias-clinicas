import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
const DIST = join(__dirname, '../dist');
const VITE_PUBLIC = app.isPackaged
  ? DIST
  : join(DIST, '../public');

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, 'preload.js');
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite feature
const url = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173';

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: join(VITE_PUBLIC, 'vite.svg'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (url && !app.isPackaged) {
    // Development mode: load from Vite dev server
    win.loadURL(url);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    // Production mode: load from built files
    win.loadFile(join(DIST, 'index.html'));
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event listeners
app.on('window-all-closed', () => {
  win = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

app.whenReady().then(() => {
  console.log('[Main] App ready, registering IPC handlers...');
  createWindow();
  console.log('[Main] IPC handlers registered');
});

// Helper function to sanitize folder/file names
function sanitizeFileName(name: string): string {
  // Remove invalid characters for filenames on Windows, macOS, and Linux
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

// IPC handlers for file system operations
ipcMain.handle('get-downloads-path', () => {
  const path = app.getPath('downloads');
  console.log('[IPC] get-downloads-path called, returning:', path);
  return path;
});

ipcMain.handle('save-visit-json', async (_, data: {
  protocolName: string;
  patientName: string;
  visitName: string;
  jsonContent: string;
}) => {
  console.log('[IPC] save-visit-json called with data:', {
    protocolName: data.protocolName,
    patientName: data.patientName,
    visitName: data.visitName,
    jsonContentLength: data.jsonContent.length,
  });
  
  try {
    const downloadsPath = app.getPath('downloads');
    console.log('[IPC] Downloads path:', downloadsPath);
    
    // Sanitize folder and file names
    const sanitizedProtocolName = sanitizeFileName(data.protocolName);
    const sanitizedPatientName = sanitizeFileName(data.patientName);
    const sanitizedVisitName = sanitizeFileName(data.visitName);
    
    console.log('[IPC] Sanitized names:', {
      protocol: sanitizedProtocolName,
      patient: sanitizedPatientName,
      visit: sanitizedVisitName,
    });
    
    // Create folder structure: Downloads/protocol name/patient name
    const protocolFolder = join(downloadsPath, sanitizedProtocolName);
    const patientFolder = join(protocolFolder, sanitizedPatientName);
    
    console.log('[IPC] Folder paths:', {
      protocolFolder,
      patientFolder,
    });
    
    // Create folders if they don't exist
    if (!existsSync(protocolFolder)) {
      console.log('[IPC] Creating protocol folder:', protocolFolder);
      await fs.mkdir(protocolFolder, { recursive: true });
    }
    if (!existsSync(patientFolder)) {
      console.log('[IPC] Creating patient folder:', patientFolder);
      await fs.mkdir(patientFolder, { recursive: true });
    }
    
    // Create filename: visitName.json
    const fileName = `${sanitizedVisitName}.json`;
    const filePath = join(patientFolder, fileName);
    
    console.log('[IPC] Writing file to:', filePath);
    
    // Write the JSON file
    await fs.writeFile(filePath, data.jsonContent, 'utf-8');
    
    console.log('[IPC] File saved successfully:', filePath);
    
    return { 
      success: true, 
      path: filePath,
      message: `Archivo guardado en: ${filePath}`
    };
  } catch (error) {
    console.error('[IPC] Error saving visit JSON:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

