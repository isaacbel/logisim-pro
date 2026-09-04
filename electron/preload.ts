import { contextBridge, ipcRenderer } from 'electron';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenFileDialogOptions {
  title?: string;
  filters?: FileFilter[];
}

export interface SaveFileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  content?: string;
}

export interface OpenFileResult {
  filePath: string;
  content: string;
  fileName: string;
}

export interface SaveFileResult {
  filePath: string;
  fileName: string;
}

export interface AppPaths {
  userData: string;
  documents: string;
  desktop: string;
  appPath: string;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  isPortable: () => Promise<boolean>;
  getPaths: () => Promise<AppPaths>;
  getInitialFile: () => Promise<string | null>;
  openFileDialog: (options?: OpenFileDialogOptions) => Promise<OpenFileResult | null>;
  saveFileDialog: (options?: SaveFileDialogOptions) => Promise<SaveFileResult | null>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  backupFile: (filePath: string) => Promise<string | null>;
  showInFolder: (filePath: string) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  onOpenFileRequested: (callback: (filePath: string) => void) => () => void;
  onMenuAction: (channel: string, callback: () => void) => () => void;
}

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  isPortable: () => ipcRenderer.invoke('app:is-portable'),
  getPaths: () => ipcRenderer.invoke('app:get-paths'),
  getInitialFile: () => ipcRenderer.invoke('app:get-initial-file'),
  openFileDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', filePath, content),
  backupFile: (filePath) => ipcRenderer.invoke('fs:backup-file', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('shell:show-in-folder', filePath),
  openUrl: (url) => ipcRenderer.invoke('app:open-url', url),

  onOpenFileRequested: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('app:open-file-requested', subscription);
    return () => ipcRenderer.removeListener('app:open-file-requested', subscription);
  },

  onMenuAction: (channel, callback) => {
    const subscription = () => callback();
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
