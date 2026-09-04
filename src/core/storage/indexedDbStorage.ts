/**
 * Logisim Pro — IndexedDB High-Capacity Persistent Storage Engine
 * Provides structured database storage for user projects, autosaves, recent project lists,
 * exercises progress, and application settings without localStorage 5MB size limits.
 */

import { LogisimProProjectFile } from '../project/projectFormat';
import { migrateProjectFile } from '../project/projectMigration';

const DB_NAME = 'LogisimProDB';
const DB_VERSION = 1;

export interface StoredProjectRecord {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  circuitCount: number;
  componentCount: number;
  data: LogisimProProjectFile;
}

export interface RecentProjectItem {
  id: string;
  name: string;
  filePath?: string; // Desktop file path if available
  lastOpened: string;
  circuitCount: number;
  componentCount: number;
}

class IndexedDbStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects Store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projectStore.createIndex('name', 'name', { unique: false });
        }

        // Recent Projects Store
        if (!db.objectStoreNames.contains('recent_projects')) {
          const recentStore = db.createObjectStore('recent_projects', { keyPath: 'id' });
          recentStore.createIndex('lastOpened', 'lastOpened', { unique: false });
        }

        // Key-Value App Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // ── Project CRUD Operations ──────────────────────────────────────────────────

  async saveProject(file: LogisimProProjectFile): Promise<string> {
    const db = await this.getDB();
    const id = file.project.id || `proj_${Date.now()}`;
    (file.project as { id: string }).id = id;

    let componentCount = 0;
    (file.project.circuits || []).forEach((c) => {
      componentCount += c.components?.length || 0;
    });

    const record: StoredProjectRecord = {
      id,
      name: file.metadata?.name || file.project.name || 'Untitled Project',
      updatedAt: new Date().toISOString(),
      createdAt: file.metadata?.createdAt || new Date().toISOString(),
      circuitCount: file.project.circuits?.length || 1,
      componentCount,
      data: file,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'recent_projects'], 'readwrite');
      const projectStore = tx.objectStore('projects');
      const recentStore = tx.objectStore('recent_projects');

      projectStore.put(record);

      const recentItem: RecentProjectItem = {
        id,
        name: record.name,
        lastOpened: record.updatedAt,
        circuitCount: record.circuitCount,
        componentCount: record.componentCount,
      };
      recentStore.put(recentItem);

      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getProject(id: string): Promise<LogisimProProjectFile | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.get(id);

      req.onsuccess = () => {
        if (!req.result) {
          resolve(null);
          return;
        }
        try {
          const migrated = migrateProjectFile(req.result.data);
          resolve(migrated);
        } catch {
          resolve(req.result.data);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllProjects(): Promise<StoredProjectRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const index = store.index('updatedAt');
      const req = index.getAll();

      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => reject(req.error);
    });
  }

  async deleteProject(id: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'recent_projects'], 'readwrite');
      tx.objectStore('projects').delete(id);
      tx.objectStore('recent_projects').delete(id);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Recent Projects Operations ───────────────────────────────────────────────

  async getRecentProjects(limit: number = 10): Promise<RecentProjectItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recent_projects', 'readonly');
      const store = tx.objectStore('recent_projects');
      const index = store.index('lastOpened');
      const req = index.getAll();

      req.onsuccess = () => {
        const sorted = (req.result || []).sort(
          (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
        );
        resolve(sorted.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async addRecentProject(item: RecentProjectItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recent_projects', 'readwrite');
      tx.objectStore('recent_projects').put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Settings Key-Value Store ─────────────────────────────────────────────────

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value as T);
          } else {
            resolve(defaultValue);
          }
        };
        req.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore setting write failure
    }
  }
}

export const projectStorage = new IndexedDbStorage();
