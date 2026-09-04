import { app, BrowserWindow, ipcMain, Menu, dialog, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  checkPath,
  checkExternalUrl,
  normalizeForCompare,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_BYTES,
  type PathVerdict,
} from './security/pathGuard';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let fileToOpenOnReady: string | null = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check if a file path was passed in command line
      const targetFile = findTargetFileFromArgs(commandLine);
      if (targetFile) {
        grantPath(targetFile);
        mainWindow.webContents.send('app:open-file-requested', targetFile);
      }
    }
  });
}

function findTargetFileFromArgs(argv: string[]): string | null {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith('--') && !arg.startsWith('-')) {
      const ext = path.extname(arg).toLowerCase();
      if (['.lpro', '.8086asm', '.asm', '.json'].includes(ext) && fs.existsSync(arg)) {
        return path.resolve(arg);
      }
    }
  }
  return null;
}

// Extract file argument from initial process.argv
fileToOpenOnReady = findTargetFileFromArgs(process.argv);

// ── Filesystem confinement ────────────────────────────────────────────────────
//
// The renderer may only reach files under a small set of well-known user directories, plus
// individual files the user explicitly picked in a native dialog or handed us on the command
// line. Everything is decided by electron/security/pathGuard.ts, which is unit-tested
// independently of Electron.

/** Absolute paths the user consented to. Bounded so a long session cannot grow it forever. */
const grantedPaths = new Set<string>();
const MAX_GRANTED_PATHS = 256;

function grantPath(filePath: string | null | undefined): void {
  if (!filePath) return;
  grantedPaths.add(normalizeForCompare(filePath));
  while (grantedPaths.size > MAX_GRANTED_PATHS) {
    const oldest = grantedPaths.values().next();
    if (oldest.done) break;
    grantedPaths.delete(oldest.value);
  }
}

grantPath(fileToOpenOnReady);

function safeAppPath(name: 'userData' | 'documents' | 'desktop' | 'downloads'): string | null {
  try {
    return app.getPath(name);
  } catch {
    // Not every platform defines every well-known directory.
    return null;
  }
}

/** Directories the renderer may read from without an explicit dialog grant. */
function readRoots(): string[] {
  return [
    safeAppPath('userData'),
    safeAppPath('documents'),
    safeAppPath('desktop'),
    safeAppPath('downloads'),
    app.getAppPath(), // bundled example projects
  ].filter((p): p is string => !!p);
}

/** Directories the renderer may write to. Deliberately excludes the installation directory. */
function writeRoots(): string[] {
  return [
    safeAppPath('userData'),
    safeAppPath('documents'),
    safeAppPath('desktop'),
    safeAppPath('downloads'),
  ].filter((p): p is string => !!p);
}

function guardPath(candidate: unknown, roots: string[]): PathVerdict {
  return checkPath(candidate, {
    roots,
    extensions: ALLOWED_FILE_EXTENSIONS,
    granted: grantedPaths,
    realpath: fs.realpathSync.native,
  });
}

/** Log a refusal in the main process and build the error the renderer will see. */
function refuse(channel: string, reason: string, detail?: string): Error {
  console.warn(`[security] ${channel} refused: ${reason}${detail ? ` (${detail})` : ''}`);
  return new Error(`Access denied: ${reason}`);
}

// Portable mode configuration: if running as portable build or flag passed, store user data next to exe
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR || process.argv.includes('--portable');
if (isPortable) {
  const portableDataDir = process.env.PORTABLE_EXECUTABLE_DIR 
    ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'logisim-pro-data')
    : path.join(path.dirname(process.execPath), 'logisim-pro-data');
  try {
    if (!fs.existsSync(portableDataDir)) {
      fs.mkdirSync(portableDataDir, { recursive: true });
    }
    app.setPath('userData', portableDataDir);
  } catch {
    // fallback to default userData if permission denied
  }
}

// Window Bounds State File
function getBoundsFile(): string {
  return path.join(app.getPath('userData'), 'window-bounds.json');
}

