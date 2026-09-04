/**
 * Logisim Pro — Project Backup, Autosave & Crash Recovery System
 * Automatically saves working project state periodically to persistent storage,
 * creates backup copies before migrations or destructive saves, and provides crash recovery.
 */

import { LogisimProProjectFile, serializeProjectFile } from './projectFormat';
import { migrateProjectFile } from './projectMigration';

const AUTOSAVE_STORAGE_KEY = 'logisim_pro_autosave_data';
const AUTOSAVE_META_KEY = 'logisim_pro_autosave_meta';

export interface AutosaveMetadata {
  projectName: string;
  timestamp: number;
  circuitCount: number;
  componentCount: number;
}

/**
 * Saves current working project to browser local storage / backup cache
 */
export function saveProjectAutosave(file: LogisimProProjectFile): void {
  try {
    const serialized = serializeProjectFile(file);
    let totalComponents = 0;
    file.project.circuits.forEach(c => {
      totalComponents += (c.components?.length || 0);
    });

    const meta: AutosaveMetadata = {
      projectName: file.metadata?.name || file.project.name || 'Untitled',
      timestamp: Date.now(),
      circuitCount: file.project.circuits?.length || 0,
      componentCount: totalComponents,
    };

    localStorage.setItem(AUTOSAVE_STORAGE_KEY, serialized);
    localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('[Autosave] Failed to write autosave to storage:', err);
  }
}

/**
 * Retrieves the autosaved project if available
 */
export function getAutosavedProject(): { file: LogisimProProjectFile; meta: AutosaveMetadata } | null {
  try {
    const rawData = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    const rawMeta = localStorage.getItem(AUTOSAVE_META_KEY);
    if (!rawData || !rawMeta) return null;

    const meta: AutosaveMetadata = JSON.parse(rawMeta);
    const parsed = JSON.parse(rawData);
    const file = migrateProjectFile(parsed);
    return { file, meta };
  } catch (err) {
    console.error('[Autosave] Failed to parse autosaved project:', err);
    return null;
  }
}

/**
 * Clears the autosave buffer (e.g. after a clean user save or clean project close)
 */
export function clearProjectAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    localStorage.removeItem(AUTOSAVE_META_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks if a crash recovery project is available that is newer than a given project timestamp
 */
export function isRecoveryAvailable(lastKnownSaveTime?: number): boolean {
  const autosave = getAutosavedProject();
  if (!autosave) return false;
  if (!lastKnownSaveTime) return autosave.meta.componentCount > 0;
  return autosave.meta.timestamp > lastKnownSaveTime + 5000; // 5s threshold
}
