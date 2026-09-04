/**
 * Renderer-side typing for the Electron context bridge.
 *
 * The interface is imported (type-only, erased at build time) from the preload script
 * so there is exactly ONE definition of the bridge surface. Do not re-declare the shape
 * here — if the bridge gains a method, add it in `electron/preload.ts` and it appears
 * here automatically.
 *
 * `electronAPI` is optional because it is absent in the web/PWA build.
 */
import type { ElectronAPI } from '../../electron/preload';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