function loadWindowBounds() {
  try {
    const file = getBoundsFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch {
    // Ignore error, fallback to default bounds
  }
  return { width: 1600, height: 900, isMaximized: false };
}

function saveWindowBounds() {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    const data = { ...bounds, isMaximized };
    fs.writeFileSync(getBoundsFile(), JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore bounds save errors on quit
  }
}

/**
 * Refuse navigation away from the application, and never let the renderer spawn a real
 * browser window. `window.open(...)` and `target="_blank"` links are handed to the OS browser
 * only when the URL passes the allow-list; everything else is blocked and logged.
 */
function hardenWebContents(contents: Electron.WebContents): void {
  const devServer = process.env.VITE_DEV_SERVER_URL;

  const isInternal = (target: string): boolean =>
    target.startsWith('file://') || (!!devServer && target.startsWith(devServer));

  contents.on('will-navigate', (event, url) => {
    if (isInternal(url)) return;
    event.preventDefault();
    const verdict = checkExternalUrl(url);
    if (verdict.ok) void shell.openExternal(verdict.url);
    else refuse('will-navigate', verdict.reason, verdict.detail);
  });

  contents.setWindowOpenHandler(({ url }) => {
    const verdict = checkExternalUrl(url);
    if (verdict.ok) void shell.openExternal(verdict.url);
    else refuse('window.open', verdict.reason, verdict.detail);
    // Always deny: an external link belongs in the user's browser, not in a chrome-less
    // Electron window that would inherit this application's privileges.
    return { action: 'deny' };
  });

  contents.on('will-attach-webview', event => {
    // Logisim Pro uses no <webview> tags. One appearing means injected markup.
    event.preventDefault();
    refuse('will-attach-webview', 'webview-not-permitted');
  });
}

/**
 * Deny the device-access permissions a logic simulator never needs. This is written as a
 * deny-list rather than an allow-list so it cannot regress a feature that legitimately asks
 * for something (the app does request `fullscreen` for presentation mode and
 * clipboard *write* for its copy buttons).
 */
const DENIED_PERMISSIONS = [
  'media', // camera + microphone
  'geolocation',
  'midi',
  'midiSysex',
  'hid',
  'serial',
  'usb',
  'notifications',
  'pointerLock',
  'clipboard-read', // the app only ever writes to the clipboard
  'openExternal', // external opens must go through the checked app:open-url channel
];

function installPermissionHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (DENIED_PERMISSIONS.includes(permission)) {
      refuse('permission-request', 'permission-denied', permission);
      callback(false);
      return;
    }
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return !DENIED_PERMISSIONS.includes(permission);
  });
}

