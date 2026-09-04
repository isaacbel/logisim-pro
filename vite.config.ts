import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

/**
 * Content-Security-Policy for the shipped document (both the PWA and the Electron renderer).
 *
 * Verified against the actual source before being written: the renderer contains no `eval`,
 * no `new Function`, no `<iframe>`, no `dangerouslySetInnerHTML`, no `fetch`/XHR/WebSocket and
 * no media elements, so none of the loosening those would require is present here.
 *
 *  - `file:` accompanies every `'self'` because the packaged Electron app loads its document
 *    with `loadFile()`, where the page origin is opaque and `'self'` cannot be relied upon to
 *    match sibling bundle files.
 *  - `'unsafe-inline'` is required in `style-src` only: React `style={{…}}` props and
 *    framer-motion both write element style attributes. It is deliberately absent from
 *    `script-src`, which is what actually matters — the service-worker registration was moved
 *    out of index.html into public/sw-register.js so that no inline script remains.
 *  - The two fonts.* hosts keep the bundled typography working. Self-hosting those files would
 *    let both be dropped and would also fix offline typography; recorded as a follow-up rather
 *    than done here, because it changes rendering and needs its own visual check.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self' file: blob:",
  "script-src 'self' file:",
  "style-src 'self' file: 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' file: data: https://fonts.gstatic.com",
  "img-src 'self' file: data: blob:",
  "connect-src 'self' file: data: blob:",
  "worker-src 'self' file: blob:",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

/**
 * Injects the CSP into the built document only.
 *
 * It must not apply during `vite dev`: the dev server serves an inline react-refresh preamble,
 * which `script-src 'self'` would block, breaking hot reload for no security benefit on a
 * localhost development origin.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'logisim-pro-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: CONTENT_SECURITY_POLICY,
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    contentSecurityPolicy(),
    electron({
      main: { entry: 'electron/main.ts' },
      preload: { input: 'electron/preload.ts' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@state': path.resolve(__dirname, './src/state'),
      '@apptypes': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
