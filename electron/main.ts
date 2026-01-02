import { app, BrowserWindow, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

app.whenReady().then(createWindow);