function createWindow() {
  const savedBounds = loadWindowBounds();

  mainWindow = new BrowserWindow({
    x: savedBounds.x,
    y: savedBounds.y,
    width: savedBounds.width || 1600,
    height: savedBounds.height || 900,
    minWidth: 1100,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'Logisim Pro — Digital Logic & Computer Architecture Suite',
    backgroundColor: '#0f172a',
    show: false,
  });

  if (savedBounds.isMaximized) {
    mainWindow.maximize();
  }

  hardenWebContents(mainWindow.webContents);

  createApplicationMenu();

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (fileToOpenOnReady && mainWindow) {
      mainWindow.webContents.send('app:open-file-requested', fileToOpenOnReady);
      fileToOpenOnReady = null;
    }
  });

  mainWindow.on('close', () => {
    saveWindowBounds();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: '&File',
      submenu: [
        {
          label: '&New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project'),
        },
        {
          label: '&Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-project'),
        },
        { type: 'separator' },
        {
          label: '&Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save-project'),
        },
        {
          label: 'Save &As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-project-as'),
        },
        { type: 'separator' },
        {
          label: '&Import / Export Center...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:import-export'),
        },
        {
          label: 'Example &Library...',
          click: () => mainWindow?.webContents.send('menu:open-examples'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        {
          label: '&Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:undo'),
        },
        {
          label: '&Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => mainWindow?.webContents.send('menu:redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '&View',
      submenu: [
        {
          label: '&Presentation Mode',
          accelerator: 'F11',
          click: () => mainWindow?.webContents.send('menu:toggle-presentation'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '&Help',
      submenu: [
        {
          label: '&Download & Install Center...',
          click: () => mainWindow?.webContents.send('menu:download-center'),
        },
        {
          label: '&Documentation...',
          click: () => mainWindow?.webContents.send('menu:documentation'),
        },
        {
          label: '&Quick Tutorial...',
          click: () => mainWindow?.webContents.send('menu:onboarding'),
        },
        { type: 'separator' },
        {
          label: '&About Logisim Pro',
          click: () => mainWindow?.webContents.send('menu:about'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Secure Native IPC Bridges ──────────────────────────────────────────────────

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:is-portable', () => isPortable);

ipcMain.handle('app:open-url', (_event, url: string) => {
  const verdict = checkExternalUrl(url);
  if (!verdict.ok) {
    // Preserve the previous non-throwing contract: an unacceptable URL is ignored, but it is
    // no longer ignored *silently*.
    refuse('app:open-url', verdict.reason, verdict.detail);
    return false;
  }
  void shell.openExternal(verdict.url);
  return true;
});

ipcMain.handle('app:get-paths', () => ({
  userData: app.getPath('userData'),
  documents: app.getPath('documents'),
  desktop: app.getPath('desktop'),
  appPath: app.getAppPath(),
}));

ipcMain.handle('app:get-initial-file', () => fileToOpenOnReady);

ipcMain.handle('dialog:open-file', async (_event, options: { filters?: { name: string; extensions: string[] }[]; title?: string }) => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Open File',
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Logisim Pro Project (*.lpro)', extensions: ['lpro'] },
      { name: '8086 Assembly Source (*.8086asm, *.asm)', extensions: ['8086asm', 'asm'] },
      { name: 'JSON Files (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  const filePath = res.filePaths[0];
  // The user picked this file themselves, so it becomes reachable through fs:read-file even if
  // it lives outside the default roots.
  grantPath(filePath);
  const stat = await fs.promises.stat(filePath);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large to open: ${stat.size} bytes (limit ${MAX_FILE_BYTES} bytes).`
    );
  }
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return { filePath, content, fileName: path.basename(filePath) };
});

ipcMain.handle('dialog:save-file', async (_event, options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[]; title?: string; content?: string }) => {
  if (!mainWindow) return null;
  const res = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || 'Save File',
    defaultPath: options?.defaultPath || 'Untitled.lpro',
    filters: options?.filters || [
      { name: 'Logisim Pro Project (*.lpro)', extensions: ['lpro'] },
      { name: 'PNG Image (*.png)', extensions: ['png'] },
      { name: 'SVG Vector (*.svg)', extensions: ['svg'] },
      { name: '8086 Assembly (*.asm)', extensions: ['asm'] },
      { name: 'CSV File (*.csv)', extensions: ['csv'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });
  if (res.canceled || !res.filePath) return null;
  // Chosen by the user in a native dialog, so subsequent saves to the same path are allowed.
  grantPath(res.filePath);
  if (options?.content !== undefined) {
    await fs.promises.writeFile(res.filePath, options.content, 'utf-8');
  }
  return { filePath: res.filePath, fileName: path.basename(res.filePath) };
});

ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  const verdict = guardPath(filePath, readRoots());
  if (!verdict.ok) throw refuse('fs:read-file', verdict.reason, verdict.detail);

  const stat = await fs.promises.stat(verdict.resolved);
  if (!stat.isFile()) throw refuse('fs:read-file', 'not-a-regular-file');
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large to open: ${stat.size} bytes (limit ${MAX_FILE_BYTES} bytes).`
    );
  }
  return await fs.promises.readFile(verdict.resolved, 'utf-8');
});

ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
  const verdict = guardPath(filePath, writeRoots());
  if (!verdict.ok) throw refuse('fs:write-file', verdict.reason, verdict.detail);
  if (typeof content !== 'string') throw refuse('fs:write-file', 'content-not-a-string');
  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_BYTES) {
    throw refuse('fs:write-file', 'content-too-large');
  }

  await fs.promises.writeFile(verdict.resolved, content, 'utf-8');
  return true;
});

ipcMain.handle('fs:backup-file', async (_event, filePath: string) => {
  const verdict = guardPath(filePath, writeRoots());
  if (!verdict.ok) throw refuse('fs:backup-file', verdict.reason, verdict.detail);

  if (!fs.existsSync(verdict.resolved)) return null;
  const backupPath = `${verdict.resolved}.bak`;
  await fs.promises.copyFile(verdict.resolved, backupPath);
  return backupPath;
});

ipcMain.handle('shell:show-in-folder', (_event, filePath: string) => {
  const verdict = guardPath(filePath, readRoots());
  if (!verdict.ok) throw refuse('shell:show-in-folder', verdict.reason, verdict.detail);

  if (fs.existsSync(verdict.resolved)) {
    shell.showItemInFolder(verdict.resolved);
  }
});

// App Lifecycle
app.whenReady().then(() => {
  installPermissionHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
