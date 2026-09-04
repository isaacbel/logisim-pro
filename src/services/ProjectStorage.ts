/**
 * Logisim Pro — Unified Desktop & Web Project Storage Bridge
 * Seamlessly integrates Electron native file system dialogs (when running in Desktop app)
 * with IndexedDB & browser download fallbacks (when running as PWA / Web).
 */

import type { Project, ViewportState, WaveformProbe } from '@apptypes/core';
import {
  LogisimProProjectFile,
  createProjectFile,
  serializeProjectFile,
} from '@core/project/projectFormat';
import { migrateProjectFile, validateProjectFile } from '@core/project/projectMigration';
import { projectStorage } from '@core/storage/indexedDbStorage';
import { saveProjectAutosave } from '@core/project/projectBackup';

export interface ProjectFile {
  schemaVersion: number;
  project: Project;
  probes: WaveformProbe[];
  viewport: ViewportState;
  metadata?: LogisimProProjectFile['metadata'];
}

export function serializeProject(
  project: Project,
  probes: WaveformProbe[],
  viewport: ViewportState,
  metadata?: LogisimProProjectFile['metadata']
): string {
  const file = createProjectFile(project, metadata, { probes, viewport });
  return serializeProjectFile(file);
}

export function parseProject(raw: string): ProjectFile {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON or .lpro project data.');
  }

  const validation = validateProjectFile(value);
  if (!validation.valid) {
    throw new Error(`Invalid project file: ${validation.errors.join(' ')}`);
  }

  const migrated = migrateProjectFile(value);
  return {
    schemaVersion: migrated.formatVersion,
    project: migrated.project,
    probes: migrated.probes || [],
    viewport: migrated.viewport || {
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      width: 1920,
      height: 1080,
      showGrid: true,
      gridSize: 20,
      snapToGrid: true,
    },
    metadata: migrated.metadata,
  };
}

/**
 * Saves project either via native Electron save dialog or browser download
 */
export async function downloadProject(
  project: Project,
  probes: WaveformProbe[],
  viewport: ViewportState,
  customFileName?: string
): Promise<string | null> {
  const content = serializeProject(project, probes, viewport);
  const cleanName = (customFileName || project.name || 'Untitled').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'circuit';
  const defaultPath = `${cleanName}.lpro`;

  // Check if running in Electron desktop environment
  const electronApi = window.electronAPI;
  if (electronApi?.saveFileDialog) {
    const res = await electronApi.saveFileDialog({
      defaultPath,
      title: 'Save Logisim Pro Project',
      filters: [
        { name: 'Logisim Pro Project (*.lpro)', extensions: ['lpro'] },
        { name: 'Legacy Project (*.json)', extensions: ['json'] },
      ],
      content,
    });
    if (res?.filePath) {
      // Also cache to IndexedDB and recent files
      const file = createProjectFile(project, { name: cleanName }, { probes, viewport });
      await projectStorage.saveProject(file);
      return res.filePath;
    }
    return null;
  }

  // Web / PWA browser download fallback
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = defaultPath;
  anchor.click();
  URL.revokeObjectURL(url);

  // Cache to IndexedDB and autosave
  const file = createProjectFile(project, { name: cleanName }, { probes, viewport });
  await projectStorage.saveProject(file);
  saveProjectAutosave(file);

  return defaultPath;
}

/**
 * Prompts user to open a project via native file dialog (Desktop) or HTML file input (Web)
 */
export async function promptOpenProject(): Promise<ProjectFile | null> {
  const electronApi = window.electronAPI;

  if (electronApi?.openFileDialog) {
    const res = await electronApi.openFileDialog({
      title: 'Open Logisim Pro Project',
      filters: [
        { name: 'Logisim Pro Project (*.lpro)', extensions: ['lpro'] },
        { name: 'Legacy Project (*.json)', extensions: ['json', 'logisim.json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });
    if (!res) return null;
    return parseProject(res.content);
  }

  // Web browser file picker fallback
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.lpro,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const parsed = parseProject(text);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

/**
 * Encodes a project into a shareable URL hash string (base64 compressed)
 */
export function shareProjectAsUrl(
  project: Project,
  probes: WaveformProbe[],
  viewport: ViewportState
): string {
  const json = serializeProject(project, probes, viewport);
  // Safe UTF-8 to Base64
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  const url = new URL(window.location.href);
  url.hash = `share=${encodeURIComponent(b64)}`;
  return url.toString();
}

/**
 * Checks URL hash for shared project payload and parses it if found
 */
export function loadProjectFromUrl(): ProjectFile | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('share=')) return null;

  try {
    const match = hash.match(/share=([^&]+)/);
    if (!match || !match[1]) return null;
    const b64 = decodeURIComponent(match[1]);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return parseProject(json);
  } catch (err) {
    console.warn('Failed to parse project from URL hash:', err);
    return null;
  }
}

